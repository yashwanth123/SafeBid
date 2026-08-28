module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js"],
  testTimeout: 30000,
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
};
