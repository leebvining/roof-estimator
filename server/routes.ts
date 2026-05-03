import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { insertLeadSchema, updateSettingsSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/settings", async (_req, res) => {
    const current = await storage.getSettings();
    res.json(current);
  });

  app.patch("/api/settings", async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.flatten() });
      return;
    }

    const updated = await storage.updateSettings(parsed.data);
    res.json(updated);
  });

  app.get("/api/leads", async (_req, res) => {
    const allLeads = await storage.listLeads();
    res.json(allLeads);
  });

  app.post("/api/leads", async (req, res) => {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.flatten() });
      return;
    }

    const lead = await storage.createLead(parsed.data);
    const currentSettings = await storage.getSettings();

    if (currentSettings.webhookUrl) {
      try {
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
