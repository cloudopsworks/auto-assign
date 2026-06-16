# AGENTS.md

This file provides guidance to Coding Agents when working with code in this repository.

## Project Overview

Auto Assign Action is a GitHub Action that automatically adds reviewers to pull requests and assignees to pull requests or issues when configured GitHub events run. The action reads a YAML configuration file (default: `.github/auto_assign.yml`) and assigns users based on single or grouped reviewer/assignee lists, with support for filtering by labels, draft pull requests, and skip keywords.

## Development Commands

### Build and Test
```bash
npm run build          # Compile TypeScript to lib/ directory
npm test               # Run all Jest tests
npm run format         # Format all TypeScript files with Prettier
npm run format-check   # Check formatting without modifying files
npm run package        # Bundle with ncc into dist/index.js for distribution
```

### Running Individual Tests
```bash
npm test -- __tests__/utils.test.ts           # Run specific test file
npm test -- -t "test name pattern"            # Run tests matching pattern
```

## Architecture

### Entry Point Flow
1. **main.ts** - Entry point that calls `run()`
2. **run.ts** - Orchestrates the action:
   - Fetches inputs (`repo-token`, `configuration-path`)
   - Creates GitHub Octokit client
   - Loads config from repository using `utils.fetchConfigurationFile()`
   - Delegates to `handler.handleEvent()`

### Core Components

**handler.ts** - Main business logic
- `handleEvent()`: Routes `pull_request` / `pull_request_target` events to pull request behavior and `issues` events to issue behavior; unsupported events fail fast
- `handlePullRequest()`: Validates PR filters (skip keywords → draft status → label filters), then adds reviewers and assignees
- `handleIssue()`: Validates issue filters (skip keywords → label filters), then adds assignees only
- `Config` interface: Defines all configuration options from YAML file
- Pull request assignment suppresses any assignee login already selected as a reviewer in the same run, without backfilling replacements

**utils.ts** - Selection logic
- `chooseReviewers()` / `chooseAssignees()`: Select users from single list or groups
- `chooseIssueAssignees()`: Selects issue assignees without falling back to reviewer-only configuration
- `chooseUsers()`: Filters out PR creator, returns all users if `numberOfReviewers: 0`, otherwise randomly samples
- `chooseUsersFromGroups()`: Iterates groups and selects users from each
- `fetchConfigurationFile()`: Retrieves and parses YAML config from repository via GitHub API

**pull_request.ts** - GitHub API wrapper
- `PullRequest` class encapsulates context and client
- `addReviewers()`: Calls `pulls.requestReviewers` API
- `addAssignees()`: Calls `issues.addAssignees` API (PRs are issues)
- `hasAnyLabel()`: Checks if PR has any of the specified labels

**issue.ts** - GitHub API wrapper for issue events
- `Issue` class encapsulates context and client
- `addAssignees()`: Calls `issues.addAssignees` API
- `hasAnyLabel()`: Checks if the issue has any of the specified labels

### Configuration System

The action expects a YAML configuration file (default `.github/auto_assign.yml`) with these key options:
- `addReviewers` / `addAssignees`: Enable reviewer/assignee assignment (`addReviewers` applies only to pull requests)
- `reviewers` / `assignees`: Single list mode
- `useReviewGroups` / `useAssigneeGroups`: Enable grouped mode
- `reviewGroups` / `assigneeGroups`: Multiple lists keyed by group name
- `numberOfReviewers` / `numberOfAssignees`: How many to assign (0 = all)
- `skipKeywords`: Skip assignment if PR title contains these
- `filterLabels.include` / `filterLabels.exclude`: Label-based filtering
- `runOnDraft`: Whether to run on draft PRs (default: false; ignored for issues)
- Special: `addAssignees: "author"` assigns the PR creator or issue author

### Key Behaviors

- **Supported Events**: `pull_request`, `pull_request_target`, and `issues`; unsupported events throw an error
- **Creator Exclusion**: The PR or issue author is filtered out from reviewer/assignee candidate lists (unless `addAssignees: "author"`)
- **Random Sampling**: When `numberOfReviewers` > 0, uses `lodash.sampleSize()` for random selection
- **Group Mode**: When using groups, the specified number is selected from EACH group, not total
- **Issue Scope**: Issues cannot request reviewers and never use reviewer lists as fallback assignees
- **Reviewer/Assignee Precedence**: On pull requests, selected reviewers are removed from the assignee list before assigning; no replacement assignees are backfilled
- **Error Handling**: Reviewer/assignee addition failures are logged as warnings, not failures
- **Configuration Validation**: Throws errors if group flags are enabled but group lists are missing

### Distribution

The action uses `@vercel/ncc` to bundle everything into `dist/index.js`. After making TypeScript changes locally:
1. Run `npm run build` to compile TypeScript
2. Run `npm run package` to create the bundled distribution
3. Commit relevant source/test/config/docs files, but do not commit generated build output in PRs

`lib/` is ignored by git, and `dist/` is release-managed. Do not include `dist/` changes in pull requests; `.github/workflows/check-dist.yml` fails PRs that modify `dist/**`. The manual `.github/workflows/release.yml` workflow updates `package.json` / `package-lock.json`, rebuilds, packages `dist/`, tags `v<version>`, and creates the GitHub release.

The action runs on Node 24 (specified in `action.yml` and `.node-version`).

### Testing

Tests use Jest with ts-jest transformer. Test files mirror source structure:
- `__tests__/utils.test.ts` - Tests selection logic and utility functions
- `__tests__/handler.test.ts` - Tests main handler logic and filtering
- `__tests__/run.test.ts` - Tests action entry point

Mock `@actions/github` for testing without real API calls.

### Repository Automation

- This repository owns its local `.github/workflows/` files. Workflow changes are allowed when they are part of an explicit maintenance or release task.
- `pull-request.yml` uses the latest published `cloudopsworks/auto-assign` release tag for repository PR automation; do not point it at a tag that has not been published yet.
- `release.yml` is the release authority: trigger it manually with a semantic version without the leading `v` and the branch to release from.
