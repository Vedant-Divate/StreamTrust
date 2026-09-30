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
  startAssessment: "Start an assessment",
  landingTitle: "See your stream clearly.",
  landingIntro:
    "StreamTrust guides you through a short stream check in plain language. " +
    "Your answers stay yours: you make every final decision.",
  howItWorks: "How it works",
  step1Title: "Visit your stream",
  step1Text: "Go to a nearby stream and note where and when you are.",
  step2Title: "Answer guided questions",
  step2Text: "Describe the water in simple words and add a photo or two.",
  step3Title: "Share standard data",
  step3Text: "Your confirmed answers are saved in a shared research format.",
  learnMore: "How StreamTrust works",
  viewInsights: "See community insights",
  aboutTitle: "About StreamTrust",
  aboutMethodTitle: "Method",
  aboutMethodText:
    "A volunteer visits a stream, records the location and time, adds " +
    "photos, and answers six guided questions about the water. Every value " +
    "is confirmed by the human before it is saved.",
  aboutLimitsTitle: "Limits",
  aboutLimitsText:
    "This app does not determine whether water is safe, does not diagnose " +
    "pollution, and does not predict disease. Records describe what a " +
    "volunteer observed, nothing more.",
  aboutPrivacyTitle: "Privacy",
  aboutPrivacyText:
    "No accounts and no names. You are identified only by a random number " +
    "stored in your browser. Locations are rounded before storage, and " +
    "photos are re-encoded on your device so location tags are removed " +
    "before upload.",
  aboutAiTitle: "AI assistance",
  aboutAiText:
    "Where available, an AI vision model may suggest what it sees in your " +
    "photos, with reasons and its own confidence. Suggestions are never " +
    "final: you accept or change every value. This site itself was built " +
    "with an AI coding agent under human direction.",
  assessNewTitle: "Start a new assessment",
  assessStep1of4: "Step 1 of 4: place and time",
  siteNameLabel: "Place name (optional)",
  latLabel: "Latitude",
  lngLabel: "Longitude",
  useLocation: "Use my location",
  locating: "Getting your location…",
  locationDenied: "Could not get your location. Enter it by hand.",
  observedAtLabel: "Date and time of visit",
  rainLabel: "Rain in the last 24 hours",
  notesLabel: "Notes (optional)",
  continueButton: "Continue",
  submitError: "Something went wrong. Check your answers and try again.",
  assessPhotosTitle: "Add photos",
  assessStep2of4: "Step 2 of 4: photos",
  photoHelp:
    "Photos help reviewers trust your record. Each photo is resized on " +
    "your device before upload.",
  choosePhoto: "Choose a photo",
  preparingPhoto: "Preparing photo…",
  uploadingPhoto: "Uploading…",
  uploadError: "Could not upload that photo. Try another one.",
  removePhoto: "Remove photo",
  noPhotos: "No photos yet.",
  assessIndicatorsTitle: "Describe the water",
  assessStep3of4: "Step 3 of 4: questions",
  savingDraft: "Saving…",
  savedDraft: "All changes saved.",
  saveError: "Could not save. Check your connection and try again.",
  notApplicableNote: "Not applicable — the stream bed is dry.",
  dryNote: "No water here: the water questions are set to not applicable.",
  backButton: "Back",
  reviewButton: "Review and submit",
  loadError: "Could not load this assessment. It may belong to another browser.",
  assessReviewTitle: "Review your answers",
  assessStep4of4: "Step 4 of 4: review",
  missingAnswers: "Answer every question before submitting.",
  submitButton: "Submit assessment",
  submitting: "Submitting…",
  doneTitle: "Assessment saved. Thank you!",
  doneText:
    "Your answers are saved. Below is the raw data for this assessment; " +
    "a standards-format view arrives in a later step.",
  viewData: "Your data",
  downloadJson: "Download JSON",
  getSuggestions: "Get AI suggestions",
  suggestionsLoading: "Asking the AI…",
  suggestionsFailed: "The AI is unavailable. Continue manually.",
  useSuggestion: "Use suggestion",
  whyLabel: "Why?",
  aiCantTell: "AI can't tell from a photo",
  bandLow: "Low confidence",
  bandMedium: "Medium confidence",
  bandHigh: "High confidence",
  bandTooltip: "Self-reported by the AI. Not a measured accuracy.",
} as const;

export type CopyKey = keyof typeof COPY;
