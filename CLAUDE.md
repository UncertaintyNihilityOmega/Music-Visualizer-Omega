# Music Visualiser Omega

Read `ORGANIZER.md` (rules, roles, user decisions, this machine's quirks) and then `ROADMAP.md` (current state
and the queue) before doing anything. They are the only source of rules and status; this file only points there.

- Runs follow `AGENT-RUN.md`; prompts are in `PROMPTS.md`.
- Gates before a step counts: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` (when sound
  changed), then a browser check with a real song.
- Preview: the "static-server" launch configuration (`node engine/serve.js`, port 8123).
