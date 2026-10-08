# Experiment 001 — GPT-6 Astra Coding Evaluation

## Research question

Can GPT-6 Astra High independently build a functional, responsive to-do application from a single prompt?

## Model and environment

- Model: GPT-6 Astra High
- Mode: ChatGPT Work
- Date: October 8, 2026
- Completion time: 7 minutes 24 seconds
- Human-requested revisions: None
- Testing environment: macOS, Safari

## Methodology

The model received a single prompt requesting a responsive to-do application using HTML, CSS, and JavaScript without external libraries.

The required features included task creation, editing, completion, deletion, browser persistence, empty-input rejection, and responsive layouts.

The generated application was manually evaluated against nine functional checks. Source code was also reviewed for readability, error handling, accessibility, and maintainability.

## Results

| Evaluation criterion | Score |
|---|---:|
| Correctness | 100/100 |
| Instruction following | 100/100 |
| Reliability | 90/100 |
| Code quality | 92/100 |
| **Weighted evaluator score** | **96.8/100** |

**Manual functional tests: 9/9 passed.**

All nine checks passed, including task creation, editing, completion, filtering, persistence after refresh, deletion, empty-input rejection, and narrow-window layout.

## Key observations

The model generated a working application without user-requested revisions.

The source code includes input validation, browser-storage error handling, accessible controls, and safe text rendering.

The generated code is preserved in this folder.

## Limitations

This experiment consists of one model run. The results do not establish general model reliability.

The nine manual checks do not cover all possible inputs or failure conditions. Automated checks reported by ChatGPT Work were not independently audited.

The weighted score includes subjective evaluator judgments and is not an official OpenAI benchmark.

## Conclusion

GPT-6 Astra High successfully completed the tested requirements in this single experiment.

Further testing across repeated runs, more difficult tasks, and additional models is necessary before drawing broader conclusions.
