# AGENT-RUN: how a run works

A run is one fresh session that works through queue steps, one at a time, and leaves the project in a state any
other session can continue from. Runs are started by hand (a prompt from PROMPTS.md) or by the scheduled task.

## Every run, in order
1. **Lock.** Read `.run/run.lock`: `{"session": "<time started>", "beat": "<last update>", "id": "<session id>",
   "item": "<queue item and step>"}`. `.run/` is git-ignored and holds all run state (never `.claude/`, where
   every write asks for permission).
   - Live: `beat` under 90 minutes old and the session with that `id` still running (for a scheduled run,
     `list_task_runs` shows it as `running`; a hand-started session is taken as running). Stop at once and
     change nothing.
   - Stale: missing, `beat` 90 minutes old or more, or its session ended. Write a new lock with this session's
     id (`get_session("self")`) and the time in both time fields.
2. **Read** ORGANIZER.md, then ROADMAP.md, then run `git status`. If the last run stopped at a usage limit,
   finish what it left on disk first: gates, then commit.
3. **Usage gate.** Read the usage meter (`get_usage`) before every step. Start a step only if the 5-hour window
   is at 75% or less and the weekly limit at 95% or less (user, 2026-11-16). If the 5-hour reset is under
   30 minutes away, wait for it and go on. Otherwise write "waiting for the reset at <time>" in "Now" and stop.
4. **Loop.** Take the next step that is not waiting on the user: one queue item, or one package of a
   multi-package item. For each step:
   - do the work, saving as you go; never hold a finished file only in the chat;
   - run the gates (ORGANIZER.md): self-test, check, songtest if sound changed, browser check (see Preview);
   - commit only that step's files with a message that names the queue item. Push only if ORGANIZER.md
     "User decisions" records a standing approval to push; never force-push;
   - update the lock's `beat` and `item`, and ROADMAP "Now";
   - read the meter again, then take the next step.
5. **Stop** when a usage limit stops the session, when the gate blocks the next step, or when every step left
   needs the user. Before stopping: finish or checkpoint-commit the step in hand; move finished items from
   "Queue" to "Done"; rewrite "Now" as short lines of current state; put anything only the user can do under
   "For the user"; stop every server and background process.
6. **Unlock.** Delete `.run/run.lock`, unless a usage limit stopped the run (the next run sees the session has
   ended and takes over).

## Rules for runs
- **No subagents and no other sessions** (user decision, 2026-11-15, repeated 2026-11-16). The run does the work
  itself. If the user lifts this, at most one Writer agent per package, one area at a time, with a
  save-as-you-go rule.
- **One step at a time.** Each step has its own gates and its own commit, so a stop at any point loses nothing.
- **Preview.** The user allows the preview server in runs (2026-11-16). Start the "static-server" launch
  configuration. If it asks for approval or will not start, skip the browser check, say so in the step's Done
  line, and leave it under "For the user".
- **A hidden pane fires no animation frames.** In an automatic run the browser pane is usually hidden. Step
  frames with a timer through `App.modes.frame(now)`; judge speed by milliseconds per frame; do not report a
  frame rate. `engine/README.md` "Browser probes" has the script.
- **Never** push, publish, delete user files, or create accounts without the user's word in that session or a
  standing approval recorded in ORGANIZER.md.
- **Needs the user.** Write it under "For the user" and take the next step that does not need them. If every
  step left needs them, the first line of "Now" begins `USER:`.
- **The user joins a run:** their message replaces the plan. Do what they list, in their order, then end cleanly.
- **A usage-limit stop loses nothing on disk.** The next run reads ROADMAP "Now", checks `git status`, runs the
  gates on what is there, and continues.

## The scheduled task
- Name: `music-visualiser-omega-next-step` (created 2026-11-16; every 4 hours; switched off, the user starts it
  by hand or switches it on).
- Prompt: stored in the task. It follows this file; if the two disagree, fix the task's prompt to match here.
- It stops on its own when the queue has only user-blocked items.

## Measured costs
Run of 2026-11-16 (Pro plan, one session, no agents), share of the 5-hour meter per step:

| Step | 5-hour meter | Weekly meter |
| --- | --- | --- |
| Gates and browser check of ten modes, one fix, docs (plus rewriting the task prompt) | 35% | 4% |
| Item 15, a small feature in one mode with browser checks at two widths | 13% | 2% |
| Items 3 and 13: publish, four small fixes, browser checks | 23% | 3% |

So a run fits about three steps, and a step that starts above 60% is likely to cross 75%. Browser checks cost
most: every screenshot and long probe result stays in the session. Prefer numbers from `engine/probe.js` over
screenshots, and one screenshot per fault. Update this table after more runs.

## Usage log
`.run/usage.log`, one line per step:
`<date time> | <item and step> | start <5-hour %> wk <week %> | end <5-hour %> wk <week %>`
