# AGENT-RUN: how a run works

A run is one fresh session that does one queue step and leaves the project in a state any other session can
continue from. Runs are started by hand (a prompt from PROMPTS.md) or by a scheduled task.

## Every run, in order
1. **Lock.** If `.run/run.lock` exists and its `beat` is under 90 minutes old, another run is live: stop at once
   and change nothing. Otherwise write `{"session": "<id or time>", "beat": "<ISO time>", "item": <n>}`.
   `.run/` is git-ignored.
2. **Read** ORGANIZER.md, then ROADMAP.md. If "Now" starts with `USER:` and the next free item needs that answer,
   take the next item that does not; if every item is blocked, write that in "Now" and stop.
3. **Usage gate.** Read the usage meter (the app's usage tool) before starting. Start a step only at 70% or less
   of the short window and under the weekly limit the user sets (none set yet: ask after the first runs).
   Otherwise write "waiting for the reset at <time>" in "Now" and stop.
4. **Do one step**: one queue item, or one package of a multi-package item. Save as you go; never hold a
   finished file only in the chat.
5. **Gates** (ORGANIZER.md): self-test, check, songtest if sound changed, browser check if it can be done
   without a person (see Preview).
6. **Commit** only that step's files with a message that names the queue item. Push only if ROADMAP item 3 is
   done (the user has approved publishing).
7. **Update ROADMAP.md**: finished items to "Done", "Now" rewritten, anything only the user can do under
   "For the user".
8. **Unlock**: stop any server or background process, delete `.run/run.lock`.

## Rules for runs
- **No subagents** (user decision, 2026-11-15). The run does the work itself. If the user lifts this, at most
  one Writer agent per package, one area at a time, with a save-as-you-go rule.
- **One step per run.** A long chat costs more with every message; a fresh session is cheaper.
- **Preview.** Use the Node tools first: they need no browser. Start the preview server only if it starts without
  asking for approval; if it asks, skip the browser check, say so in the Done line, and leave it for a session
  with the user present.
- **Never** push, publish, delete user files, or create accounts without the user's word in that session or a
  standing approval recorded in ORGANIZER.md.
- **The user joins a run:** their message replaces the plan. Do what they list, in their order, then end cleanly.
- **A usage-limit stop loses nothing on disk.** The next run reads ROADMAP "Now", checks `git status`, runs the
  gates on what is there, and continues.

## The scheduled task (planned, not created yet)
- Name: `music-visualiser-omega-next-step`
- When: the user chooses. Suggested: once a day at a quiet hour, or every 4 hours while the queue is long.
- Prompt: the "Scheduled run" prompt in PROMPTS.md.
- It stops on its own when the queue has only user-blocked items.

## Measured costs
None yet. After six runs, write here what one step typically costs on the meter and set the gate from it.

## Usage log
`.run/usage.log`, one line per run: `<date time> | <item and step> | start <short %> wk <week %> | end <short %>`
