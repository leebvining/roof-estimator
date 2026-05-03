import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  marketName: text("market_name").notNull(),
  goodPricePerSquare: real("good_price_per_square").notNull(),
  betterPricePerSquare: real("better_price_per_square").notNull(),
  bestPricePerSquare: real("best_price_per_square").notNull(),
  wastePercent: real("waste_percent").notNull(),
  steepPitchMultiplier: real("steep_pitch_multiplier").notNull(),
  complexRoofMultiplier: real("complex_roof_multiplier").notNull(),
  twoStoryMultiplier: real("two_story_multiplier").notNull(),
  tearOffPerSquare: real("tear_off_per_square").notNull(),
  webhookUrl: text("webhook_url").notNull(),
});

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  zipCode: text("zip_code").notNull(),
  homeSquareFeet: integer("home_square_feet").notNull(),
  stories: text("stories").notNull(),
  pitch: text("pitch").notNull(),
  complexity: text("complexity").notNull(),
  tearOff: text("tear_off").notNull(),
  selectedPackage: text("selected_package").notNull(),
  estimatedSquares: real("estimated_squares").notNull(),
  lowEstimate: integer("low_estimate").notNull(),
  highEstimate: integer("high_estimate").notNull(),
  packageEstimatesJson: text("package_estimates_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const updateSettingsSchema = insertSettingsSchema.partial();

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
