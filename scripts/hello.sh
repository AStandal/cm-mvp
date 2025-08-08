#!/usr/bin/env bash
set -euo pipefail

echo "Hello from CI!"
echo "Repository: ${GITHUB_REPOSITORY:-unknown}"
echo "Event: ${GITHUB_EVENT_NAME:-unknown}"
echo "Ref: ${GITHUB_REF:-unknown}"
echo "SHA: ${GITHUB_SHA:-unknown}"