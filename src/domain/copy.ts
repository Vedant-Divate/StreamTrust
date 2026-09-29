/**
 * All user-facing strings planned so far (PROJECT.md Sections 1.6, 11.3,
 * 11.5). Plain language, at most 8th-grade reading level; scientific terms
 * stay in `vocab.ts` tooltips. Pure domain module.
 */
export const COPY = {
  appName: "StreamTrust",
  appTagline: "Help watch over your local stream.",
  disclaimerMonitoringOnly:
    "Observations are for citizen-science monitoring only. " +
    "This app does not determine whether water is safe to touch, drink, or use.",
  disclaimerAiCanBeWrong: "AI suggestions can be wrong. You make the final decision.",
  demoDataNotice: "Demo data — synthetic, not real observations.",
  consentCheckbox:
    "I agree that my observation, rounded location, and photos may be " +
    "stored for this project. I will avoid photographing people.",
} as const;

export type CopyKey = keyof typeof COPY;
