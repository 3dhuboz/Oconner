#!/bin/bash
# sync.sh — Wires R Us collaboration helper
# Usage: ./sync.sh start [branch-name]
#        ./sync.sh done "commit message"

WHO=$(git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
DATE=$(date +%Y%m%d)

case "$1" in
  start)
    git checkout main
    git pull origin main
    BRANCH="${WHO}/${2:-session-$DATE}"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
    echo "✓ Ready on branch: $BRANCH"
    ;;
  done)
    MSG="${2:-WIP}"
    BRANCH=$(git branch --show-current)
    if [ "$BRANCH" = "main" ]; then
      echo "✗ You're on main — run './sync.sh start' first"
      exit 1
    fi
    git add -A
    git commit -m "$MSG"
    git push origin "$BRANCH"
    echo "✓ Pushed. Open PR at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/.*github.com[:/]\(.*\)/\1/')/compare/$BRANCH"
    ;;
  *)
    echo "Usage: ./sync.sh start [branch-name]"
    echo "       ./sync.sh done \"commit message\""
    ;;
esac
