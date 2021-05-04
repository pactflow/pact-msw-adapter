module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: ".*.msw.(spec|test).ts",
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "\\.(ts|json)": "ts-jest",
    "\\.js": "babel-jest",
  },
  setupFilesAfterEnv: ["./setupTests.js"],
};
