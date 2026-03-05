#!/bin/bash -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd)" # Figure out where the script is running
. "$SCRIPT_DIR"/../lib/robust-bash.sh

npm install
npm run dist:ci
npm link
npm run example:link
npm run example:install
npm run example:test:unit
npm run example:test:cy:run