// Reports an error on the issue
async function reportError (github, core, octokit, message) {
  core.debug('=========== Context ===========')
  core.debug(JSON.stringify(github.context))
  core.debug('=========== Context ===========')

  // Set the error
  core.setFailed(message)
  await commentAndCloseIssue(github, octokit, message)
}

// Comments and close the issue
async function commentAndCloseIssue (github, octokit, message) {
  await commentIssue(github, octokit, message)
  await closeIssue(github, octokit, message)
}

// Adds a comment to the issue
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

// Closes and locks the issue
async function closeIssue (github, octokit) {
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

module.exports = {
  commentAndCloseIssue,
  reportError,
  commentIssue,
}