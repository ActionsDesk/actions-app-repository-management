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

async function run () {

  const { context } = github
  const orgName = context.payload.organization.login
  const adminToken = core.getInput('admin_token')
  const octokit = new github.GitHub(adminToken)

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

    core.info('Known apps:')
    core.info(knownApps)

    // Loop through the supplied applications and get the matching ids
    // ensure we track both name and id so that the comments can be descriptive
    // Add a comment if we can't find an application id for an entry
    // Fail and close if no valid applications supplied
    const applicationDetails = {}

    for (const application of settings['GitHub Application']) {
      for (const knownApp of knownApps.GitHubApps) {
        if (knownApp.name.localeCompare(application, undefined, { sensitivity: 'base' }) === 0) {
          applicationDetails[application] = knownApp.id
          break
        }
      }

      if (!(application in applicationDetails)) {
        await utils.commentIssue(github, octokit, `⚠️ ${application} is not a valid Refinitiv GitHub Application. Repositories will not be added to this application.`)
      }
    }

    if (Object.keys(applicationDetails).length === 0) {
      await utils.reportError(github, core, octokit, '⚠️ No valid Refinitiv GitHub Applications provided. Please confirm the application names supplied are correct.')
      return
    }

    // // Validate the users provided are members of the organization
    // const users = [].concat(owners).concat(maintainers).map((it) => it.trim().toLowerCase())
    // const orgUsers = (await octokit.paginate("GET /orgs/:org/members", {
    //   org
    // })).reduce((acc, user) => {
    //   const login = user.login.trim().toLowerCase()
    //   acc[login] = true
    //   return acc
    // }, {})
    // const usersMissing = []
    // users.forEach((user) => {
    //   const exists = orgUsers[user]
    //   if(!exists){
    //     usersMissing.push(user)
    //   }
    // })

    // core.debug(`The users checked are ${users}`)
    // core.debug(`The users missing in the org are found: ${usersMissing}`)
  } catch (error) {
    await utils.reportError(github, core, octokit, error.message)
  }
}

run()
