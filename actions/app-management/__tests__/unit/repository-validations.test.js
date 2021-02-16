const { validateRepositories } = require('../../action')
const {
  githubInstrumentation,
  githubInstrumentationTeardown,
  getContext,
  getOctokit,
  replyGithubResponse,
  replyGithubGetResponse,
  replyGetWith404
} = require('../instrumentation/github-instrumentation')
const issueOpenedMock = require('../fixtures/mock/issue-opened')
const repositoryMock = require('../fixtures/mock/repository')
const repositoryPermissionAdminMock = require('../fixtures/mock/repository-permission-admin')
const repositoryPermissionReadMock = require('../fixtures/mock/repository-permission-read')
const repository404Mock = require('../fixtures/mock/repository-404')

describe('GitHub apps test', () => {
  beforeEach(() => {
    githubInstrumentation()
  })

  afterEach(() => {
    githubInstrumentationTeardown()
  })

  test('that valid repositories with admin permissions come as result of the data', async () => {
    const mockCallback = jest.fn()
    const repoName = ['actions-app-repository-management-test']
    const repos = [repoName]
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    replyGithubGetResponse(`/repos/github/${repoName}`, null, () => {
      mockCallback()
      return repositoryMock
    })
    replyGithubGetResponse(`/repos/github/${repoName}/collaborators/${author}/permission`, null, () => {
      mockCallback()
      return repositoryPermissionAdminMock
    })
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toHaveProperty(repoName)
    expect(mockCallback.mock.calls.length).toBe(2)
  })

  test('that unexpected error getting the repository writes a comment', async () => {
    const mockCallback = jest.fn()
    const repoName = ['actions-app-repository-management-test']
    const repos = [repoName]
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    replyGithubResponse(`/repos/${orgName}/actions-app-repository-management/issues/1/comments`, (_, input) => {
      mockCallback()
      expect(input.body).toBe(`Error getting details for repository **${repoName}**.`)
    })
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(1)
  })

  test('that repositories that do not exist cannot be used', async () => {
    const mockCallback = jest.fn()
    const repoName = ['actions-app-repository-management-test']
    const repos = [repoName]
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    replyGetWith404(`/repos/github/${repoName}`, () => {
      mockCallback()
      return repository404Mock
    })
    replyGithubResponse(`/repos/${orgName}/actions-app-repository-management/issues/1/comments`, (_, input) => {
      mockCallback()
      expect(input.body).toBe(`**${repoName}** is not a valid repository. Please ensure that you provide a valid repository name.`)
    })
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(2)
  })

  test('that users need to be admin to interact with the repository', async () => {
    const mockCallback = jest.fn()
    const repoName = ['actions-app-repository-management-test']
    const repos = [repoName]
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    replyGithubGetResponse(`/repos/github/${repoName}`, null, () => {
      mockCallback()
      return repositoryMock
    })
    replyGithubGetResponse(`/repos/github/${repoName}/collaborators/${author}/permission`, null, () => {
      mockCallback()
      return repositoryPermissionReadMock
    })
    replyGithubResponse(`/repos/${orgName}/actions-app-repository-management/issues/1/comments`, (_, input) => {
      mockCallback()
      expect(input.body).toBe(`Only repository admins can request for a repository to be added to a GitHub App. **${repoName}** will not be processed.`)
    })
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(3)
  })

  test('that an error checking the permissions writes a comment', async () => {
    const mockCallback = jest.fn()
    const repoName = ['actions-app-repository-management-test']
    const repos = [repoName]
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    replyGithubGetResponse(`/repos/github/${repoName}`, null, () => {
      mockCallback()
      return repositoryMock
    })
    replyGithubResponse(`/repos/${orgName}/actions-app-repository-management/issues/1/comments`, (_, input) => {
      mockCallback()
      expect(input.body).toBe(`Error getting the repository permissions for **${repoName}**.`)
    })
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(2)
  })

  test('that empty repositories provide empty validations', async () => {
    const repos = []
    const orgName = 'github'
    const author = 'droidpl'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    const repositoryDetails = await validateRepositories(repos, orgName, author, context, octokit)
    expect(repositoryDetails).toStrictEqual({})
  })
})
