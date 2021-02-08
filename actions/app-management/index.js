const core = require('@actions/core')
const github = require('@actions/github')
const utils = require('./utils')

const actions = {
  INVALID: 'invalid',
  ADDTOAPP: 'AddToApp',
  REMOVEFROMAPP: 'RemoveFromApp'
}

const ADDTOAPP_TITLE = 'Add Repository To GitHub App'
const REMOVEFROMAPP_TITLE = 'Remove Repository From GitHub App'

async function getActionFromTitle (issueTitle, octokit) {
  let action = actions.INVALID
  switch (issueTitle) {
    case ADDTOAPP_TITLE:
      action = actions.ADDTOAPP
      break
    case REMOVEFROMAPP_TITLE:
      action = actions.REMOVEFROMAPP
      break
    default:
      await utils.reportError(github, core, octokit, '⚠️ Invalid request raised. The issue templates are the only issues processed on this repository.')
  }
  return action
}

async function parseIssueBody (body, octokit) {
  let settings
  try {
    const YAML = require('yaml')
    settings = YAML.parse(body)
  } catch (error) {
    await utils.reportError(github, core, octokit, '⚠️ Unable to read request. Make sure you follow the template')
  }
  return settings
}

function validateSettings (settings) {
  if (!('Repository Name' in settings) || !(settings['Repository Name'] instanceof Array)) {
    return {
      isValid: false,
      errorMessage: '⚠️ Missing repository name.'
    }
  }

  if (!('GitHub Application' in settings) || !(settings['GitHub Application'] instanceof Array)) {
    return {
      isValid: false,
      errorMessage: '⚠️ Missing GitHub Application.'
    }
  }

  return { isValid: true }
}

async function validateApps(applications, knownApps, octokit){
  // Loop through the supplied applications and get the matching ids
  // ensure we track both name and id so that the comments can be descriptive
  // Add a comment if we can't find an application id for an entry
  // Fail and close if no valid applications supplied
  let appDetails = {}
  for (const application of applications) {
    for (const knownApp of knownApps.GitHubApps) {
      if (knownApp.name.localeCompare(application, undefined, { sensitivity: 'base' }) === 0) {
        appDetails[application] = knownApp.id
        break
      }
    }

    if (!(application in appDetails)) {
      await utils.commentIssue(github, octokit, `⚠️ ${application} is not a valid Refinitiv GitHub Application. Repositories will not be added to this application.`)
    }
  }
}

async function validateRepositories(repositories, orgName, author, octokit) {
  let repositoryDetails = {}

  // Loop through all the repositories and get the repo details and user permissions
  for (const repositoryName of repositories) {
    try {
      const repository = await octokit.repos.get({
        owner: orgName,
        repo: repositoryName
      })

      if (typeof repository.data.id !== 'undefined') {
        repositoryDetails[repositoryName] = repository.data.id
      }
    } catch (error) {
      if (error.status === 404) {
        await utils.commentIssue(github, octokit, `${repositoryName} is not a valid repository. Please ensure that you provide a valid repository name.`)
        continue
      }
      await utils.commentIssue(github, octokit,`Error getting details for repository ${repositoryName}.`)
      continue
    }

    try {
      const permissions = await octokit.repos.getCollaboratorPermissionLevel({
        owner: orgName,
        repo: repositoryName,
        username: author
      })

      if (permissions.data.permission !== 'admin') {
        await utils.commentIssue(github, octokit, `Only repository admins can request for a repository to be added to a GitHub App. ${repositoryName} will not be processed.`)
        delete repositoryDetails[repositoryName]
      }
    } catch (error) {
      await utils.commentIssue(github, octokit, `Error getting the repository permissions for ${repositoryName}.`)
      delete repositoryDetails[repositoryName]
    }
  }
}

async function run () {
  const { context } = github
  const orgName = context.payload.organization.login
  const adminToken = core.getInput('admin_token')
  const errorTagTeam = core.getInput('error_tag_team')
  const octokit = new github.GitHub(adminToken)
  const author = context.payload.issue.user.login
  core.info(`Issue opened by ${author} on ${orgName}`)

  try {
    // Parse action to execute
    let action = await getActionFromTitle(context.payload.issue.title, octokit)
    if (!action) return
    core.info(`Action - Executing ${action} on ${orgName}`)

    // Parse acton settings
    let settings = await parseIssueBody(context.payload.issue.body, octokit)
    if (!settings) return
    core.info(`Settings - ${JSON.stringify(settings)}`)

    // Validate settings
    const validation = validateSettings(settings)
    if (!validation.isValid) {
      await utils.reportError(github, core, octokit, validation.errorMessage)
      return
    }

    const configuration = await octokit.repos.getContents({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      path: 'githubapps.json'
    })
    const buffer = Buffer.from(configuration.data.content, 'base64')
    const knownApps = JSON.parse(buffer.toString('utf-8'))

    core.info(`Known apps - ${JSON.stringify(knownApps)}`)

    // Validate apps provided
    const applicationDetails = await validateApps(settings['GitHub Application'], knownApps, octokit)
    if (Object.keys(applicationDetails).length === 0) {
      await utils.reportError(github, core, octokit, '⚠️ No valid Refinitiv GitHub Applications provided. Please confirm the application names supplied are correct.')
      return
    }
    core.info(`Valid apps - ${JSON.stringify(applicationDetails)}`)

    //Validate repositories provided
    const repositoryDetails = await validateRepositories(settings['Repository Name'], orgName, author, octokit)
    if (Object.keys(repositoryDetails).length === 0) {
      await utils.reportError(github, core, octokit, '⚠️ No valid Refinitiv repositories have been provided.')
      return
    }
    core.info(`Valid repos - ${JSON.stringify(repositoryDetails)}`)

    for (const repository of Object.keys(repositoryDetails)) {
      for (const application of Object.keys(applicationDetails)) {
        try {
          switch (action) {
            case actions.ADDTOAPP:
              await octokit.apps.addRepoToInstallation({
                installation_id: applicationDetails[application],
                repository_id: repositoryDetails[repository],
                mediaType: {
                  previews: ['machine-man']
                }
              })
              await utils.commentIssue(context, `${repository} has been added to the application ${application}.`)
              break
            case actions.REMOVEFROMAPP:
              await octokit.apps.removeRepoFromInstallation({
                installation_id: applicationDetails[application],
                repository_id: repositoryDetails[repository],
                mediaType: {
                  previews: ['machine-man']
                }
              })
              await utils.commentIssue(context, `${repository} has been removed from the application ${application}.`)
              break
          }
        } catch (error) {
          await utils.commentIssue(context, `Error configuring ${repository} with the GitHub App ${application}.`)
        }
      }
    }
  } catch (error) {
    await utils.reportError(github, core, octokit, `⚠️⚠ ${error.message}${errorTagTeam ? `\n\ncc/ @${errorTagTeam} `: ' '} ⚠️`)
  }
}

run()
