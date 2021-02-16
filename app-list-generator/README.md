# Automatic README list generation

This script is able to generate the README app list that comes with the refinitiv admin support
for GitHub apps. The generated list looks like the following:

| ID                     | Name                   | Description                                          | Owner   | Permissions                                                                                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| droidpl-rft-oauth-test | droidpl-RFT-OAuth-Test | This is a description for the test we are performing | droidpl | - contents (write)<br>- metadata (read)<br>- environments (write)<br>- administration (write)<br>- organization_packages (write)<br> |

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
$ npm start -- -t 163e3df*************** -o refinitiv-org

| ID                     | Name                   | Description                                          | Owner   | Permissions                                                                                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| droidpl-rft-oauth-test | droidpl-RFT-OAuth-Test | This is a description for the test we are performing | droidpl | - contents (write)<br>- metadata (read)<br>- environments (write)<br>- administration (write)<br>- organization_packages (write)<br> |
```

Optionally, the script supports `npm link` if you want to execute it as a command line operation. An example for this
option would be:

```bash
$ npm link
$ generate-readme -t 163e3df*************** -o refinitiv-org
```
