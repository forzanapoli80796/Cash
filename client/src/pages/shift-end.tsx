import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CashCountForm } from "@/components/cash-count-form";
import { getEmptyCounts, calculateTotal, formatEuro, getWithdrawalInfo, type CashCounts } from "@/lib/denominations";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Loader2, AlertTriangle, ArrowDownCircle, AlertCircle, Lock, TrendingUp, TrendingDown, Equal, Ban } from "lucide-react";
import { Link } from "wouter";
import type { Shift } from "@shared/schema";

export default function ShiftEnd() {
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [counts, setCounts] = useState<CashCounts>(getEmptyCounts());
  const [cashRevenue, setCashRevenue] = useState("");
  const [cashWithdrawal, setCashWithdrawal] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: openShifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/open"],
  });

  const selectedShift = openShifts?.find((s) => s.id.toString() === selectedShiftId);
  const startTotal = selectedShift ? parseFloat(selectedShift.startTotal) : 0;
  const endTotal = calculateTotal(counts);

  const parsedRevenue = useMemo(() => {
    const cleaned = cashRevenue.replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [cashRevenue]);

  const parsedWithdrawal = useMemo(() => {
    const cleaned = cashWithdrawal.replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [cashWithdrawal]);

  const expectedEnd = startTotal + parsedRevenue - parsedWithdrawal;
  const difference = endTotal - startTotal;
  const deviation = endTotal - expectedEnd;

  const totalsMatch = Math.abs(deviation) < 0.005;
  const hasWarning = parsedRevenue > 0 && difference <= 0;

  const withdrawal = getWithdrawalInfo(counts);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/shifts/${selectedShiftId}/end`, {
        endBills100: counts.bills100,
        endBills50: counts.bills50,
        endBills20: counts.bills20,
        endBills10: counts.bills10,
        endBills5: counts.bills5,
        endCoins2: counts.coins2,
        endCoins1: counts.coins1,
        endCents50: counts.cents50,
        endCents20: counts.cents20,
        endCents10: counts.cents10,
        endTotal: endTotal.toFixed(2),
        cashRevenue: parsedRevenue.toFixed(2),
        cashWithdrawal: parsedWithdrawal.toFixed(2),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/open"] });
      toast({ title: "Kasse geschlossen", description: "Kasse wurde erfolgreich geschlossen." });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId) {
      toast({ title: "Kasse wählen", description: "Bitte wähle eine offene Kasse.", variant: "destructive" });
      return;
    }
    if (!cashRevenue.trim()) {
      toast({ title: "Barumsatz erforderlich", description: "Bitte gib den Barumsatz ein.", variant: "destructive" });
      return;
    }
    if (!totalsMatch) {
      toast({ title: "Abgleich fehlgeschlagen", description: "Endbestand stimmt nicht mit dem erwarteten Endbestand überein.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const handleCountChange = (key: string, value: number) => {
    setCounts((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-orange-500/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="font-semibold">Kasse schließen</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
          <div className="space-y-2">
            <Label>Offene Kasse wählen *</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade offene Kassen...
              </div>
            ) : openShifts && openShifts.length > 0 ? (
              <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                <SelectTrigger data-testid="select-shift">
                  <SelectValue placeholder="Kasse auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {openShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id.toString()}>
                      {shift.employeeName} ({shift.storeName}, {shift.shiftType}) — Start: {formatEuro(parseFloat(shift.startTotal))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Keine offenen Kassen vorhanden. Öffne zuerst eine Kasse.</p>
              </div>
            )}

            {selectedShift && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                <span>Startbestand:</span>
                <span className="font-semibold text-foreground">{formatEuro(startTotal)}</span>
                <span className="text-xs">
                  (geöffnet {new Date(selectedShift.startTime).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })})
                </span>
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kassenbestand</CardTitle>
            </CardHeader>
            <CardContent>
              <CashCountForm counts={counts} onChange={handleCountChange} />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="cashRevenue">Barumsatz dieser Schicht (€) *</Label>
            <Input
              id="cashRevenue"
              type="text"
              inputMode="decimal"
              value={cashRevenue}
              onChange={(e) => setCashRevenue(e.target.value)}
              placeholder="0,00"
              required
              data-testid="input-cash-revenue"
            />
            {cashRevenue && (
              <p className="text-xs text-muted-foreground">
                Erkannt: {formatEuro(parsedRevenue)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashWithdrawal">Barentnahme (€)</Label>
            <Input
              id="cashWithdrawal"
              type="text"
              inputMode="decimal"
              value={cashWithdrawal}
              onChange={(e) => setCashWithdrawal(e.target.value)}
              placeholder="0,00"
              data-testid="input-cash-withdrawal"
            />
            {cashWithdrawal && (
              <p className="text-xs text-muted-foreground">
                Erkannt: {formatEuro(parsedWithdrawal)}
              </p>
            )}
          </div>

          {selectedShift && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Abgleich & Berechnung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CalcRow
                  icon={<Equal className="h-4 w-4" />}
                  label="Differenz (Ende - Start)"
                  value={formatEuro(difference)}
                  highlight={difference > 0 ? "positive" : difference < 0 ? "negative" : "neutral"}
                />
                <CalcRow
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Erwarteter Endbestand"
                  value={`${formatEuro(startTotal)} + ${formatEuro(parsedRevenue)} - ${formatEuro(parsedWithdrawal)} = ${formatEuro(expectedEnd)}`}
                  highlight="neutral"
                />
                <CalcRow
                  icon={deviation >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  label="Abweichung"
                  value={formatEuro(deviation)}
                  highlight={Math.abs(deviation) < 0.005 ? "neutral" : deviation > 0 ? "positive" : "negative"}
                />

                {!totalsMatch && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mt-2">
                    <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Abgleich fehlgeschlagen</p>
                      <p className="text-xs mt-0.5">
                        Endbestand ({formatEuro(endTotal)}) stimmt nicht mit dem erwarteten Endbestand ({formatEuro(expectedEnd)}) überein.
                        Abweichung: {formatEuro(Math.abs(deviation))}
                      </p>
                    </div>
                  </div>
                )}

                {totalsMatch && hasWarning && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Hinweis</p>
                      <p className="text-xs mt-0.5">
                        Barumsatz ist positiv ({formatEuro(parsedRevenue)}), aber es ist nicht mehr in der Kasse als zu Beginn. Bitte überprüfen.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedShift && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Entnahme-Empfehlung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {withdrawal.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground">{item.label} (max. {item.keep} behalten)</span>
                    {item.withdraw > 0 ? (
                      <Badge variant="secondary" className="font-mono">
                        Entnehmen: {item.withdraw} Stück
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        Keine Entnahme
                      </Badge>
                    )}
                  </div>
                ))}
                {withdrawal.totalWithdrawal > 0 && (
                  <div className="pt-2 border-t mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium">Entnahme gesamt</span>
                    <span className="font-semibold text-primary">{formatEuro(withdrawal.totalWithdrawal)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !selectedShiftId || !cashRevenue.trim() || !totalsMatch}
            data-testid="button-submit-end"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Kasse schließen
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}

function CalcRow({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight: "positive" | "negative" | "neutral";
}) {
  const colorClass =
    highlight === "positive"
      ? "text-green-600 dark:text-green-400"
      : highlight === "negative"
      ? "text-destructive"
      : "text-foreground";

  return (
    <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`font-semibold font-mono ${colorClass}`}>{value}</span>
    </div>
  );
}
