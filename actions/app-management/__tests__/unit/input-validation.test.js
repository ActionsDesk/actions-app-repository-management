const { executeAction } = require('../../action')
const {
  githubInstrumentation,
  githubInstrumentationTeardown,
  getContext,
  replyGithubPutResponse,
  replyGithubResponse,
  replyGithubPatchResponse
} = require('../instrumentation/github-instrumentation')
const issueOpenedMock = require('../fixtures/mock/issue-opened')

describe('GitHub apps test', () => {
  beforeEach(() => {
    githubInstrumentation()
  })

  afterEach(() => {
    githubInstrumentationTeardown()
  })

  function lockedIssueValidationMock (mockCallback) {
    replyGithubPutResponse('/repos/refinitiv-org/rft-admin-support/issues/1/lock', (_, input) => {
      if (mockCallback) mockCallback()
    })
    replyGithubPatchResponse('/repos/refinitiv-org/rft-admin-support/issues/1', (_, input) => {
      if (mockCallback) mockCallback()
      expect(input.state).toBe('closed')
    })
  }

  test('that an issue title that is not associated with an title action sends an error', async () => {
    const mockCallback = jest.fn()
    const wrongTitle = 'Wrong title'
    const issueWithWrongTitle = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongTitle.issue.title = wrongTitle
    const context = getContext(issueWithWrongTitle)
    const adminToken = '123456'
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Invalid request raised. The issue templates are the only issues processed on this repository.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that an invalid yaml sends an error', async () => {
    const mockCallback = jest.fn()
    const invalidYAML = 'This is invalid YAML: -'
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = invalidYAML
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Unable to read request. Make sure you follow the template')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that a yaml without repositories sends an error', async () => {
    const mockCallback = jest.fn()
    const yamlWithoutRepos = `
Repository Name: 

GitHub Application: 
- droidpl-RFT-OAuth-Test
    `
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = yamlWithoutRepos
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Missing repository name.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that a yaml without app details sends an error', async () => {
    const mockCallback = jest.fn()
    const yamlWithoutRepos = `
Repository Name: 
- refinitiv-docs

GitHub Application: 

    `
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = yamlWithoutRepos
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Missing GitHub Application.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that failed request on githubapps.json produces an error', async () => {
    const mockCallback = jest.fn()
    const context = getContext(issueOpenedMock)
    const adminToken = '123456'
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ The token used in the integration is not correctly setup and cannot access the githubapps.json file')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })
})
