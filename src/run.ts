import * as core from '@actions/core'
import * as utils from './utils'
import * as handler from './handler'

export async function run() {
  try {
    const github = await import('@actions/github')
    const token = core.getInput('repo-token', { required: true })
    const configPath = core.getInput('configuration-path', {
      required: true,
    })

    const client = github.getOctokit(token)
    const { repo, sha } = github.context
    const config = await utils.fetchConfigurationFile(client, {
      owner: repo.owner,
      repo: repo.repo,
      path: configPath,
      ref: sha,
    })

    await handler.handleEvent(client, github.context, config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    core.setFailed(message)
  }
}
