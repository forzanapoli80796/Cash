import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DENOMINATIONS, formatEuro, calculateTotal, type CashCounts } from "@/lib/denominations";
import { Banknote, Coins } from "lucide-react";

interface CashCountFormProps {
  counts: CashCounts;
  onChange: (key: string, value: number) => void;
  readOnly?: boolean;
}

export function CashCountForm({ counts, onChange, readOnly = false }: CashCountFormProps) {
  const total = calculateTotal(counts);
  const bills = DENOMINATIONS.filter((d) => d.value >= 5);
  const coins = DENOMINATIONS.filter((d) => d.value < 5);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Banknote className="h-4 w-4" />
          <span>Scheine</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bills.map((denom) => (
            <DenominationField
              key={denom.key}
              label={denom.label}
              value={counts[denom.key] || 0}
              subtotal={(counts[denom.key] || 0) * denom.value}
              onChange={(val) => onChange(denom.key, val)}
              readOnly={readOnly}
              testId={`input-${denom.key}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Coins className="h-4 w-4" />
          <span>Münzen</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {coins.map((denom) => (
            <DenominationField
              key={denom.key}
              label={denom.label}
              value={counts[denom.key] || 0}
              subtotal={(counts[denom.key] || 0) * denom.value}
              onChange={(val) => onChange(denom.key, val)}
              readOnly={readOnly}
              testId={`input-${denom.key}`}
            />
          ))}
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Gesamt</span>
            <span className="text-2xl font-bold text-primary" data-testid="text-total">
              {formatEuro(total)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DenominationField({
  label,
  value,
  subtotal,
  onChange,
  readOnly,
  testId,
}: {
  label: string;
  value: number;
  subtotal: number;
  onChange: (val: number) => void;
  readOnly: boolean;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          value={value || ""}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(0);
              return;
            }
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed) && parsed >= 0) {
              onChange(parsed);
            }
          }}
          readOnly={readOnly}
          className="text-center font-mono"
          data-testid={testId}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-right font-mono">
          {formatEuro(subtotal)}
        </span>
      </div>
    </div>
  );
}
