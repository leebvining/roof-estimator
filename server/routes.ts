import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { insertLeadSchema, updateSettingsSchema } from "@shared/schema";
import { storage } from "./storage";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "RidgeQuote!2026";
const leadAttempts = new Map<string, { count: number; resetAt: number }>();

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireAdmin(req: Parameters<Express["get"]>[1] extends (req: infer R, ...args: any[]) => any ? R : never, res: any, next: () => void) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ridge Quote Admin"');
    res.status(401).json({ message: "Admin authentication required" });
    return;
  }

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  const username = separator >= 0 ? decoded.slice(0, separator) : "";
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";

  if (!safeEqual(username, ADMIN_USER) || !safeEqual(password, ADMIN_PASSWORD)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ridge Quote Admin"');
    res.status(401).json({ message: "Invalid admin credentials" });
    return;
  }

  next();
}

function publicSettings(current: Awaited<ReturnType<typeof storage.getSettings>>) {
  const { webhookUrl: _webhookUrl, ...safeSettings } = current;
  return safeSettings;
}

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

async function isSafeWebhookUrl(value: string) {
  if (!value) return true;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const addresses = await dns.lookup(parsed.hostname, { all: true });
  return addresses.every((address) => !isPrivateIp(address.address));
}

function rateLimitLead(req: any, res: any, next: () => void) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = leadAttempts.get(key);
  if (!current || current.resetAt < now) {
    leadAttempts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    next();
    return;
  }
  if (current.count >= 10) {
    res.status(429).json({ message: "Too many estimate requests. Please try again later." });
    return;
  }
  current.count += 1;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/settings", async (_req, res) => {
    const current = await storage.getSettings();
    res.json(publicSettings(current));
  });

  app.get("/api/admin/settings", requireAdmin as any, async (_req, res) => {
    const current = await storage.getSettings();
    res.json(current);
  });

  app.patch("/api/settings", requireAdmin as any, async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.flatten() });
      return;
    }

    if (parsed.data.webhookUrl && !(await isSafeWebhookUrl(parsed.data.webhookUrl))) {
      res.status(400).json({ message: "Webhook URL must be HTTPS and resolve to a public host." });
      return;
    }

    const updated = await storage.updateSettings(parsed.data);
    res.json(updated);
  });

  app.get("/api/leads", requireAdmin as any, async (_req, res) => {
    const allLeads = await storage.listLeads();
    res.json(allLeads);
  });

  app.post("/api/leads", rateLimitLead, async (req, res) => {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.flatten() });
      return;
    }

    const lead = await storage.createLead(parsed.data);
    const currentSettings = await storage.getSettings();

    if (currentSettings.webhookUrl) {
      try {
        if (!(await isSafeWebhookUrl(currentSettings.webhookUrl))) {
          throw new Error("Unsafe webhook URL blocked");
        }
        await fetch(currentSettings.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "Roof estimator",
            lead,
            tags: ["roof-estimate", lead.selectedPackage],
          }),
        });
      } catch (error) {
        console.error("Webhook delivery failed", error);
      }
    }

    res.status(201).json(lead);
  });

  return httpServer;
}
