# Experiment 001 — public automated evidence

The original [research README](../../Experiments/001-todo-gpt6/README.md) is preserved unchanged. It records one GPT-6 Astra High / ChatGPT Work generation, a reported 7 minutes 24 seconds, nine manual checks, and an evaluator-assigned 96.8/100. Those historical claims are distinct from the subsequent browser evaluation.

| Public record | Meaning |
|---|---|
| [evaluation.json](evaluation.json) | 50/50 application checks: 25 cases in each of Chromium and WebKit |
| [dashboard-qa.json](dashboard-qa.json) | 20/20 checks of the dashboard and report viewer; not app benchmark results |
| [provenance.json](provenance.json) | Preserved research/source provenance and release verification references |

Each report contains individual test outcomes, timing, browser metadata, code hashes, run timestamps and the SHA-256 of its local source report. Test counts describe cases within this suite, not independent model generations. Neither automated result changes or validates the subjective 96.8/100 as an objective score.

## Preservation

The experiment README was missing from the transferred working folder. It was restored byte-for-byte from existing public GitHub commit `713c528179c364f44c5c9bc717b0d70a80fdd685`; it was not reconstructed from memory. The local app.js, index.html, styles.css and preview.png were also verified to match that public commit. The original source, preview and research README are included unchanged. The baseline SHA-256 manifest now protects all five files.

The original README's statement that contemporaneous agent-reported automation was not independently audited is part of that historical record. The later Phase 1 results here refer to the new Playwright suite, not a retrospective audit of unspecified original tests.

## Test development and release verification

The first Phase 1 development attempt recorded 47 passes, one assertion failure and two execution errors (Playwright grouped these as three failed checks). These were test-interaction problems: the filter test waited on a checkbox removed by the app's correct rerender, and WebKit's End key left editor text selected. The tests were corrected to assert the resulting filter state and collapse the selection with ArrowRight. The app was unchanged. Subsequent full runs passed all 50 checks. The unsuccessful attempt's raw logs and traces remain in the private working folder; they are not hidden by overwriting its run directory.

The published reports are from the final clean release-validation execution on October 8, 2026. See their timestamps and provenance.json for exact identities. The release adds three public-export checks to the original 18 Node logic checks, for 21 Node checks; these are software QA, not part of the 50 app checks.

## Privacy and omissions

The JSON files are explicitly labeled public exports, not untouched raw Playwright output. Their publicExport fields enumerate omissions. Local server URLs, screenshot attachment paths, raw logs, traces and duplicate source snapshots are excluded. No individual test result, error, duration or source hash is invented. These complete passing records have no failure diagnostics to redact.

Generic OS/architecture, browser versions, configured locale/timezone, timestamps and code hashes are intentional research metadata. The preserved MIT author attribution and public repository identity remain. Private account identifiers, absolute home paths, credentials, browser profiles and saved evaluator records are excluded.

Use the [reproduction guide](../../docs/REPRODUCING.md) to rerun. Compare the suite/source hashes when comparing results; changed tests or environments can produce different outcomes. Reports are structurally validated evidence, not cryptographically authenticated proof of independent replication.
