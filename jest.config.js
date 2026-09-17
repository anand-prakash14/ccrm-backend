/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/config/data-source.ts'],
  coverageDirectory: '<rootDir>/coverage',
  clearMocks: true,
};
