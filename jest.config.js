module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  moduleNameMapper: {
    '^@actions/github$': '<rootDir>/__tests__/__mocks__/actions-github.cjs',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  verbose: true,
}
