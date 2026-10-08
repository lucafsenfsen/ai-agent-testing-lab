# PR #1 review and replication

Reviewed original PR head `34e20b5797522cb8247a048061963039a50d33ba` against main `713c528179c364f44c5c9bc717b0d70a80fdd685`. This is a fresh source audit and local replication by the coding assistant, not certification by an external research organization. No merge, deployment, Pages configuration change, or main-branch write is part of the review.

## Findings and fixes

1. **Contradictory automated results (medium):** the viewer and exporter accepted a test labeled passed even when its attempt status was failed. The exporter also lacked complete checks for exit code, retries, protocol and original-source hashes. Validation now rejects contradictory attempts and the exporter requires a known complete protocol, zero exit code, matching before/after baseline hashes, and exactly one successful attempt per case. Regression tests exercise these rejected reports; genuine historical exports remain compatible.
2. **Local-server file exposure (medium):** a synthetic symlink under the served directory exposed a file outside the project, and arbitrary Host headers were accepted. The server now checks Host and Origin, serves only release-allowlisted files and normalized report JSON, rejects symlinks, accepts GET/HEAD only, and sets `nosniff`. Four regression cases cover allowed resources and access restrictions. No actual private files or credentials were used in the exploit check.
3. **Blank dashboard from certain URL fragments (medium):** inherited object keys such as `constructor` were treated as valid sections, hiding every view. Navigation now checks own keys and falls back to Overview. Both engines test this behavior.
4. **Reproduction/documentation drift:** checkout instructions now explain the unmerged review branch and exact historical commit. Protocol `phase1-todo-v1.1` identifies the revised infrastructure and extra software tests. Publication instructions no longer claim the authorized branch push never happened. New evidence is separate; original research and public results are retained.

## Evidence verification

The original 50/50 application and 20/20 dashboard public reports were reproduced byte-for-byte from their retained raw normalized reports using the original exporter. Every case's title, engine, status, attempt count and duration also matched the retained raw Playwright JSON. The original source/suite hashes matched the reviewed PR files before fixes, and the original release manifest matched every payload file. A fresh dependency install and baseline run independently reproduced 50 app, 20 dashboard and 21 Node passes with no failures or skips.

**Verdict: PASS after fixes.** The revised suite passed 50/50 application, 24/24 dashboard and 27/27 Node logic/security checks, with no failures or skips. The dependency advisory audit returned zero known vulnerabilities. Actual results are recorded separately in [verification.json](../results/pr1-review/verification.json), [evaluation.json](../results/pr1-review/evaluation.json) and [dashboard-qa.json](../results/pr1-review/dashboard-qa.json). These are local executions on the recorded Mac environment, not CI results or new model generations. Run IDs, timings and source hashes identify each execution. The application test file is unchanged; extra cases test the infrastructure and website.

All five files in `Experiments/001-todo-gpt6/`, including its research README and preview, remain byte-for-byte identical to main. The 96.8/100 score is mathematically consistent with the reported weights but remains subjective. The manual 9/9 and generation time are historical claims, not independently remeasured here.

## All 31 original changed files

| File | Review performed |
|---|---|
| `.gitignore` | Dependency, local-report, workspace, secret and temporary-file exclusions |
| `PUBLICATION.md` | Allowlist workflow, baseline reconciliation, attribution and manual publication boundaries |
| `README.md` | Installation, score arithmetic, research claims, privacy and limitations |
| `RELEASE-MANIFEST.json` | Every payload path, length and SHA-256; regenerated after review fixes |
| `app.js` | Full UI controller, safe text rendering, score persistence, import/export, navigation; fixed fragment handling |
| `automated-reports.js` | Report parsing/rendering, escaped imports, request races, offline loading and score isolation |
| `automation/export-public.cjs` | Full-run gating, redaction, source-report hash, field retention; tightened evidence consistency |
| `automation/lab.sh` | Quoting, optional runtime discovery and supported commands; no downloads or uploads |
| `automation/original-app.sha256.json` | All five baseline hashes checked against public main |
| `automation/prepare-release.py` | Allowlist, traversal/symlink rejection, privacy patterns, preservation and deterministic archive metadata |
| `automation/report.cjs` | Per-test classification, summary arithmetic and latest-pointer writes |
| `automation/reporter.cjs` | Real Playwright lifecycle, attempts, errors, metadata and attachments |
| `automation/run.cjs` | Local server lifecycle, subprocess execution, failures, snapshots and before/after app integrity |
| `automation/server.cjs` | Routing, MIME types and file access; fixed symlink/host exposure and restricted served files |
| `docs/REPRODUCING.md` | Commands, protocol/count accuracy, replay, skips, error semantics and evidence preservation |
| `index.html` | Existing forms/storage UI, deferred script ordering, six views and relative assets |
| `package-lock.json` | Pinned three-package dependency graph and public-registry integrity metadata |
| `package.json` | Minimal development dependency, Node version and nonpublishing scripts |
| `playwright.config.cjs` | Two engines, isolation, one worker, no retries, forbidOnly, timeouts and real reporters |
| `release-files.txt` | Exact publication allowlist; no local dependencies, logs or credentials |
| `report-format.js` | Imported schema/summary safety; fixed attempt/status contradictions |
| `results/experiment-001/README.md` | Historical/prospective distinctions, disclosed development failures and report omissions |
| `results/experiment-001/dashboard-qa.json` | Every individual attempt matched raw evidence; source hashes and counts verified |
| `results/experiment-001/evaluation.json` | Every individual attempt matched raw evidence; source hashes and counts verified |
| `results/experiment-001/provenance.json` | Original Git blob/hashes, run identities, totals and local unit-log hash |
| `styles.css` | Full stylesheet and new report styles; responsive/overflow behavior |
| `tests/core.test.cjs` | Scoring, valid/invalid records, persistence-format arithmetic, comparisons and CSV injection protection |
| `tests/e2e/dashboard.spec.cjs` | Real CRUD, storage, comparisons, downloads, safe report imports and responsive checks; added project-subpath regression |
| `tests/e2e/fixtures.cjs` | Real browser metadata and uncaught-page-error assertions in isolated contexts |
| `tests/e2e/todo.spec.cjs` | All 25 observable application cases, boundary/fault injection, persistence and responsive operations |
| `tests/report.test.cjs` | Failure/error classification, malformed reports and public-export safeguards |

## Remaining limits

- No credentials or private account paths were found in the reviewed release payload. Intentional public repository identity, MIT copyright attribution, generic environment metadata and clearly synthetic security fixtures remain. Scans and code review cannot prove absence of every possible secret or vulnerability; existing public Git history is not rewritten.
- Dependency advisory checks are point-in-time checks, not a complete security audit. The test system executes trusted local code and is not a sandbox for hostile generated applications.
- Chromium/WebKit and viewport tests do not establish real-device, installed-Safari, Firefox, full accessibility, performance or cross-platform correctness. The original app's documented storage limitations remain.
- Public JSON has provenance hashes but no third-party signature. Historical generation timing and manual judgments cannot be independently recovered from browser tests.
- The GitHub Pages project path is exercised locally with the real assets and evidence. A read-only GitHub check confirmed Pages publishes from the root of `main`. No settings were changed. Merging into main can therefore publish the website through that existing configuration; this review does not deploy or certify GitHub's production build service.

Reproduce with the commands in [REPRODUCING.md](REPRODUCING.md). Preserve the historical reports, inspect the revision's source hashes, and keep automatic observations separate from subjective evaluator scores.
