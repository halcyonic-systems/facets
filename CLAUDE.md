@AGENTS.md

## Claude Code only

- Explore and Plan subagents skip this file and the import above. When you
  delegate repo work to them, put the invariants that matter (at least #1 and
  #4) in the prompt.
- Subagents that edit this repo use `isolation: worktree`; a worktree subagent
  inherits the parent session's instructions, not the worktree's copy.
