# Eval summary — 2026-07-09T23:30Z

## Retrieval tuning sweep — dense

**Recall@k**

| k | all | en | zh |
|---|---|---|---|
| 3 | 73.7% | 100% | 0% |
| 4 | 73.7% | 100% | 0% |
| 6 | 73.7% | 100% | 0% |
| 8 | 73.7% | 100% | 0% |

**First-hit survival by similarity threshold**

| threshold | all | en | zh |
|---|---|---|---|
| 0.2 | 100% | 100% | 0% |
| 0.25 | 100% | 100% | 0% |
| 0.3 | 100% | 100% | 0% |
| 0.35 | 96.4% | 96.4% | 0% |
| 0.4 | 96.4% | 96.4% | 0% |

_Cost figures are output-token estimates (chars/4 × model price); real token accounting lands with the llm_calls observability work._