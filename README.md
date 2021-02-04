# GitHub App Repository Management

## Available GitHub Applications

| Name               | Description | Owner | Permissions |
| -------------------| ----------- | ----- | ----------- |
| RFT-OAuth-Test     | Testing GitHub App User-to-server workflows | sdlc | - Issues (R/W)<br>- Metadata (R)<br>- Email Addresses (R)<br>- GPG keys (R)<br>- Git SSH Keys (R)<br>- Plan (R)|
| rft-app-management | Managing which repositories can be accessed by approved GitHub Apps | sdlc | - Contents (R)<br>- Issues (RW)<br>- Metadata (R) | 

## Instructions

You can request that a repository is added to, or removed from, one of the approved GitHub Applications by [raising an issue](https://github.com/rft-dev/sdlc-appmanagement/issues) in this repository.  There are issue templates that you must use to get the action completed and you should ensure that you adhere to the following suggestions:

- Do not change the title of the issue.
  - Any changes to the title will mean the issue is closed without any further action.
- The issue content should be valid yaml.
  - If the content does not parse correctly then the ticket will be close without any further action.
- You may supply multiple repositories and GitHub Application names.
  - Valid repositories will be added to all valid GitHub Application names.
- Once an issue has been opened it will be processed based on the initial data entered.
  - Do not try to change the issue after raised as it will not be actioned.
  - Once complete the issue will be locked and closed.
  - Any comments added to an issue will be ignored.

### Single Repository To GitHub Application example content

```
Repository Name: 
- group-repositoryname

GitHub Application: 
- github-app-name
```

### Single Repository To GitHub Application example content

```
Repository Name: 
- group-repositoryone
- group-repositorytwo
- newgroup-repositorytwo

GitHub Application: 
- github-app-name
- github-app-name-two
```
