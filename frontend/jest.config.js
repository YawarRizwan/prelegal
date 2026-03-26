const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^html2pdf.js$": "<rootDir>/__mocks__/html2pdf.js.js",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
});
