import { DENOMINATIONS, calculateTotal, formatEuro } from "@shared/schema";

export { DENOMINATIONS, calculateTotal, formatEuro };

export type CashCounts = Record<string, number>;

export function getEmptyCounts(): CashCounts {
  const counts: CashCounts = {};
  for (const d of DENOMINATIONS) {
    counts[d.key] = 0;
  }
  return counts;
}

export function getWithdrawalInfo(endCounts: CashCounts) {
  const rules = [
    { key: "bills100", label: "100 € Scheine", keep: 0 },
    { key: "bills50", label: "50 € Scheine", keep: 2 },
    { key: "bills20", label: "20 € Scheine", keep: 10 },
    { key: "bills10", label: "10 € Scheine", keep: 10 },
  ];

  let totalWithdrawal = 0;
  const items = rules.map((rule) => {
    const available = endCounts[rule.key] || 0;
    const excess = Math.max(0, available - rule.keep);
    const denomValue = DENOMINATIONS.find((d) => d.key === rule.key)!.value;
    if (excess > 0) {
      totalWithdrawal += excess * denomValue;
    }
    return {
      label: rule.label,
      keep: rule.keep,
      available,
      withdraw: excess,
    };
  });

  return { items, totalWithdrawal };
}
