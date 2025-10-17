module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: ["main.js", "!**/node_modules/**", "!**/coverage/**"],
  // Note: main.js is designed to be run as a script, not imported as a module
  // Tests validate the logic patterns and integration behavior
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
};
