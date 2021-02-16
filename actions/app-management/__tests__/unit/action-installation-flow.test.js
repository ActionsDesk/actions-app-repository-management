const { executeAction } = require('../../action')
const {
  githubInstrumentation,
  githubInstrumentationTeardown,
  getContext,
  replyGithubGetResponse,
  replyGithubPutResponse,
  replyGithubResponse,
  replyGitHubDeleteResponse,
  replyGithubPatchResponse
} = require('../instrumentation/github-instrumentation')
const contentsGitHubApp = require('../fixtures/mock/contents-githubapps')
const issueOpenedMock = require('../fixtures/mock/issue-opened')
const appInstallationsMock = require('../fixtures/mock/app-installations')
const repositoryMock = require('../fixtures/mock/repository')
const repositoryPermissionAdminMock = require('../fixtures/mock/repository-permission-admin')

describe('GitHub apps test', () => {
  beforeEach(() => {
    githubInstrumentation()
  })

  afterEach(() => {
    githubInstrumentationTeardown()
  })

  function mockInstallations (mockCallback) {
    replyGithubGetResponse('/orgs/github/installations', null, (_, input) => {
      if (mockCallback) mockCallback()
      return appInstallationsMock
    })
  }

  function mockGitHubApps (mockCallback) {
    replyGithubGetResponse('/repos/github/actions-app-repository-management/contents/githubapps.json', null, () => {
      if (mockCallback) mockCallback()
      return contentsGitHubApp
    })
  }

  function mockRepositories (mockCallback) {
    replyGithubGetResponse('/repos/github/actions-app-repository-management-test', null, () => {
      mockCallback()
      return repositoryMock
    })
    replyGithubGetResponse('/repos/github/actions-app-repository-management-test/collaborators/droidpl/permission', null, () => {
      mockCallback()
      return repositoryPermissionAdminMock
    })
  }

  function lockedIssueValidationMock (mockCallback) {
    replyGithubPutResponse('/repos/github/actions-app-repository-management/issues/1/lock', (_, input) => {
      if (mockCallback) mockCallback()
    })
    replyGithubPatchResponse('/repos/github/actions-app-repository-management/issues/1', (_, input) => {
      if (mockCallback) mockCallback()
      expect(input.state).toBe('closed')
    })
  }

  test('that the installation gets added to the repository', async () => {
    const mockCallback = jest.fn()
    const addTitle = 'Add Repository To GitHub App'
    const issueWithAddTitle = JSON.parse(JSON.stringify(issueOpenedMock))
    const validReposYaml = `
Repository Name: 
- actions-app-repository-management-test
GitHub Application: 
- test-1
    `
    issueWithAddTitle.issue.title = addTitle
    issueWithAddTitle.issue.body = validReposYaml
    const context = getContext(issueWithAddTitle)
    const adminToken = '123456'
    mockGitHubApps(mockCallback)
    mockInstallations(mockCallback)
    mockRepositories(mockCallback)
    replyGithubPutResponse('/user/installations/1/repositories/335909243', (_, input) => {
      mockCallback()
    })
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('**actions-app-repository-management-test** has been added to the application **test-1**.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(8)
  })

  test('that the installation gets removed from the repository', async () => {
    const mockCallback = jest.fn()
    const removeTitle = 'Remove Repository From GitHub App'
    const issueWithRemoveTitle = JSON.parse(JSON.stringify(issueOpenedMock))
    const validReposYaml = `
Repository Name: 
- actions-app-repository-management-test
GitHub Application: 
- test-1
    `
    issueWithRemoveTitle.issue.title = removeTitle
    issueWithRemoveTitle.issue.body = validReposYaml
    const context = getContext(issueWithRemoveTitle)
    const adminToken = '123456'
    mockGitHubApps(mockCallback)
    mockInstallations(mockCallback)
    mockRepositories(mockCallback)
    replyGitHubDeleteResponse('/user/installations/1/repositories/335909243', (_, input) => {
      mockCallback()
    })
    replyGithubResponse('/repos/github/actions-app-repository-management/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('**actions-app-repository-management-test** has been removed from the application **test-1**.')
    })
    lockedIssueValidationMock(mockCallback)
    await executeAction(context, adminToken)
    expect(mockCallback.mock.calls.length).toBe(8)
  })
})
