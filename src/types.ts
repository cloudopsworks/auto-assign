import type * as github from '@actions/github' with {
  'resolution-mode': 'import',
}

export type Client = ReturnType<typeof github.getOctokit>
