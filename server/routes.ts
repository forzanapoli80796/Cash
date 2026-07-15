import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertShiftStartSchema, endShiftSchema } from "@shared/schema";
import session from "express-session";
import { fromZodError } from "zod-validation-error";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const ADMIN_USER = "admin";
const ADMIN_PASS = "321!";

declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ message: "Nicht autorisiert" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "kassenführung-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
      },
    })
  );

  let lastCleanup = 0;
  const CLEANUP_INTERVAL = 60 * 60 * 1000;
  app.use(async (_req, _res, next) => {
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      try {
        await storage.deleteOldShifts();
      } catch (e) {
      }
    }
    next();
  });

  app.get("/api/shifts/open", async (_req, res) => {
    try {
      const shifts = await storage.getOpenShifts();
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/shifts/start", async (req, res) => {
    try {
      const parsed = insertShiftStartSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }

      const existing = await storage.getOpenShiftByEmployee(parsed.data.employeeName);
      if (existing) {
        return res.status(400).json({
          message: `Für ${parsed.data.employeeName} existiert bereits eine offene Schicht.`,
        });
      }

      const shift = await storage.createShift(parsed.data);
      res.json(shift);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/shifts/:id/end", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Schicht-ID" });
      }

      const shift = await storage.getShiftById(id);
      if (!shift) {
        return res.status(404).json({ message: "Schicht nicht gefunden" });
      }
      if (shift.status !== "open") {
        return res.status(400).json({ message: "Schicht ist bereits geschlossen" });
      }

      const parsed = endShiftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }

      const startTotal = parseFloat(shift.startTotal);
      const endTotal = parseFloat(parsed.data.endTotal);
      const cashRevenue = parseFloat(parsed.data.cashRevenue);
      const cashWithdrawal = parseFloat(parsed.data.cashWithdrawal);
      const expectedEnd = startTotal + cashRevenue - cashWithdrawal;
      if (Math.abs(endTotal - expectedEnd) >= 0.005) {
        return res.status(400).json({
          message: `Endbestand (${endTotal.toFixed(2)} €) stimmt nicht mit dem erwarteten Endbestand (${expectedEnd.toFixed(2)} €) überein.`,
        });
      }

      const result = await storage.endShift(id, parsed.data);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      req.session.isAdmin = true;
      return res.json({ ok: true });
    }
    return res.status(401).json({ message: "Ungültige Anmeldedaten" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout fehlgeschlagen" });
      }
      res.json({ ok: true });
    });
  });

  app.get("/api/admin/shifts", requireAdmin, async (_req, res) => {
    try {
      const shifts = await storage.getShiftsLast14Days();
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/shifts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Schicht-ID" });
      }
      const shift = await storage.getShiftById(id);
      if (!shift) {
        return res.status(404).json({ message: "Schicht nicht gefunden" });
      }
      await storage.deleteShift(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/shifts/csv", requireAdmin, async (_req, res) => {
    try {
      const shifts = await storage.getShiftsLast14Days();
      const header = "Startzeit;Endzeit;Store;Schicht;Mitarbeiter;Start Wechselgeld;End Wechselgeld;Barumsatz;Barentnahme;Status\n";
      const rows = shifts.map((s) => {
        const start = new Date(s.startTime).toLocaleString("de-DE");
        const end = s.endTime ? new Date(s.endTime).toLocaleString("de-DE") : "";
        return `${start};${end};${s.storeName};${s.shiftType};${s.employeeName};${s.startTotal};${s.endTotal || ""};${s.cashRevenue || ""};${s.cashWithdrawal || ""};${s.status}`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=schichten.csv");
      res.send("\uFEFF" + header + rows.join("\n"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const backupTimestamps: { json: string | null; github: string | null } = {
    json: null,
    github: null,
  };

  app.get("/api/admin/backup/timestamps", requireAdmin, (_req, res) => {
    res.json(backupTimestamps);
  });

  app.get("/api/admin/backup/json", requireAdmin, async (_req, res) => {
    try {
      const shifts = await storage.getShiftsLast14Days();
      const payload = {
        exportedAt: new Date().toISOString(),
        count: shifts.length,
        shifts,
      };
      backupTimestamps.json = new Date().toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      );
      res.send(JSON.stringify(payload, null, 2));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/backup/github", requireAdmin, async (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ message: "GITHUB_TOKEN nicht konfiguriert. Bitte Secret setzen." });
    }

    const OWNER = "forzanapoli80796";
    const REPO = "Cash";
    const BRANCH = "main";
    const API = "https://api.github.com";
    const headers = {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Kassenführung-App",
      Accept: "application/vnd.github+json",
    };

    const IGNORE = new Set(["node_modules", "dist", ".git", ".local", "attached_assets", ".cache", ".upm"]);

    function walkFiles(dir: string, root: string): Array<{ rel: string; full: string }> {
      const result: Array<{ rel: string; full: string }> = [];
      for (const entry of readdirSync(dir)) {
        if (IGNORE.has(entry)) continue;
        const full = path.join(dir, entry);
        const rel = path.relative(root, full).replace(/\\/g, "/");
        const stat = statSync(full);
        if (stat.isDirectory()) {
          result.push(...walkFiles(full, root));
        } else if (stat.size < 500_000) {
          result.push({ rel, full });
        }
      }
      return result;
    }

    async function ghFetch(endpoint: string, method = "GET", body?: unknown) {
      const r = await fetch(`${API}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return r;
    }

    try {
      const now = new Date();
      const projectRoot = process.cwd();
      const files = walkFiles(projectRoot, projectRoot);

      const treeItems: Array<{ path: string; mode: string; type: string; content: string }> = [];
      for (const { rel, full } of files) {
        try {
          const buf = readFileSync(full);
          treeItems.push({
            path: rel,
            mode: "100644",
            type: "blob",
            content: buf.toString("utf8"),
          });
        } catch {
          // skip unreadable files
        }
      }

      let parentSha: string | undefined;
      let baseTreeSha: string | undefined;

      const refRes = await ghFetch(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
      if (refRes.ok) {
        const refData = await refRes.json() as any;
        parentSha = refData.object?.sha;
        if (parentSha) {
          const commitRes = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits/${parentSha}`);
          if (commitRes.ok) {
            const commitData = await commitRes.json() as any;
            baseTreeSha = commitData.tree?.sha;
          }
        }
      }

      const treeBody: any = { tree: treeItems };
      if (baseTreeSha) treeBody.base_tree = baseTreeSha;

      const treeRes = await ghFetch(`/repos/${OWNER}/${REPO}/git/trees`, "POST", treeBody);
      if (!treeRes.ok) {
        const t = await treeRes.text();
        return res.status(500).json({ message: `Tree-Fehler: ${treeRes.status} – ${t}` });
      }
      const treeData = await treeRes.json() as any;

      const commitMsg = `Backup ${now.toISOString().slice(0, 16).replace("T", " ")} (${files.length} Dateien)`;
      const commitBody: any = { message: commitMsg, tree: treeData.sha };
      if (parentSha) commitBody.parents = [parentSha];

      const newCommitRes = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits`, "POST", commitBody);
      if (!newCommitRes.ok) {
        const t = await newCommitRes.text();
        return res.status(500).json({ message: `Commit-Fehler: ${newCommitRes.status} – ${t}` });
      }
      const newCommit = await newCommitRes.json() as any;

      const updateRefRes = await ghFetch(
        `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,
        "PATCH",
        { sha: newCommit.sha, force: true }
      );
      if (!updateRefRes.ok) {
        const createRefRes = await ghFetch(
          `/repos/${OWNER}/${REPO}/git/refs`,
          "POST",
          { ref: `refs/heads/${BRANCH}`, sha: newCommit.sha }
        );
        if (!createRefRes.ok) {
          const t = await createRefRes.text();
          return res.status(500).json({ message: `Ref-Fehler: ${createRefRes.status} – ${t}` });
        }
      }

      backupTimestamps.github = now.toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
      res.json({ ok: true, files: files.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
