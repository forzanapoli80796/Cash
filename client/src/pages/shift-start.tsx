import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CashCountForm } from "@/components/cash-count-form";
import { getEmptyCounts, calculateTotal, type CashCounts } from "@/lib/denominations";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Loader2, AlertCircle, LockOpen } from "lucide-react";
import { Link } from "wouter";
import type { Shift } from "@shared/schema";
import { STORES, SHIFT_TYPES } from "@shared/schema";

export default function ShiftStart() {
  const [employeeName, setEmployeeName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [counts, setCounts] = useState<CashCounts>(getEmptyCounts());
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: openShifts, isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/open"],
  });

  const existingShift = openShifts?.find(
    (s) => s.employeeName.toLowerCase() === employeeName.trim().toLowerCase()
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const total = calculateTotal(counts);
      const res = await apiRequest("POST", "/api/shifts/start", {
        employeeName: employeeName.trim(),
        storeName,
        shiftType,
        startBills100: counts.bills100,
        startBills50: counts.bills50,
        startBills20: counts.bills20,
        startBills10: counts.bills10,
        startBills5: counts.bills5,
        startCoins2: counts.coins2,
        startCoins1: counts.coins1,
        startCents50: counts.cents50,
        startCents20: counts.cents20,
        startCents10: counts.cents10,
        startTotal: total.toFixed(2),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/open"] });
      toast({ title: "Kasse geöffnet", description: `Kasse für ${employeeName} wurde erfolgreich geöffnet.` });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      toast({ title: "Name erforderlich", description: "Bitte gib deinen Namen ein.", variant: "destructive" });
      return;
    }
    if (!storeName) {
      toast({ title: "Store erforderlich", description: "Bitte wähle einen Store aus.", variant: "destructive" });
      return;
    }
    if (!shiftType) {
      toast({ title: "Schicht erforderlich", description: "Bitte wähle eine Schicht (Mittag/Abend).", variant: "destructive" });
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
            <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center">
              <LockOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-semibold">Kasse öffnen</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employeeName">Mitarbeitername *</Label>
            <Input
              id="employeeName"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Dein Name"
              required
              data-testid="input-employee-name"
            />
            {existingShift && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Offene Kasse vorhanden</p>
                  <p className="text-xs mt-0.5">
                    Für {existingShift.employeeName} ist die Kasse bereits geöffnet.
                    Bitte schließe diese zuerst unter "Kasse schließen".
                  </p>
                  <Link href="/shift-end">
                    <Button variant="outline" size="sm" className="mt-2" type="button" data-testid="button-goto-shift-end">
                      Zur Kassenschließung
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Store *</Label>
            <Select value={storeName} onValueChange={setStoreName}>
              <SelectTrigger data-testid="select-store">
                <SelectValue placeholder="Store auswählen" />
              </SelectTrigger>
              <SelectContent>
                {STORES.map((store) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Schicht *</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger data-testid="select-shift-type">
                <SelectValue placeholder="Schicht auswählen" />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kassenbestand</CardTitle>
            </CardHeader>
            <CardContent>
              <CashCountForm counts={counts} onChange={handleCountChange} />
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !employeeName.trim() || !storeName || !shiftType || !!existingShift}
            data-testid="button-submit-start"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Kasse öffnen
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
