import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { LockOpen, Lock, ArrowRight } from "lucide-react";
import logoPath from "@assets/FORZA€ASH_black_1770908069639.jpg";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex justify-center mb-6">
            <img src={logoPath} alt="FORZA CASH" className="w-full max-w-xs object-contain" />
          </div>
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-bold">Willkommen</h2>
            <p className="text-muted-foreground text-sm">
              Erfasse den Kassenbestand beim Öffnen und Schließen der Kasse.
            </p>
          </div>

          <Link href="/shift-start">
            <Card className="hover-elevate active-elevate-2 cursor-pointer overflow-visible">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <LockOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Kasse öffnen</h3>
                      <p className="text-xs text-muted-foreground">Kassenbestand erfassen</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shift-end">
            <Card className="hover-elevate active-elevate-2 cursor-pointer overflow-visible">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Kasse schließen</h3>
                      <p className="text-xs text-muted-foreground">Endbestand & Abgleich</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <div className="pt-4 text-center">
            <Link href="/admin/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-admin">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
