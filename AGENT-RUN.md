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
   finish what it left on disk first: gates, then commit. **Start the preview server** ("static-server") now,
   at the start of the run: the project is visual.
3. **Usage gate.** Read the usage meter (`get_usage`) before every step. The 5-hour window may pass 75%; it
   must never hit 100% (the user's rule). So start a step only if what is left in the 5-hour window covers it
   (a step costs about 10 to 20%, an agent step with browser checks the upper end): at 80% or less start any
   step, from 80% to 90% only a small one (docs, a one-file fix), above 90% none; and the weekly limit must be
   at 95% or less. Read the meter again while a long step or an agent runs; at 95% checkpoint-commit what is
   on disk and stop agents. If the 5-hour reset is under 30 minutes away, wait for it and go on. Otherwise
   write "waiting for the reset at <time>" in "Now" and stop.
4. **Loop.** Take the next step that is not waiting on the user: one queue item, or one package of a
   multi-package item. For each step:
   - do the work, saving as you go; never hold a finished file only in the chat;
   - run the gates (ORGANIZER.md): self-test, check, songtest if sound changed, browser check (see Preview);
   - commit only that step's files with a message that names the queue item. Push only if ORGANIZER.md
     "Standing approvals" allows it; never force-push;
   - if the step finishes a snapshot, follow ORGANIZER.md "Versions and snapshots" (CHANGELOG summary, version,
     tag, empty ROADMAP "Done");
   - update the lock's `beat` and `item`, and ROADMAP "Now";
   - read the meter again, then take the next step.
5. **Stop** when a usage limit stops the session, when the gate blocks the next step, or when every step left
   needs the user. Before stopping: finish or checkpoint-commit the step in hand; move finished items from
   "Queue" to "Done"; rewrite "Now" as short lines of current state; put anything only the user can do under
   "For the user"; write any suggestions for the user in the chat; stop every server and background process.
6. **Unlock.** Delete `.run/run.lock`, unless a usage limit stopped the run (the next run sees the session has
   ended and takes over).

## Rules for runs
- **Agents, by default in a run:** at most 2 Sonnet agents and 1 Opus agent, plus the Organizer (Opus: the chat
  session itself, not an agent). If the user changes this in a run, the change holds for that run only, unless
  they say it is for all runs (then it is written here). At most one Writer agent per package, one area per
  agent, with a save-as-you-go rule. The agent gets a prompt that stands alone, sees and edits only its
  package's files, checks its work on the preview server in a tab of its own, and commits only its own files;
  the Organizer keeps the root docs and commits them after the agent's commit, so two writers never edit one
  file. Ask each agent to checkpoint-commit as soon as one part passes its gates. An agent stopped by a usage
  limit keeps its work: resume it after the reset rather than starting a new one. Agents count against the same
  usage meter: two at once spend about twice as fast.
- **One step at a time.** Each step has its own gates and its own commit, so a stop at any point loses nothing.
- **Preview.** Every run starts the preview server at its start. Start the "static-server" launch
  configuration. If it asks for approval or will not start, skip the browser check, say so in the step's Done
  line, and leave it under "For the user".
- **A hidden pane fires no animation frames.** In an automatic run the browser pane is usually hidden. Step
  frames with a timer through `App.modes.frame(now)`; judge speed by milliseconds per frame; do not report a
  frame rate. `engine/README.md` "Browser probes" has the script.
- **Never** push, publish, delete user files, or create accounts without the user's word in that session or a
  standing approval recorded in ORGANIZER.md.
- **Needs the user.** Write it under "For the user" and take the next step that does not need them. If every
  step left needs them, the first line of "Now" begins `USER:`.
- **The user joins a run:** what they ask for goes into the queue (ORGANIZER.md "Working with the user"), in
  the snapshot where it fits, and the run continues from where the queue stood. Only what they mark
  "immediately" is done at once, in their order. Their questions are answered at once; their rule changes take
  effect at once.
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

Run of 2026-11-16, second (the user joined it; one session, 5-hour meter from 3%):

| Step | 5-hour meter | Weekly meter |
| --- | --- | --- |
| Item 4: service worker, install button, background play, offline test | 13% | 1% |
| Buttons regrouped, games renamed; Rain, Nature, Clock looks for 8 themes | 23% | 3% |
| Tessa code (two new mode forms) and the Liquid mode, with the boom rework | 23% | 3% |
| Icons on buttons, unused report, roadmap | about 12% | 2% |

Run of 2026-11-16, third (the user joined it; 5-hour meter from 3%, weekly from 78%):

| Step | 5-hour meter | Weekly meter |
| --- | --- | --- |
| Reading, web research (6 searches), loop fix, iPhone preparation, browser check | 20% | 5% |
| Piano video measured, Piano flames, README, research notes, roadmap | 19% | 4% |

Run of 2026-11-16, fourth (the user joined it and lifted both meters' gates; 5-hour meter from 39%, weekly 87%):

| Step | 5-hour meter | Weekly meter |
| --- | --- | --- |
| Remembering files, the "Keep a copy" switch, the last song's place | about 15% | |
| Piano falling notes (late sound in the engine), timing measured with made-up notes | about 15% | |
| Fullscreen on a phone, every mode upright and sideways | about 10% | |
| Clock redrawn | Fable's own limit ran out here; the session moved to Opus 5.5 and an agent finished it | |

Run of 2026-11-17 (Opus 5.5, agents; weekly meter from 93%): Clock designs (one agent, about 290k tokens), the
folders, half a review (one agent, about 125k tokens) and the start of the song map (one agent, about 150k
tokens). Two agents at once doubled the spend; the user closed the run to save the weekly limit. Lesson: one
agent at a time, and ask each agent to checkpoint-commit as soon as one part passes its gates.

Run of 2026-11-19, afternoon (scheduled, Opus 5.5 Organizer doing the steps itself, one Sonnet Reader agent at
the end; 5-hour meter from 1%, weekly from 46%):

| Step | 5-hour meter | Weekly meter |
| --- | --- | --- |
| Item 26 piano sound (a new synth file, engine routing, checks, browser timing tests) | 8% | 1% |
| Items 20, 27 notes, item 29 fish redrawn, the black-keys question | 5% | 1% |
| Item 6 song map finished (drop and confidence fixes, Node tool, seek bar) | 6% | 0% |
| Item 7 "follows" settings | 3% | 1% |
| Item 30 Artificium: board units, probe of every row | 9% | 1% |
| Item 31 Undarum (and repairing the audit file) | 6% | 1% |
| Item 9 mini-game audit | 7% | 1% |
| Item 16 two design steps with before and after pictures | 11% | 1% |
| Item 11 touch targets | 6% | 1% |

Lesson: probing a whole game by script (`Probe.*`) costs far less than playing it through screenshots.

A step costs about 10 to 20% of the 5-hour meter; an agent step with browser checks about 10%, three mode fixes by one agent about 10% (2026-11-19). Browser checks cost
most: every screenshot and long probe result stays in the session. Prefer numbers from `engine/probe.js` over
screenshots, and one screenshot per fault. Update this table after more runs.

## Usage log
`.run/usage.log`, one line per step:
`<date time> | <item and step> | start <5-hour %> wk <week %> | end <5-hour %> wk <week %>`
