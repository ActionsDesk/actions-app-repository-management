// Reports an error on the issue
async function reportError (context, core, octokit, message) {
  core.debug('=========== Context ===========')
  core.debug(JSON.stringify(context))
  core.debug('=========== Context ===========')

  // Set the error
  core.setFailed(message)
  await commentAndCloseIssue(context, octokit, message)
}

// Comments and close the issue
async function commentAndCloseIssue (context, octokit, message) {
  await commentIssue(context, octokit, message)
  await closeIssue(context, octokit, message)
}

// Adds a comment to the issue
async function commentIssue (context, octokit, message) {
  // Send the message
  const payload = context.payload
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
async function closeIssue (context, octokit) {
  // Send the message
  const payload = context.payload
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
  closeIssue
}
