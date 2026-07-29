# Eval before/after — 2026-07-29T03:22Z

Baseline captured: 2026-07-29T03:22:29.012Z (earliest recorded run per suite).

| Metric | Before | After | Delta |
|---|---|---|---|
| Intent accuracy | 76.7% | 100% | +23.3 pp |
| Intent EN | 87.5% | 100% | +12.5 pp |
| Intent ZH | 55% | 100% | +45 pp |
| E2E agentic struct pass | 84.6% | 96.2% | +11.5 pp |
| E2E agentic judge pass | 100% | 100% | ±0 pp |
| E2E classic struct pass | 80.8% | 92.3% | +11.5 pp |
| E2E classic judge pass | 92.3% | 92.3% | ±0 pp |

## Retrieval (hybrid vs dense, latest run)

- Current (hybrid): recall@6 86.8%, MRR 0.67 (38 queries)
- Dense-only baseline: recall@6 73.7%, MRR 0.63 (38 queries)
- Hybrid vs dense: +13.2 pp recall, +0.05 MRR

_Values are read directly from evals/results/. A — means that suite has not been run on one side yet._
