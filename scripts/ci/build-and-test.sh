#!/bin/bash -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd)" # Figure out where the script is running
. "$SCRIPT_DIR"/../lib/robust-bash.sh

yarn install
yarn run dist:ci
yarn link
yarn example:link
yarn example:install
yarn example:test:unit
yarn example:test:cy:run