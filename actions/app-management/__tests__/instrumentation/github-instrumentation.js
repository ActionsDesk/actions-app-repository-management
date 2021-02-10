const nock = require('nock')
const github = require('@actions/github')

const GITHUB_URL = 'https://api.github.com'

module.exports = {
  githubUrl: GITHUB_URL,
  githubInstrumentation: () => {
    nock.disableNetConnect()
    // Used for supertest and the local server
    nock.enableNetConnect('127.0.0.1')

    // Remove all log implementations
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  },
  replyGithubResponse: (path, interceptor) => {
    nock(GITHUB_URL)
      .post(path)
      .reply(200, interceptor)
  },
  replyGithubGetResponse: (path, params, interceptor) => {
    nock(GITHUB_URL)
      .get(path)
      .query(params || true)
      .reply(200, interceptor)
  },
  replyGetWith404: (path, interceptor) => {
    nock(GITHUB_URL)
      .get(path)
      .reply(404, interceptor)
  },
  replyGithubPutResponse: (path, interceptor) => {
    nock(GITHUB_URL)
      .put(path)
      .reply(200, interceptor)
  },
  replyGithubPatchResponse: (path, interceptor) => {
    nock(GITHUB_URL)
      .patch(path)
      .reply(200, interceptor)
  },
  replyGitHubDeleteResponse: (path, interceptor) => {
    nock(GITHUB_URL)
      .delete(path)
      .reply(200, interceptor)
  },
  githubInstrumentationTeardown: () => {
    nock.cleanAll()
    nock.enableNetConnect()
  },
  getContext: (payload) => {
    return {
      payload
    }
  },
  /* eslint-disable */
  getOctokit: () => {
    return new github.getOctokit('123456789')
  }
  /* eslint-enable */
}
