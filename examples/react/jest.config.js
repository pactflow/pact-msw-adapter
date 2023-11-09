const path = require('path');
const createJestConfig = require("react-scripts/scripts/utils/createJestConfig.js")

const config = createJestConfig(filePath =>
    path.posix.join(path.dirname(require.resolve("react-scripts/package.json")), filePath)
)

module.exports = {
    ...config,
    moduleNameMapper: {
        ...config.moduleNameMapper,
        "^@bundled-es-modules/js-levenshtein$": "js-levenshtein",
        "^@bundled-es-modules/statuses$": "statuses",
        "^@bundled-es-modules/cookie$": "cookie",
    },
    setupFiles: [
        ...config.setupFiles,
        '<rootDir>/jest/jest.polyfills.js'
    ],
}


