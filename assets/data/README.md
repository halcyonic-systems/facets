# Pinned data vintages

Author-attachable CSVs for the Data-mode front door. Each file is a **pinned
vintage**: retrieved once, dated in the filename, never silently refreshed —
a re-pull is a new file. The CSV itself stays clean (headers + rows, no
comment lines); provenance lives here.

## fed-h41-vintage-2026-08-11.csv

Two H.4.1 weekly series for the Federal Reserve example, retrieved from FRED
on 2026-08-11, window 2023-01-04 → 2026-08-05 (188 Wednesday observations,
no gaps), millions of USD, not seasonally adjusted:

| column | FRED series | H.4.1 line | binds to (federal-reserve.sl flow) |
|---|---|---|---|
| `WDTGAL` | [WDTGAL](https://fred.stlouisfed.org/series/WDTGAL) — U.S. Treasury, General Account, Wednesday level | Deposits with F.R. Banks, other than reserve balances | `"U.S. Treasury" -> "Balance Sheet"` — TGA deposits |
| `RESPPLLOPNWW` | [RESPPLLOPNWW](https://fred.stlouisfed.org/series/RESPPLLOPNWW) — Earnings remittances due to the U.S. Treasury, Wednesday level | Earnings remittances due to the U.S. Treasury | `"Balance Sheet" -> "U.S. Treasury"` — remittances |

Both are Wednesday **levels** so the dates align (WTREGEN is the week-average
twin of WDTGAL; not used). Two honesty notes the demo should say aloud rather
than smooth over:

- These are **levels of balance-sheet lines, not flow rates**. Binding a level
  series to a flow is a modeling decision the author owns; the sheet observes,
  it does not bless.
- `RESPPLLOPNWW` is **negative** across this whole window (the post-2022
  deferred asset: the Fed's interest expense exceeds portfolio income, so
  remittances are suspended and the liability line runs negative). The data
  contradicting the flow's plain reading is a feature of honest data.
