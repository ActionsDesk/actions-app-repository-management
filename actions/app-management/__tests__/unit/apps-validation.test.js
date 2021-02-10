const { validateApps } = require('../../action')
const {
  githubInstrumentation,
  githubInstrumentationTeardown,
  getContext,
  getOctokit,
  replyGithubResponse,
  replyGithubGetResponse
} = require('../instrumentation/github-instrumentation')
const githubapps = require('../fixtures/config/githubapps')
const issueOpenedMock = require('../fixtures/mock/issue-opened')
const appInstallationsMock = require('../fixtures/mock/app-installations')

describe('GitHub apps test', () => {
  beforeEach(() => {
    githubInstrumentation()
  })

  afterEach(() => {
    githubInstrumentationTeardown()
  })

  function mockInstallations (mockCallback, validation) {
    replyGithubGetResponse('/orgs/refinitiv-org/installations', null, (_, input) => {
      if (mockCallback) mockCallback()
      if (validation) validation(input)
      return appInstallationsMock
    })
  }

  test('that app details for a right app selected get retrieved', async () => {
    const apps = ['test-1']
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    mockInstallations()
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toHaveProperty('test-1')
    expect(validApps['test-1']).toBe(1)
  })

  test('that non-valid apps write a comment', async () => {
    const mockCallback = jest.fn()
    const apps = ['invalidApp']
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    mockInstallations()
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ **invalidApp** is not a valid Refinitiv GitHub Application. Repositories will not be added to this application. App needs to be installed in the org and have access to specific repositories')
    })
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(1)
  })

  test('that multiple valid apps pass the validation', async () => {
    const apps = ['test-1', 'test-2']
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    mockInstallations()
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toHaveProperty('test-1')
    expect(validApps).toHaveProperty('test-2')
    expect(Object.keys(validApps)).toHaveLength(2)
    expect(validApps['test-1']).toBe(1)
    expect(validApps['test-2']).toBe(2)
  })

  test('that mixed correct and incorrect apps only provide the valid ones', async () => {
    const mockCallback = jest.fn()
    const apps = ['test-1', 'invalidApp']
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    // mockInstallations()
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ **invalidApp** is not a valid Refinitiv GitHub Application. Repositories will not be added to this application. App needs to be installed in the org and have access to specific repositories')
    })
    mockInstallations()
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toHaveProperty('test-1')
    expect(Object.keys(validApps)).toHaveLength(1)
    expect(validApps['test-1']).toBe(1)
    expect(mockCallback.mock.calls.length).toBe(1)
  })

  test('that empty apps produce an empty result', async () => {
    const apps = []
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    mockInstallations()
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toStrictEqual({})
  })

  test('that apps need to have partial access to be valid', async () => {
    const mockCallback = jest.fn()
    const apps = ['test-3']
    const orgName = 'refinitiv-org'
    const context = getContext(issueOpenedMock)
    const octokit = getOctokit()
    mockInstallations(mockCallback)
    replyGithubResponse('/repos/refinitiv-org/rft-admin-support/issues/1/comments', (_, input) => {
      mockCallback()
      expect(input.body).toBe('⚠️ **test-3** is not a valid Refinitiv GitHub Application. Repositories will not be added to this application. App needs to be installed in the org and have access to specific repositories')
    })
    const validApps = await validateApps(apps, githubapps, orgName, context, octokit)
    expect(validApps).toStrictEqual({})
    expect(mockCallback.mock.calls.length).toBe(2)
  })
})
