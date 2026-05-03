import { leads, settings } from "@shared/schema";
import type { InsertLead, Lead, Settings, UpdateSettings } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    market_name TEXT NOT NULL,
    good_price_per_square REAL NOT NULL,
    better_price_per_square REAL NOT NULL,
    best_price_per_square REAL NOT NULL,
    waste_percent REAL NOT NULL,
    steep_pitch_multiplier REAL NOT NULL,
    complex_roof_multiplier REAL NOT NULL,
    two_story_multiplier REAL NOT NULL,
    tear_off_per_square REAL NOT NULL,
    webhook_url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    home_square_feet INTEGER NOT NULL,
    stories TEXT NOT NULL,
    pitch TEXT NOT NULL,
    complexity TEXT NOT NULL,
    tear_off TEXT NOT NULL,
    selected_package TEXT NOT NULL,
    estimated_squares REAL NOT NULL,
    low_estimate INTEGER NOT NULL,
    high_estimate INTEGER NOT NULL,
    package_estimates_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

const defaultSettings = {
  companyName: "Blue Ridge Roofing",
  marketName: "Upstate South Carolina",
  goodPricePerSquare: 460,
  betterPricePerSquare: 540,
  bestPricePerSquare: 650,
  wastePercent: 12,
  steepPitchMultiplier: 1.1,
  complexRoofMultiplier: 1.14,
  twoStoryMultiplier: 1.06,
  tearOffPerSquare: 65,
  webhookUrl: "",
};

export interface IStorage {
  getSettings(): Promise<Settings>;
  updateSettings(update: UpdateSettings): Promise<Settings>;
  createLead(lead: InsertLead): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<Settings> {
    let existing = db.select().from(settings).where(eq(settings.id, 1)).get();
    if (!existing) {
      existing = db.insert(settings).values(defaultSettings).returning().get();
    }
    return existing;
  }

  async updateSettings(update: UpdateSettings): Promise<Settings> {
    await this.getSettings();
    return db
      .update(settings)
      .set(update)
      .where(eq(settings.id, 1))
      .returning()
      .get();
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    return db
      .insert(leads)
      .values({ ...lead, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  async listLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.id)).all();
  }
}

export const storage = new DatabaseStorage();
