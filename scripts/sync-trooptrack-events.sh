#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../backend"
node sync-trooptrack-events.js "$@"
