#!/usr/bin/env bash
# iOS e2e entry point: prepares the simulator, then runs the Maestro suite.
#
# The 09-sync-signin flow enters the password through the native context-menu
# Paste because Maestro's inputText/pasteText mis-deliver text into real
# secureTextEntry fields, and its setClipboard only fills Maestro's internal
# clipboard - never the iOS pasteboard a native Paste reads. So the test
# password must be on the simulator pasteboard before Maestro starts; nothing
# else in the suite touches the pasteboard.
set -euo pipefail

cd "$(dirname "$0")/../.."

password="${MAESTRO_TEST_PASSWORD:-maestro-password-1}"
printf '%s' "$password" | xcrun simctl pbcopy booted

maestro test .maestro
