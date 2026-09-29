/**
 * Shared domain-level status and provenance types (PROJECT.md Section 7.2).
 * Pure domain module: no imports from `src/server/**` or `src/app/**`.
 */

export const ASSESSMENT_STATUSES = ["draft", "submitted"] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const DECISION_SOURCES = ["ai_accepted", "human_override", "human_only"] as const;

export type DecisionSource = (typeof DECISION_SOURCES)[number];

export const CONFIDENCE_BANDS = ["low", "medium", "high", "none"] as const;

export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];
