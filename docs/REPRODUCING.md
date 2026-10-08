# Reproducing Phase 1

Use the pinned package-lock.json with Node.js 22+ and npm. Node 24.19.0 and Playwright 1.64.0 were used for the published run. Read the environment and per-test browser-version attachments in the public reports for the recorded versions; macOS is recorded as its Darwin kernel release.

## Install and run

```sh
npm ci
npm run browsers:install
npm test
npm start
```

These commands use project dependencies and user-level browser downloads. They do not upload results or install operating-system packages. No `sudo`, `--with-deps`, browser security changes or API credentials are needed. Playwright's [browser documentation](https://playwright.dev/docs/browsers) describes supported environments. On systems with missing native prerequisites, use an already supported environment; platform portability beyond the recorded macOS run is unverified.

`npm test` runs 21 Node checks, 50 app checks and 20 dashboard checks. The app's 50/50 is separate from all infrastructure/software QA counts. Future changes to the test suite must version the protocol and update these counts.

For an isolated task, use `npm run test:todo`, `npm run test:dashboard` or `npm run test:unit`. Browser options supported by the wrapper are `--project=chromium`, `--project=webkit`, `--grep=pattern` and `--headed`, passed after `--`. Filtered runs are partial evidence. Direct `npx playwright test` is intentionally rejected because it bypasses run-folder and provenance setup.

A standalone dashboard run explicitly skips two integration cases per engine when no local app report exists. Run `npm run test:todo` first or use `npm test`. Public evidence is bundled so the fixed published-report button can also be verified.

The legacy `automation/lab.sh` convenience launcher can use an existing Codex Node runtime when Node is absent from PATH. It is optional; the portable instructions above use a normal Node/npm installation. No Codex installation is necessary.

## App coverage: 25 cases × 2 engines

| IDs | Observable behavior |
|---|---|
| T01–T03 | Empty state, button/Enter creation, trimming/order, editing the selected task and persistence |
| T04 (two cases) | Cancel and Escape discard edits and return focus |
| T05–T06 | Complete/reopen, count/progress, delete selected and final task, persist deletion |
| T07–T09 | All/Active/Completed filters, filtered empty state, creation from a filter, reload/new-tab persistence |
| T10 (two cases), T11 | Empty/whitespace creation and blank edits rejected; valid input recovers |
| T12–T14 | Duplicate labels stay independent; Unicode/HTML-like text stays literal; 500-character typed-input limit |
| T15 (three cases) | Malformed JSON, invalid stored schema and duplicate stored IDs report errors |
| T16–T17 | Quota and unavailable-storage warnings; in-tab operations; saved data remains available |
| T18 (four cases) | Long text, control bounds and task operations at 320, 390, 768 and 1440 CSS pixels |

Each case runs once in Chromium and once in WebKit, in a fresh browser context. No normal browser profile or saved personal scores are used. Locale is en-US, timezone is Europe/Zurich, default viewport is 1440×1000, workers=1, retries=0. The server uses loopback and an available port, then closes. UI assertions wait for observable conditions rather than fixed sleeps. Fault injection affects only the test page's storage methods.

The original app and research README are hashed before and after the run against `automation/original-app.sha256.json`. A mismatch makes the run unsuccessful. Do not regenerate that baseline merely to make a modified app pass; use a new target and protocol when evaluating changed source.

## Output

Each browser suite writes `reports/<UTC timestamp>-<scope>-<id>/`:

- `report.json`: normalized per-case outcomes, attempts, errors, environment and hashes.
- `playwright.json`: raw Playwright JSON.
- `metadata.json`: settings and source hashes captured before the run.
- `console.log`: unedited runner output.
- `inputs/`: captured source/test files and report fixtures for that attempt.
- `artifacts/`: failure screenshots and traces.
- `evidence/`: screenshots from responsive checks.

Local reports may contain absolute file paths in raw traces, logs and error stacks. Keep them private unless reviewed. The latest pointers select the most recent run even when it failed. No historical run is overwritten. Node logic checks have separate timestamped logs under `reports/`; they are not included in the 50 app results.

A run's `suiteHashes` identify its executable testing/dashboard files; `sourceHashes` identify the preserved target. Package-lock integrity hashes pin npm dependencies. OS/browser behavior and timing can still vary across machines. For the most comparable rerun, match the recorded Node/OS/browser environment. A public report is evidence of the recorded run, not a promise that every future environment passes.

For exact local snapshot replay, enter that attempt's `inputs/` directory and run the npm install/browser/test commands there. Public exports omit those duplicate snapshots: the release source and report hashes allow researchers to inspect the published suite. Original early development attempts may predate snapshot capture.

## Status semantics

- `passed`: completed successfully.
- `failed`: assertion mismatch, including an assertion timeout.
- `error`: incomplete execution, such as action timeout, launch failure or interruption. An app defect can also cause an execution error; inspect diagnostics.
- `skipped`: did not execute to completion, such as a missing integration prerequisite or an unstarted test after interruption.

Attempt entries retain original Playwright statuses; run-level errors are shown separately. A nonzero process exit indicates failures, execution errors or integrity mismatches. Preflight errors before a run directory can be created are printed to the terminal. Never convert failed/skipped cases to passes or silently drop them from comparisons.

For traces, use `npx playwright show-trace reports/<run-id>/artifacts/<test>/trace.zip`. See [Playwright reporting](https://playwright.dev/docs/test-reporters) and [trace viewer](https://playwright.dev/docs/trace-viewer).

## Reviewing public evidence

The fixed published report is at `results/experiment-001/evaluation.json`; dashboard QA is in its own JSON. Read `publicExport` for the source report hash and omissions. `automation/export-public.cjs` only exports a full, passing two-engine Phase 1 run. It refuses filtered, skipped or unsuccessful runs so they cannot accidentally replace the specifically advertised 50/50 result. That restriction is a release safeguard, not a research policy to suppress failures: all attempts remain locally recorded, and future unsuccessful benchmark runs need their own reviewed public records.

```sh
node automation/export-public.cjs evaluation reports/<run-id>/report.json results/experiment-001/evaluation.json
node automation/export-public.cjs dashboard reports/<run-id>/report.json results/experiment-001/dashboard-qa.json
```

Review the candidate output before publishing. This exporter uses an allowlist of retained fields and checks for common private paths/credentials; pattern scanning cannot prove absence of every secret. Public research metadata (timestamps, OS/architecture, browser versions and configured timezone) is intentionally retained. No user account name, home directory, browser profile, email or credentials is necessary.

## Research boundaries

The root README explains the post-hoc design and sample-size limits. These tests do not establish installed-Safari behavior, physical-device compatibility, full accessibility, cross-tab live synchronization, browser-restart persistence or security completeness. Corrupt-data tests preserve the corrupt value immediately after load; a subsequent successful app write can replace it. The original manual 9/9 and subjective 96.8/100 are historical records and remain distinct from this suite.
