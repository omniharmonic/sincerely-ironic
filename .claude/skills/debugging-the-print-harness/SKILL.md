---
name: debugging-the-print-harness
description: Use when a Sincerely Ironic script that drives headless Chrome hangs, times out with no error, produces no output, or when print-files, check-prints, placement-proof or a screenshot run appears to stall forever.
---

# Debugging the print harness

`scripts/chrome.ts` is a hand-rolled Chrome DevTools Protocol driver over
Node's built-in WebSocket. Its failures are usually silent hangs rather than
errors, and two known causes account for almost all of them.

## First: kill the orphans

A killed run leaves Chrome alive, and stale instances make every later launch
look like a fresh hang. Before diagnosing anything, clear them:

```bash
ps ax | grep -c '[s]i-chrome-'          # should be 0 when nothing is running
pkill -9 -f 'si-chrome-\|si-shot-'
```

Those two prefixes are this harness's own temp profiles, so the pattern cannot
touch the user's real browser. Never `pkill -f Chrome`.

## Cause 1: the response is too big for the socket

**Symptom:** a screenshot of photographic art hangs forever; the same page at a
smaller size returns in 0.1s; flat type at an even larger size is fine.

A CDP reply carries the whole PNG as one WebSocket message, and Node's built-in
WebSocket caps the size of a decompressed message and drops the socket past it:

```
!! WS ERROR Max decompressed message size exceeded
!! WS CLOSE code=1006
```

Flat type compresses far under the ceiling; a photograph does not. This is why
it only shows up once a print carries supplied art.

**The fix already in the code:** raster prints capture via `Chrome.capture()`,
which spawns a throwaway Chrome with `--screenshot=` so Chrome writes the bytes
itself and nothing crosses the socket. `shoot()` stays the fast path for type.
If you add a new large-output capture, route it the same way.

**Do not** reach for `captureBeyondViewport: false` — it makes no difference.
The size of the reply is what matters, not how it is framed.

## Cause 2: Chrome given a profile never exits

`Chrome.capture()` cannot wait on process exit. Given its own
`--user-data-dir`, Chrome writes the screenshot and then **stays running**, so
`proc.on('close')` never fires. Waiting on the file is the only reliable
signal, and the file must be checked for completeness — a PNG ends with an
`IEND` chunk — then the browser killed by hand.

This is also why the flags reproduce fine from a shell: an ad-hoc `chrome
--headless --screenshot` without `--user-data-dir` *does* exit, so a shell test
that omits it will not reproduce the hang.

## Diagnosing something new

Both causes were found the same way, and guessing found neither. Bisect with a
probe that has its own timeout, so a hang cannot cost you the evidence:

```js
await Promise.race([
  chrome.shoot(page, w, h),
  new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
]);
```

Then vary **one** thing at a time — viewport size, image vs. flat colour, with
and without the font link — and log timings for each. A flat rectangle at the
same viewport as a failing image separates "size of the page" from "size of the
output" in one run.

Attach listeners before concluding anything about the socket:

```js
ws.addEventListener('error', e => console.log('WS ERROR', e.message));
ws.addEventListener('close', e => console.log('WS CLOSE', e.code));
```

`send()` now rejects on socket close and after 60s, so this class of failure is
loud rather than infinite — but a hang with no output at all still means the
process died on a signal, not an exception.

## Keeping your evidence

A command killed by a tool timeout loses all buffered stdout, which repeatedly
looks like "the script printed nothing". Redirect to a file and poll it:

```bash
(pnpm print-files > "$SP/run.log" 2>&1; echo "EXIT=$?" >> "$SP/run.log") &
sleep 60; tail -5 "$SP/run.log"
```

## Also worth knowing

- `pnpm print-files` starts with `rm -rf print-files/`, **even with a filter**.
  An empty output directory after a filtered run is the design, not a bug.
- Node prints a `MODULE_TYPELESS_PACKAGE_JSON` warning on every script. It is
  noise; filter it rather than chasing it.
- A silent `ELIFECYCLE Command failed.` with no stack means a signal killed the
  process — usually your own timeout — not a thrown error.
