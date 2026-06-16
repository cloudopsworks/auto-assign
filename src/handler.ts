import * as core from '@actions/core'
import type * as github from '@actions/github' with {
  'resolution-mode': 'import',
}
import * as utils from './utils'
import { PullRequest } from './pull_request'
import { Issue } from './issue'
import { Client } from './types'
import { IssuesEvent, PullRequestEvent } from '@octokit/webhooks-types'

type Context = typeof github.context

export interface Config {
  addReviewers: boolean
  addAssignees: boolean | string
  reviewers: string[]
  assignees: string[]
  filterLabels?: {
    include?: string[]
    exclude?: string[]
  }
  numberOfAssignees: number
  numberOfReviewers: number
  skipKeywords: string[]
  useReviewGroups: boolean
  useAssigneeGroups: boolean
  reviewGroups: { [key: string]: string[] }
  assigneeGroups: { [key: string]: string[] }
  runOnDraft?: boolean
}

export async function handleEvent(
  client: Client,
  context: Context,
  config: Config
) {
  if (
    context.eventName === 'pull_request' ||
    context.eventName === 'pull_request_target'
  ) {
    return handlePullRequest(client, context, config)
  }

  if (context.eventName === 'issues') {
    return handleIssue(client, context, config)
  }

  throw new Error(`unsupported event: ${context.eventName}`)
}

export async function handlePullRequest(
  client: Client,
  context: Context,
  config: Config
) {
  if (!context.payload.pull_request) {
    throw new Error('the webhook payload is not exist')
  }

  const { pull_request: event } = context.payload as PullRequestEvent
  const { title, draft, user, number } = event
  const {
    skipKeywords,
    useReviewGroups,
    useAssigneeGroups,
    reviewGroups,
    assigneeGroups,
    addReviewers,
    addAssignees,
    filterLabels,
    runOnDraft,
  } = config

  if (skipKeywords && utils.includesSkipKeywords(title, skipKeywords)) {
    core.info(
      'Skips the process to add reviewers/assignees since PR title includes skip-keywords'
    )
    return
  }
  if (!runOnDraft && draft) {
    core.info(
      'Skips the process to add reviewers/assignees since PR type is draft'
    )
    return
  }

  if (useReviewGroups && !reviewGroups) {
    throw new Error(
      "Error in configuration file to do with using review groups. Expected 'reviewGroups' variable to be set because the variable 'useReviewGroups' = true."
    )
  }

  if (useAssigneeGroups && !assigneeGroups) {
    throw new Error(
      "Error in configuration file to do with using review groups. Expected 'assigneeGroups' variable to be set because the variable 'useAssigneeGroups' = true."
    )
  }

  const owner = user.login
  const pr = new PullRequest(client, context)

  if (filterLabels !== undefined) {
    if (filterLabels.include !== undefined && filterLabels.include.length > 0) {
      const hasLabels = pr.hasAnyLabel(filterLabels.include)
      if (!hasLabels) {
        core.info(
          'Skips the process to add reviewers/assignees since PR is not tagged with any of the filterLabels.include'
        )
        return
      }
    }

    if (filterLabels.exclude !== undefined && filterLabels.exclude.length > 0) {
      const hasLabels = pr.hasAnyLabel(filterLabels.exclude)
      if (hasLabels) {
        core.info(
          'Skips the process to add reviewers/assignees since PR is tagged with any of the filterLabels.exclude'
        )
        return
      }
    }
  }

  if (addReviewers) {
    try {
      const reviewers = utils.chooseReviewers(owner, config)

      if (reviewers.length > 0) {
        await pr.addReviewers(reviewers)
        core.info(`Added reviewers to PR #${number}: ${reviewers.join(', ')}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        core.warning(error.message)
      }
    }
  }

  if (addAssignees) {
    try {
      const assignees = utils.chooseAssignees(owner, config)

      if (assignees.length > 0) {
        await pr.addAssignees(assignees)
        core.info(`Added assignees to PR #${number}: ${assignees.join(', ')}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        core.warning(error.message)
      }
    }
  }
}

export async function handleIssue(
  client: Client,
  context: Context,
  config: Config
) {
  if (!context.payload.issue) {
    throw new Error('the webhook payload is not exist')
  }

  const { issue: event } = context.payload as IssuesEvent
  const { title, user, number } = event
  const {
    skipKeywords,
    useAssigneeGroups,
    assigneeGroups,
    addAssignees,
    filterLabels,
  } = config

  if (skipKeywords && utils.includesSkipKeywords(title, skipKeywords)) {
    core.info(
      'Skips the process to add assignees since issue title includes skip-keywords'
    )
    return
  }

  const owner = user.login
  const issue = new Issue(client, context)

  if (filterLabels !== undefined) {
    if (filterLabels.include !== undefined && filterLabels.include.length > 0) {
      const hasLabels = issue.hasAnyLabel(filterLabels.include)
      if (!hasLabels) {
        core.info(
          'Skips the process to add assignees since issue is not tagged with any of the filterLabels.include'
        )
        return
      }
    }

    if (filterLabels.exclude !== undefined && filterLabels.exclude.length > 0) {
      const hasLabels = issue.hasAnyLabel(filterLabels.exclude)
      if (hasLabels) {
        core.info(
          'Skips the process to add assignees since issue is tagged with any of the filterLabels.exclude'
        )
        return
      }
    }
  }

  if (addAssignees) {
    if (useAssigneeGroups && !assigneeGroups) {
      throw new Error(
        "Error in configuration file to do with using review groups. Expected 'assigneeGroups' variable to be set because the variable 'useAssigneeGroups' = true."
      )
    }

    try {
      const assignees = utils.chooseIssueAssignees(owner, config)

      if (assignees.length > 0) {
        await issue.addAssignees(assignees)
        core.info(
          `Added assignees to issue #${number}: ${assignees.join(', ')}`
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        core.warning(error.message)
      }
    }
  }
}
