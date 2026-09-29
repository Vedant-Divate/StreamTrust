/**
 * Drizzle table definitions for libSQL (PROJECT.md Section 7.2).
 * All IDs are UUID v4 strings; timestamps are ISO-8601 UTC strings.
 */
import { blob, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const volunteers = sqliteTable("volunteers", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  name: text("name"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracyM: real("accuracy_m"),
  createdAt: text("created_at").notNull(),
});

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  volunteerId: text("volunteer_id")
    .notNull()
    .references(() => volunteers.id),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  observedAt: text("observed_at").notNull(),
  rainLast24h: text("rain_last_24h").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("draft"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  consentAt: text("consent_at"),
  createdAt: text("created_at").notNull(),
  submittedAt: text("submitted_at"),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  mime: text("mime").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: blob("bytes", { mode: "buffer" }).notNull(),
  sha256: text("sha256").notNull(),
  createdAt: text("created_at").notNull(),
});

export const aiSuggestions = sqliteTable("ai_suggestions", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  indicator: text("indicator").notNull(),
  suggestedValue: text("suggested_value").notNull(),
  confidenceBand: text("confidence_band").notNull(),
  confidenceScore: real("confidence_score"),
  evidence: text("evidence").notNull(),
  cuesJson: text("cues_json").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  rawResponseJson: text("raw_response_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const indicatorEntries = sqliteTable(
  "indicator_entries",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id),
    indicator: text("indicator").notNull(),
    finalValue: text("final_value").notNull(),
    decisionSource: text("decision_source").notNull(),
    aiSuggestionId: text("ai_suggestion_id").references(() => aiSuggestions.id),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [unique().on(t.assessmentId, t.indicator)]
);

export const warningAcks = sqliteTable("warning_acks", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  ruleId: text("rule_id").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const fhirExports = sqliteTable("fhir_exports", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  bundleJson: text("bundle_json").notNull(),
  validatorBaseUrl: text("validator_base_url").notNull(),
  validatorOutcomeJson: text("validator_outcome_json"),
  errorCount: integer("error_count").notNull(),
  warningCount: integer("warning_count").notNull(),
  createdAt: text("created_at").notNull(),
});

export const rateEvents = sqliteTable("rate_events", {
  id: text("id").primaryKey(),
  volunteerId: text("volunteer_id").notNull(),
  kind: text("kind").notNull(),
  createdAt: text("created_at").notNull(),
});
