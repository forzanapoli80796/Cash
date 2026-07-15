import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatEuro, DENOMINATIONS, getWithdrawalInfo } from "@/lib/denominations";
import { ArrowLeft, Download, Loader2, Eye, LogOut, Clock, Filter, X, Trash2, DatabaseBackup, Github } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Shift } from "@shared/schema";
import { STORES } from "@shared/schema";

function getShiftEndCounts(shift: Shift): Record<string, number> {
  return {
    bills100: shift.endBills100 ?? 0,
    bills50: shift.endBills50 ?? 0,
    bills20: shift.endBills20 ?? 0,
    bills10: shift.endBills10 ?? 0,
    bills5: shift.endBills5 ?? 0,
    coins2: shift.endCoins2 ?? 0,
    coins1: shift.endCoins1 ?? 0,
    cents50: shift.endCents50 ?? 0,
    cents20: shift.endCents20 ?? 0,
    cents10: shift.endCents10 ?? 0,
  };
}

export default function Admin() {
  const [, navigate] = useLocation();
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null);
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shifts, isLoading, error } = useQuery<Shift[]>({
    queryKey: ["/api/admin/shifts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: backupTimestamps, refetch: refetchTimestamps } = useQuery<{ json: string | null; github: string | null }>({
    queryKey: ["/api/admin/backup/timestamps"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: shifts !== null && !error,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/open"] });
      toast({ title: "Gelöscht", description: "Eintrag wurde erfolgreich gelöscht." });
      setDeleteShift(null);
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const githubBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backup/github");
      return res.json();
    },
    onSuccess: (data) => {
      refetchTimestamps();
      toast({ title: "GitHub-Backup erfolgreich", description: `Datei: ${data.filename}` });
    },
    onError: (err: Error) => {
      toast({ title: "GitHub-Backup fehlgeschlagen", description: err.message, variant: "destructive" });
    },
  });

  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    return shifts.filter((s) => {
      if (filterStore !== "all" && s.storeName !== filterStore) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterEmployee && !s.employeeName.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
      return true;
    });
  }, [shifts, filterStore, filterStatus, filterEmployee]);

  const hasActiveFilters = filterStore !== "all" || filterStatus !== "all" || filterEmployee !== "";

  useEffect(() => {
    if (shifts === null || error) {
      navigate("/admin/login");
    }
  }, [shifts, error, navigate]);

  if (shifts === null || error) {
    return null;
  }

  const handleExportCSV = () => {
    window.open("/api/admin/shifts/csv", "_blank");
  };

  const handleDownloadJSON = () => {
    window.open("/api/admin/backup/json", "_blank");
    setTimeout(() => refetchTimestamps(), 1000);
  };

  const clearFilters = () => {
    setFilterStore("all");
    setFilterStatus("all");
    setFilterEmployee("");
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <h1 className="font-semibold">Admin - Kassenübersicht</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-csv-export">
              <Download className="mr-2 h-4 w-4" />
              CSV Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-logout"
              onClick={async () => {
                try {
                  await apiRequest("POST", "/api/admin/logout");
                } catch (e) {}
                queryClient.clear();
                navigate("/admin/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Kassenübersicht</TabsTrigger>
              <TabsTrigger value="backup" data-testid="tab-backup">Backup</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter
                    </div>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                        <X className="mr-1 h-3 w-3" />
                        Zurücksetzen
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Store</Label>
                      <Select value={filterStore} onValueChange={setFilterStore}>
                        <SelectTrigger data-testid="filter-store">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Stores</SelectItem>
                          {STORES.map((store) => (
                            <SelectItem key={store} value={store}>{store}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger data-testid="filter-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="open">Offen</SelectItem>
                          <SelectItem value="closed">Geschlossen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mitarbeiter</Label>
                      <Input
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        placeholder="Name suchen..."
                        data-testid="filter-employee"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredShifts.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Geöffnet</TableHead>
                            <TableHead>Geschlossen</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Schicht</TableHead>
                            <TableHead>Mitarbeiter</TableHead>
                            <TableHead className="text-right">Start</TableHead>
                            <TableHead className="text-right">Ende</TableHead>
                            <TableHead className="text-right">Barumsatz</TableHead>
                            <TableHead className="text-right">Barentnahme</TableHead>
                            <TableHead>Entnahme-Empfehlung</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredShifts.map((shift) => {
                            const withdrawalInfo = shift.endTotal != null
                              ? getWithdrawalInfo(getShiftEndCounts(shift))
                              : null;
                            return (
                              <TableRow key={shift.id} data-testid={`row-shift-${shift.id}`}>
                                <TableCell className="text-sm whitespace-nowrap">{formatDate(shift.startTime)}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{formatDate(shift.endTime)}</TableCell>
                                <TableCell className="font-medium">{shift.storeName}</TableCell>
                                <TableCell className="text-sm">{shift.shiftType}</TableCell>
                                <TableCell className="font-medium">{shift.employeeName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatEuro(parseFloat(shift.startTotal))}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {shift.endTotal ? formatEuro(parseFloat(shift.endTotal)) : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {shift.cashRevenue ? formatEuro(parseFloat(shift.cashRevenue)) : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {shift.cashWithdrawal ? formatEuro(parseFloat(shift.cashWithdrawal)) : "—"}
                                </TableCell>
                                <TableCell>
                                  {withdrawalInfo ? (
                                    <div className="space-y-0.5">
                                      {withdrawalInfo.items.filter(i => i.withdraw > 0).length > 0 ? (
                                        <>
                                          {withdrawalInfo.items.filter(i => i.withdraw > 0).map((item) => (
                                            <div key={item.label} className="text-xs whitespace-nowrap">
                                              {item.label}: <span className="font-mono font-medium">{item.withdraw} St.</span>
                                            </div>
                                          ))}
                                          <div className="text-xs font-semibold text-primary pt-0.5">
                                            = {formatEuro(withdrawalInfo.totalWithdrawal)}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Keine</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {shift.status === "open" ? (
                                    <Badge variant="secondary">Offen</Badge>
                                  ) : (
                                    <Badge variant="outline">Geschlossen</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDetailShift(shift)}
                                      data-testid={`button-detail-${shift.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteShift(shift)}
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-${shift.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{hasActiveFilters ? "Keine Einträge für die gewählten Filter." : "Keine Einträge in den letzten 14 Tagen."}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="backup" className="space-y-4 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DatabaseBackup className="h-5 w-5 text-primary" />
                    Datenbank-Backup
                  </CardTitle>
                  <CardDescription>
                    Alle Schichtdaten der letzten 14 Tage als JSON-Datei herunterladen – Stores, Mitarbeiter, Kassenbestände, Barumsätze und Barentnahmen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {backupTimestamps?.json && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>Letzter Backup: <span className="font-medium text-foreground">{backupTimestamps.json}</span></span>
                    </div>
                  )}
                  <Button
                    onClick={handleDownloadJSON}
                    className="gap-2"
                    data-testid="button-download-json"
                  >
                    <Download className="h-4 w-4" />
                    Backup herunterladen
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Github className="h-5 w-5" />
                    GitHub-Backup
                  </CardTitle>
                  <CardDescription>
                    Den kompletten App-Code per Git-Push ins GitHub-Repo sichern –{" "}
                    <a
                      href="https://github.com/forzanapoli80796/Cash"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      github.com/forzanapoli80796/Cash
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {backupTimestamps?.github && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>Letzter Backup: <span className="font-medium text-foreground">{backupTimestamps.github}</span></span>
                    </div>
                  )}
                  <Button
                    variant="default"
                    className="gap-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    onClick={() => githubBackupMutation.mutate()}
                    disabled={githubBackupMutation.isPending}
                    data-testid="button-github-backup"
                  >
                    {githubBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                    {githubBackupMutation.isPending ? "Wird gesichert..." : "Jetzt auf GitHub sichern"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!detailShift} onOpenChange={() => setDetailShift(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kassendetails — {detailShift?.employeeName}</DialogTitle>
          </DialogHeader>
          {detailShift && <ShiftDetail shift={detailShift} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteShift} onOpenChange={() => setDeleteShift(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eintrag löschen</DialogTitle>
            <DialogDescription>
              Soll der Eintrag von <span className="font-semibold">{deleteShift?.employeeName}</span> ({deleteShift?.storeName}, {formatDate(deleteShift?.startTime ?? null)}) wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteShift(null)} data-testid="button-cancel-delete">
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteShift && deleteMutation.mutate(deleteShift.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShiftDetail({ shift }: { shift: Shift }) {
  const denomLabels = DENOMINATIONS.map((d) => ({
    key: d.key,
    label: d.label,
    value: d.value,
  }));

  const startPrefix = "start";
  const endPrefix = "end";

  const getCount = (shift: Shift, prefix: string, key: string): number => {
    const fieldMap: Record<string, string> = {
      bills100: `${prefix}Bills100`,
      bills50: `${prefix}Bills50`,
      bills20: `${prefix}Bills20`,
      bills10: `${prefix}Bills10`,
      bills5: `${prefix}Bills5`,
      coins2: `${prefix}Coins2`,
      coins1: `${prefix}Coins1`,
      cents50: `${prefix}Cents50`,
      cents20: `${prefix}Cents20`,
      cents10: `${prefix}Cents10`,
    };
    const field = fieldMap[key] as keyof Shift;
    return (shift[field] as number) ?? 0;
  };

  const withdrawalInfo = shift.endTotal != null
    ? getWithdrawalInfo(getShiftEndCounts(shift))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Geöffnet</span>
          <p className="font-medium">
            {new Date(shift.startTime).toLocaleString("de-DE")}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Geschlossen</span>
          <p className="font-medium">
            {shift.endTime ? new Date(shift.endTime).toLocaleString("de-DE") : "—"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Denomination</TableHead>
              <TableHead className="text-right">Start</TableHead>
              <TableHead className="text-right">Ende</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {denomLabels.map((d) => (
              <TableRow key={d.key}>
                <TableCell className="text-sm">{d.label}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {getCount(shift, startPrefix, d.key)} ({formatEuro(getCount(shift, startPrefix, d.key) * d.value)})
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {shift.endTotal != null
                    ? `${getCount(shift, endPrefix, d.key)} (${formatEuro(getCount(shift, endPrefix, d.key) * d.value)})`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>Gesamt</TableCell>
              <TableCell className="text-right font-mono">{formatEuro(parseFloat(shift.startTotal))}</TableCell>
              <TableCell className="text-right font-mono">
                {shift.endTotal ? formatEuro(parseFloat(shift.endTotal)) : "—"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md text-sm flex-wrap">
        <span className="text-muted-foreground">Store</span>
        <span className="font-semibold">{shift.storeName}</span>
      </div>

      <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md text-sm flex-wrap">
        <span className="text-muted-foreground">Schicht</span>
        <span className="font-semibold">{shift.shiftType}</span>
      </div>

      {shift.cashRevenue && (
        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md text-sm flex-wrap">
          <span className="text-muted-foreground">Barumsatz</span>
          <span className="font-semibold font-mono">{formatEuro(parseFloat(shift.cashRevenue))}</span>
        </div>
      )}

      {shift.cashWithdrawal && (
        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md text-sm flex-wrap">
          <span className="text-muted-foreground">Barentnahme</span>
          <span className="font-semibold font-mono">{formatEuro(parseFloat(shift.cashWithdrawal))}</span>
        </div>
      )}

      {withdrawalInfo && withdrawalInfo.items.filter(i => i.withdraw > 0).length > 0 && (
        <div className="p-3 bg-muted/50 rounded-md space-y-2">
          <span className="text-sm text-muted-foreground font-medium">Entnahme-Empfehlung</span>
          {withdrawalInfo.items.filter(i => i.withdraw > 0).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-sm flex-wrap">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono font-medium">{item.withdraw} Stück</span>
            </div>
          ))}
          <div className="pt-1 border-t flex items-center justify-between gap-2 text-sm flex-wrap">
            <span className="font-medium">Gesamt</span>
            <span className="font-semibold font-mono text-primary">{formatEuro(withdrawalInfo.totalWithdrawal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
