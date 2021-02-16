# Automatic README list generation

This script is able to generate the App list on the [README](../README.md) using the command line. The generated list looks like the following:

| ID                     | Name                   | Description                                          | Owner   | Permissions                                                                                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| test-app               | test-app               | This is a description for the test we are performing | hubber  | - contents (write)<br>- metadata (read)<br>- environments (write)<br>- administration (write)<br>- organization_packages (write)<br> |

## How to use it

The script is a command line tool that receives any of the following parameters:

```bash
Usage: index [options]

Options:
  -v, --version            Output the current version
  -t, --token <string>     the token to access the API (mandatory)
  -o, --org <string>       the organization we want to extract the apps from (mandatory)
  -cfg, --config <string>  the location where the githubapps.json file is (mandatory)
  -h, --help               display help for command
```

Before running the script execute an `npm install` to get the dependencies installed.

See the following running example:

```bash
$ npm start -- -t 163e3df*************** -o github

| ID                     | Name                   | Description                                          | Owner   | Permissions                                                                                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| test-app               | test-app               | This is a description for the test we are performing | hubber  | - contents (write)<br>- metadata (read)<br>- environments (write)<br>- administration (write)<br>- organization_packages (write)<br> |
```

Optionally, the script supports `npm link` if you want to execute it as a command line operation. An example for this
option would be:

```bash
$ npm link
$ generate-readme -t 163e3df*************** -o github
```
