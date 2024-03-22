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

jest.mock('fs', () => ({
  promises: {
    access: jest.fn()
  },
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
const fs = require('fs')

describe('GitHub apps test', () => {
  beforeEach(() => {
    githubInstrumentation()
    fs.readFileSync.mockClear()
  })

  afterEach(() => {
    githubInstrumentationTeardown()
  })

  function lockedIssueValidationMock (mockCallback) {
    replyGithubPutResponse('/repos/github/actions-app-repository-management/issues/1/lock', (_, input) => {
      if (mockCallback) mockCallback()
    })
    replyGithubPatchResponse('/repos/github/actions-app-repository-management/issues/1', (_, input) => {
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
    const localToken = 'local-123456'
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Invalid request raised. The issue templates are the only issues processed on this repository.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, localToken, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that an invalid yaml sends an error', async () => {
    const mockCallback = jest.fn()
    const invalidYAML = 'This is invalid YAML: -'
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = invalidYAML
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    const localToken = 'local-123456'
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Unable to read request. Make sure you follow the template')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, localToken, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that a yaml without repositories sends an error', async () => {
    const mockCallback = jest.fn()
    const yamlWithoutRepos = `
Repository Name:

GitHub Application:
- test-App
    `
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = yamlWithoutRepos
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    const localToken = 'local-123456'
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Missing repository name.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, localToken, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that a yaml without app details sends an error', async () => {
    const mockCallback = jest.fn()
    const yamlWithoutRepos = `
Repository Name:
- actions-app-repository-management-test

GitHub Application:

    `
    const issueWithWrongYAML = JSON.parse(JSON.stringify(issueOpenedMock))
    issueWithWrongYAML.issue.body = yamlWithoutRepos
    const context = getContext(issueWithWrongYAML)
    const adminToken = '123456'
    const localToken = 'local-123456'
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ Missing GitHub Application.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, localToken, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that faling to load githubapps.json produces an error', async () => {
    const mockCallback = jest.fn()
    const context = getContext(issueOpenedMock)
    const adminToken = '123456'
    const localToken = 'local-123456'
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ The githubapps.json file is not available on the actions directory')
    })
    lockedIssueValidationMock(mockCallback)
    fs.readFileSync.mockImplementation(() => {
      throw new Error()
    })
    await executeAction(context, localToken, adminToken)
    expect(mockCallback.mock.calls.length).toBe(3)
  })
})
