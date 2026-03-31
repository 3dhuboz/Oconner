# Wires R Us — Claude Code Rules

## Collaboration (Steve + Cassie)
- NEVER push directly to `main`
- ALWAYS start a session with `./sync.sh start [description]`
- ALWAYS finish with `./sync.sh done "what you did"`
- If unsure which branch you're on: `git branch --show-current`

## Branch Naming
- Steve: `steve/description`
- Cassie: `cassie/description`

## Before Starting Work
```bash
./sync.sh start fix-dashboard   # creates steve/fix-dashboard or cassie/fix-dashboard
```

## When Done
```bash
./sync.sh done "fixed dashboard layout"
```
Then open the PR link it prints, and the other person reviews before merging.

## Conflict Rule
If both of you edited the same file — stop, call each other, merge manually. Don't let Claude resolve it blindly.
