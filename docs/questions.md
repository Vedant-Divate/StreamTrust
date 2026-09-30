# Open questions

One line per ambiguity: what was unclear, what default was chosen, and phase.
Phase 0 resolutions were checked against the live Devpost pages on 2026-09-29.

- A-1 (indicator vocabulary vs official protocol): UNRESOLVED — no official OneAquaHealth stream-assessment protocol found online; using PROJECT.md Section 7.1 as the vocabulary (Phase 0 default). Revisit if Session 5 / hub tools publish one.
- A-2 (organizer FHIR sandbox): UNRESOLVED — Session 4 covered an "OAH-FHIR Implementation Guide + hands-on FHIR Sandbox", but no sandbox URL was retrievable; using the public HAPI R4 test server with a configurable base URL (Phase 0 default). Human: check the Session 4 recording for the sandbox URL.
- A-3 (deadline): CONFLICT ON DEVPOST ITSELF — rules page header says Oct 4, 2026 @ 9pm PDT, while the submit page and update posts say Sep 30, 2026 @ 9pm PDT; keeping the conservative default Sep 30, 21:00 PDT (Oct 1, 09:30 IST) for planning (Phase 0 default). Human: confirm on the logged-in Devpost dashboard.
- A-4 (team requirement): RESOLVED — Rules tab says "Open to individuals or teams (each participant can join only one team)"; individual submission is allowed, no team registration needed.
- A-5 (original work during event period): RESOLVED — Rules say projects "must be original and developed during the hackathon period" (Sep 16–30); repo created 2026-09-29 with honest history, no backdating.
- A-6 (AI-assisted coding disclosure): UNRESOLVED by organizers — disclosing in README per Phase 0 default ("Built with an AI coding agent under human direction"); final README wording lands in Phase 9.
- A-7 (prize eligibility for India): UNRESOLVED — "All Cash Prizes Subject to IEEE rules and regulation"; human to email oneaquahealth@ieee.org if prize money matters. Does not block building.
- A-8 (real observation data availability): UNRESOLVED — no public export found; using own photos + clearly labelled synthetic demo data (Phase 0 default).
- D-01 (Vercel deploy): RESOLVED — live at https://streamtrust.vercel.app/ (Phase 0 exit criteria fully met).
- D-02 (repo tests use `:memory:` libSQL, not temp files): the Windows file lock survives `client.close()`, so temp-file cleanup failed with EPERM; same driver + same real migration, so no behavior difference (Phase 1).
- D-03 (photo waiver persistence): RESOLVED by ADR-0010 — `photo_waived` column added and persisted at submit; payload waiver remains the submit-moment attestation for rule evaluation.
- D-04 (insights scope): submitted assessments only — draft `decision_source` values are placeholders and drafts are mutable, so only finalized records feed the agreement dashboard (Phase 7).
