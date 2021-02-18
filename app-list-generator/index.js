#! /usr/bin/env node
const { Octokit } = require('@octokit/rest')
const { program } = require('commander')
const table = require('markdown-table')
const fs = require('fs')
const validate = require('validate.js')

function validateInput(program) {
  const parsed = {
    token: program.token || process.env.TOKEN,
    org: program.org
  }

  const orgRegex = /^[a-z\d]+(?:-?[a-z\d]+)*$/i
  const alphanumericRegex = /^[a-z0-9]+$/i
  const constraints = {
    token: {
      type: 'string',
      presence: { allowEmpty: false },
      length: {
        is: 40
      },
      format: alphanumericRegex
    },
    org: {
      type: 'string',
      presence: { allowEmpty: false },
      length: {
        maximum: 39,
        minimum: 1
      },
      format: orgRegex
    }
  }

  const validation = validate(parsed, constraints)
  if (!validate.isEmpty(validation)) {
    throw new Error(JSON.stringify(validation))
  }

  return parsed
}

async function generateReadme(octokit, org, config) {
  const apps = await octokit.orgs.listAppInstallations({
    org
  })
  let data = [
    ['ID', 'Name', 'Description', 'Owner', 'Permissions'],
  ]
  const allowedApps = apps.data.installations.filter((app) => app.repository_selection === 'selected')
  const reducedConfig = config.reduce((acc, config) => {
    acc[config.name.toLowerCase()] = config
    return acc
  } , {})
  for (const application of allowedApps) {
    // Grab application data
    const appData = await octokit.apps.getBySlug({
      app_slug: application.app_slug
    })

    //Get owner
    const owner = reducedConfig[application.app_slug] ? reducedConfig[application.app_slug].owner : null

    // Get permissions
    let permissions = ''
    for (const [key, value] of Object.entries(application.permissions)) {
      permissions = `${permissions}- ${key} (${value})<br>`
    }

    // Build table
    const tableEntry = [
      appData.data.slug,
      appData.data.name,
      appData.data.description,
      owner,
      permissions
    ]
    data.push(tableEntry)
  }
  return table(data)
}

// Obtain configuration
program.version('1.0.0', '-v, --version', 'Output the current version')
  .option('-t, --token <string>', 'the token to access the API (mandatory)')
  .option('-o, --org <string>', 'the organization we want to extract the apps from (mandatory)')
  .option('-cfg, --config <string>', 'the location where the githubapps.json file is (mandatory)')

program.parse(process.argv)
const configLocation = program.cfg || '../githubapps.json'
let config = {}
try {
  config = require(configLocation)
} catch (e) {
  console.log(`${configLocation} file missing. Path parameters will apply`)
}
const { token, org } = validateInput(program)
const octokit = new Octokit({
  auth: token
})

// Get the apps of the org
generateReadme(octokit, org, config.GitHubApps)
  .then((readme) => {
    console.log(readme)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })