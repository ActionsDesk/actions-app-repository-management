const core = require('@actions/core')
const github = require('@actions/github')

async function reportError (github, core, octokit, message) {
  core.debug('=========== Context ===========')
  core.debug(JSON.stringify(github.context))
  core.debug('=========== Context ===========')

  // Set the error
  core.setFailed(message)
  await commentAndCloseIssue(github, octokit, message)
}

async function commentAndCloseIssue (github, octokit, message) {
  await commentIssue(github, octokit, message)
  await closeIssue(github, octokit, message)
}

async function commentIssue (github, octokit, message) {
  // Send the message
  const payload = github.context.payload
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const issueNumber = payload.issue.number
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: message
  })
}

async function closeIssue (github, octokit, message) {
  // Send the message
  const payload = github.context.payload
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const issueNumber = payload.issue.number

  await octokit.issues.lock({
    owner: owner,
    repo: repo,
    issue_number: issueNumber,
    lock_reason: 'resolved',
    mediaType: {
      previews: ['sailor-v']
    }
  })
  await octokit.issues.update({
    owner: owner,
    repo: repo,
    issue_number: issueNumber,
    state: 'closed'
  })
}

const actions = {
  INVALID: 'invalid',
  ADDTOAPP: 'AddToApp',
  REMOVEFROMAPP: 'RemoveFromApp'
}

async function run () {
  const { context } = github
  const body = context.payload.issue.body
  // const org = context.payload.organization.login
  const adminToken = core.getInput('admin_token')
  const octokit = new github.GitHub(adminToken)

  try {
    let action = actions.INVALID
    switch (context.payload.issue.title) {
      case 'Add Repository To GitHub App':
        action = actions.ADDTOAPP
        break
      case 'Remove Repository From GitHub App':
        action = actions.REMOVEFROMAPP
        break
      default:
        await reportError(github, core, octokit, '⚠️ Invalid request raised. The issue templates are the only issues processed on this repository.')
        return
    }

    core.info(`Action - ${action}`)

    let settings
    try {
      const YAML = require('yaml')
      settings = YAML.parse(body)
    } catch (error) {
      await reportError(github, core, octokit, '⚠️ Unable to read request.')
      return
    }

    if (!('Repository Name' in settings) || !(settings['Repository Name'] instanceof Array)) {
      await reportError(github, core, octokit, '⚠️ Missing repository name.')
      return
    }

    if (!('GitHub Application' in settings) || !(settings['GitHub Application'] instanceof Array)) {
      await reportError(github, core, octokit, '⚠️ Missing GitHub Application.')
      return
    }

    // const configuration = await octokit.repos.getContents({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   path: 'githubapps.json'
    // })
    // const buffer = Buffer.from(configuration.data.content, 'base64')
    // const knownApps = JSON.parse(buffer.toString('utf-8'))

    const knownApps = require('../../../githubapps.json')
    console.info(knownApps)

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
        commentIssue(github, octokit, `⚠️ ${application} is not a valid Refinitiv GitHub Application. Repositories will not be added to this application.`)
      }
    }

    if (Object.keys(applicationDetails).length === 0) {
      await reportError(github, core, octokit, '⚠️ No valid Refinitiv GitHub Applications provided. Please confirm the application names supplied are correct.')
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
    await reportError(github, core, octokit, error.message)
  }
}

run()
