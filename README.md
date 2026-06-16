# Auto Assign Action

Auto Assign Action adds reviewers to pull requests and assignees to pull requests or issues when configured GitHub events run.

## Usage

Create a workflow (for example, `.github/workflows/auto-assign.yml`) that runs the action for pull requests, issues, or both.

```yml
name: Auto Assign

on:
  pull_request:
    types: [opened, ready_for_review, reopened, labeled]
  issues:
    types: [opened, reopened, labeled]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  auto-assign:
    runs-on: ubuntu-latest
    steps:
      - uses: cloudopsworks/auto-assign@v3.0.1
        with:
          configuration-path: .github/auto_assign.yml # Optional; this is the default
```

The `labeled` issue trigger is recommended when you use `filterLabels.include` and want assignment to happen after a matching label is added to an existing issue.

### Pull requests from forks or bots

Use `pull_request_target` instead of `pull_request` if you need to assign reviewers or assignees when pull requests are opened from forks or bots such as Dependabot.

Using `pull_request_target` incorrectly can be a security risk. Do not check out or execute untrusted pull request code from a `pull_request_target` workflow unless you fully understand the implications.

```diff
name: Auto Assign
 on:
-  pull_request:
+  pull_request_target:
     types: [opened, ready_for_review, reopened, labeled]
```

See GitHub's documentation for details:

- [Pull request target event](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#pull_request_target)
- [Pull request events for forked repositories](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#pull-request-events-for-forked-repositories)

Create an auto-assign configuration file such as `.github/auto_assign.yml`.

## Configuration scope

One configuration file can be shared by pull request and issue workflows.

| Setting | Pull requests | Issues |
| --- | --- | --- |
| `addReviewers`, `reviewers`, `useReviewGroups`, `reviewGroups`, `numberOfReviewers` | Yes | Ignored |
| `addAssignees`, `assignees`, `useAssigneeGroups`, `assigneeGroups`, `numberOfAssignees` | Yes | Yes |
| `addAssignees: author` | PR creator | Issue author |
| `filterLabels` | PR labels | Issue labels |
| `skipKeywords` | PR title | Issue title |
| `runOnDraft` | Yes | Ignored |

Issues cannot request reviewers. On `issues` events, reviewer-only settings are ignored and only assignee behavior runs. If `addAssignees` is `false`, an issue run completes without making assignment API calls.

Assignment API errors are logged as warnings and do not fail the workflow.

On pull requests, users selected as reviewers in the same run are removed from the assignee list before the assignment API call. The action does not backfill replacement assignees after that suppression, so the final assignee count can be lower than `numberOfAssignees`.

### Single reviewers/assignees list

Add reviewers and/or assignees based on simple lists.

```yaml
# Pull requests only: add reviewers to pull requests.
addReviewers: true

# Pull requests and issues: add assignees.
addAssignees: true

# Pull requests only: GitHub usernames to request as reviewers.
reviewers:
  - reviewerA
  - reviewerB
  - reviewerC

# Pull requests only: number of reviewers to add.
# Set to 0 to add all reviewers. Default: 0.
numberOfReviewers: 0

# Pull requests and issues: GitHub usernames to assign.
# For pull requests, this overrides the reviewer fallback when set.
# For issues, reviewers are never used as fallback assignees.
assignees:
  - assigneeA
  - assigneeB

# Pull requests and issues: number of assignees to add.
# Set to 0 to add all assignees.
# For pull requests only, numberOfReviewers is used when numberOfAssignees is unset.
# For issues, unset numberOfAssignees defaults to 0.
numberOfAssignees: 2

# Pull requests and issues: skip when the title contains any keyword.
skipKeywords:
  - wip
```

### Multiple reviewer/assignee groups

Select reviewers and/or assignees from multiple groups.

```yaml
# Pull requests only.
addReviewers: true
numberOfReviewers: 1
useReviewGroups: true
reviewGroups:
  frontend:
    - reviewerA
    - reviewerB
  backend:
    - reviewerC
    - reviewerD

# Pull requests and issues.
addAssignees: true
numberOfAssignees: 1
useAssigneeGroups: true
assigneeGroups:
  triage:
    - assigneeA
    - assigneeB
  maintainers:
    - assigneeC
    - assigneeD
```

When groups are used, the action chooses the configured number of users from each group, excluding the pull request creator or issue author.

For pull requests, assignee groups follow the same reviewer suppression rule: if the same login was selected as a reviewer, it is not added as an assignee. No replacement user is selected after suppression.

### Assign the author

Assign the pull request creator or issue author.

```yaml
addAssignees: author
```

### Filter by label

Only run assignment when labels match the configured filters. For issue workflows, include the `labeled` activity type if labels may be added after issue creation.

```yaml
filterLabels:
  include:
    - triage
    - bug
  exclude:
    - wip
```

### Draft pull requests

Draft filtering applies only to pull request events. It is ignored for issues.

```yaml
runOnDraft: true
```

## Permissions

When using the default `github.token`, grant only the permissions your workflow needs:

```yaml
permissions:
  contents: read        # Read the configuration file
  pull-requests: write  # Request pull request reviewers
  issues: write         # Assign issues and pull requests
```

If your workflow handles only issues, `pull-requests: write` is not required. If it handles only pull request reviewers, `issues: write` is still required when `addAssignees` is enabled because pull request assignees use GitHub's issue assignment API.

## Licence

MIT
