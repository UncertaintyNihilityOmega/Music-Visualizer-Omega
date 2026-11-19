# PROMPTS: one per kind of session

Copy one into a new session opened in this folder.

## Organizer (next step, by hand)
```
Music Visualiser Omega: Organizer session. Read ORGANIZER.md and ROADMAP.md, then do the next queue step the
way AGENT-RUN.md describes. Start the preview server first. Agents are allowed within
AGENT-RUN.md's limits (by default 2 Sonnet and 1 Opus).
```

## Scheduled run
```
Music Visualiser Omega: automatic run. Follow AGENT-RUN.md exactly: check the lock, read ORGANIZER.md and
ROADMAP.md, then loop: check usage, do one queue step that is not waiting on the user, run the gates, commit
that step's files (push only with a standing approval in ORGANIZER.md), update ROADMAP.md. Stop when the usage
gate says so or every step left needs the user; then remove the lock. Start the preview server first. Agents are allowed within
AGENT-RUN.md's limits (by default 2 Sonnet and 1 Opus).
```
The scheduled task `music-visualiser-omega-next-step` stores a longer version of this prompt.

## A specific item
```
Music Visualiser Omega: Organizer session. Read ORGANIZER.md and ROADMAP.md, then do queue item <n>
(<package, if it has several>). Follow AGENT-RUN.md. Start the preview server first. Agents are allowed within
AGENT-RUN.md's limits (by default 2 Sonnet and 1 Opus).
```

## Mode package (Writer)
```
Music Visualiser Omega: Writer session for ROADMAP item <n>, mode <name>. Read ORGANIZER.md, docs/MODES.md, and
the gold unit js/modes/mode-basic.js in full. Rebuild the two modes of the package to that standard using the
ideas listed for them. Touch only those two mode files and docs/MODES.md. Run every gate in ORGANIZER.md, then
update ROADMAP.md.
```

## Review (every 4 packages, a different session from the Writer)
```
Music Visualiser Omega: Specialist REVIEW session. Read ORGANIZER.md and ROADMAP.md. Review the last four
packages: run every gate, play two test songs through each changed mode at desktop and 375 px width, read the
changed code for drift from the gold unit. Fix serious faults directly; list the rest under "Review" in
docs/MODES.md as "- [ ] <mode>: <exactly what to change>". Turn anything seen twice into a rule in ORGANIZER.md
or a check in engine/check.js.
```

## Reader (before a release)
```
Music Visualiser Omega: Reader session. You are a new user on a phone (375 px wide) who has never seen this
app. Start the preview, add music, try every page and every mode, read the Guide. Change no code. Write what
confused you or failed, in order, under "Reader" in ROADMAP.md "For the user".
```

## Debugging
```
Music Visualiser Omega: debugging session. Read ORGANIZER.md. The fault: <what happens, where, with which
song>. Find it with the cheapest tool first (engine/test.js, engine/check.js, engine/songtest.js, then script
probes in the browser, a screenshot only to judge looks). Fix it, add a check that would have caught it, run
every gate.
```
