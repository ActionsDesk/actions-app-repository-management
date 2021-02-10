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

async function getActionFromTitle (issueTitle, context, octokit) {
  let action = actions.INVALID
  switch (issueTitle) {
    case ADDTOAPP_TITLE:
      action = actions.ADDTOAPP
      break
    case REMOVEFROMAPP_TITLE:
      action = actions.REMOVEFROMAPP
      break
    default:
      await utils.reportError(context, core, octokit, '⚠️ Invalid request raised. The issue templates are the only issues processed on this repository.')
  }
  return action
}

async function parseIssueBody (body, context, octokit) {
  let settings
  try {
    const YAML = require('yaml')
    settings = YAML.parse(body)
  } catch (error) {
    await utils.reportError(context, core, octokit, '⚠️ Unable to read request. Make sure you follow the template')
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

async function validateApps (applications, knownApps, orgName, context, octokit) {
  // Loop through the supplied applications and get the matching ids
  // ensure we track both name and id so that the comments can be descriptive
  // Add a comment if we can't find an application id for an entry
  // Fail and close if no valid applications supplied
  const { data: installedApps } = await octokit.orgs.listAppInstallations({
    org: orgName
  })
  // Index the apps by name
  const installedAppMap = installedApps.installations.reduce((acc, installation) => {
    acc[installation.app_slug] = installation
    return acc
  }, {})

  const appDetails = {}
  for (const application of applications) {
    const appMap = application.toLowerCase()

    for (const knownApp of knownApps.GitHubApps) {
      const isValidApp = installedAppMap[appMap] && installedAppMap[appMap].repository_selection === 'selected'
      core.info(`App is installed and valid - ${isValidApp} ${knownApp.name.localeCompare(application, undefined, { sensitivity: 'base' }) === 0}`)
      if (knownApp.name.localeCompare(application, undefined, { sensitivity: 'base' }) === 0 && isValidApp) {
        appDetails[appMap] = installedAppMap[appMap].id
        break
      }
    }

    if (!(appMap in appDetails)) {
      await utils.commentIssue(context, octokit, `⚠️ ${application} is not a valid Refinitiv GitHub Application. Repositories will not be added to this application. App needs to be installed in the org and have access to specific repositories`)
    }
  }
  core.info(`Final app details - ${JSON.stringify(appDetails)}`)
  return appDetails
}

async function validateRepositories (repositories, orgName, author, context, octokit) {
  const repositoryDetails = {}

  // Loop through all the repositories and get the repo details and user permissions
  for (const repositoryName of repositories) {
    try {
      const { data: repository } = await octokit.repos.get({
        owner: orgName,
        repo: repositoryName
      })

      if (typeof repository.id !== 'undefined') {
        repositoryDetails[repositoryName] = repository.id
      }
    } catch (error) {
      if (error.status === 404) {
        await utils.commentIssue(context, octokit, `${repositoryName} is not a valid repository. Please ensure that you provide a valid repository name.`)
        continue
      }
      await utils.commentIssue(context, octokit, `Error getting details for repository ${repositoryName}.`)
      continue
    }

    try {
      const permissions = await octokit.repos.getCollaboratorPermissionLevel({
        owner: orgName,
        repo: repositoryName,
        username: author
      })

      if (permissions.data.permission !== 'admin') {
        await utils.commentIssue(context, octokit, `Only repository admins can request for a repository to be added to a GitHub App. ${repositoryName} will not be processed.`)
        delete repositoryDetails[repositoryName]
      }
    } catch (error) {
      await utils.commentIssue(context, octokit, `Error getting the repository permissions for ${repositoryName}.`)
      delete repositoryDetails[repositoryName]
    }
  }
  return repositoryDetails
}

async function executeAction (context, adminToken, errorTagTeam) {
  const orgName = context.payload.organization.login
  /*eslint-disable */
  const octokit = new github.getOctokit(adminToken)
  /* eslint-enable */
  const author = context.payload.issue.user.login
  core.info(`Issue opened by ${author} on ${orgName}`)
  try {
    // Parse action to execute
    const action = await getActionFromTitle(context.payload.issue.title, context, octokit)
    if (action === actions.INVALID) return
    core.info(`Action - Executing ${action} on ${orgName}`)

    // Parse acton settings
    const settings = await parseIssueBody(context.payload.issue.body, context, octokit)
    if (!settings) return
    core.info(`Settings - ${JSON.stringify(settings)}`)

    // Validate settings
    const validation = validateSettings(settings)
    if (!validation.isValid) {
      await utils.reportError(context, core, octokit, validation.errorMessage)
      return
    }

    let knownApps = null
    try {
      const configuration = await octokit.repos.getContent({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        path: 'githubapps.json'
      })
      const buffer = Buffer.from(configuration.data.content, 'base64')
      knownApps = JSON.parse(buffer.toString('utf-8'))
      core.info(`Known apps - ${JSON.stringify(knownApps)}`)
    } catch (e) {
      await utils.reportError(context, core, octokit, '⚠️ The token used in the integration is not correctly setup and cannot access the githubapps.json file')
      return
    }

    // Validate apps provided
    const applicationDetails = await validateApps(settings['GitHub Application'], knownApps, orgName, context, octokit)
    if (Object.keys(applicationDetails).length === 0) {
      await utils.reportError(context, core, octokit, '⚠️ No valid Refinitiv GitHub Applications provided. Please confirm the application names supplied are correct.')
      return
    }
    core.info(`Valid apps - ${JSON.stringify(applicationDetails)}`)

    // Validate repositories provided
    const repositoryDetails = await validateRepositories(settings['Repository Name'], orgName, author, context, octokit)
    if (Object.keys(repositoryDetails).length === 0) {
      await utils.reportError(context, core, octokit, '⚠️ No valid Refinitiv repositories have been provided.')
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
              await utils.commentIssue(context, octokit, `${repository} has been added to the application ${application}.`)
              break
            case actions.REMOVEFROMAPP:
              await octokit.apps.removeRepoFromInstallation({
                installation_id: applicationDetails[application],
                repository_id: repositoryDetails[repository],
                mediaType: {
                  previews: ['machine-man']
                }
              })
              await utils.commentIssue(context, octokit, `${repository} has been removed from the application ${application}.`)
              break
          }
        } catch (error) {
          await utils.commentIssue(context, octokit, `Error configuring ${repository} with the GitHub App ${application}.`)
          return
        }
      }
    }
    await utils.closeIssue(context, octokit)
  } catch (error) {
    await utils.reportError(context, core, octokit, `⚠️ ${error.message}\n${error.stack} ${errorTagTeam ? `\n\ncc/ @${errorTagTeam} ` : ''} ⚠️`)
  }
}

async function run () {
  const { context } = github
  const adminToken = core.getInput('admin_token')
  const errorTagTeam = core.getInput('error_tag_team')
  await executeAction(context, adminToken, errorTagTeam)
}

module.exports = {
  run,
  executeAction,
  validateApps,
  validateRepositories
}
