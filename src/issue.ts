import * as core from '@actions/core'
import type * as github from '@actions/github' with {
  'resolution-mode': 'import',
}
import { Client } from './types'

type Context = typeof github.context

export class Issue {
  private client: Client
  private context: Context

  constructor(client: Client, context: Context) {
    this.client = client
    this.context = context
  }

  async addAssignees(assignees: string[]): Promise<void> {
    const { owner, repo, number: issue_number } = this.context.issue
    const result = await this.client.rest.issues.addAssignees({
      owner,
      repo,
      issue_number,
      assignees,
    })
    core.debug(JSON.stringify(result))
  }

  hasAnyLabel(labels: string[]): boolean {
    if (!this.context.payload.issue) {
      return false
    }

    const { labels: issueLabels = [] } = this.context.payload.issue
    return issueLabels.some((label) => labels.includes(label.name))
  }
}
