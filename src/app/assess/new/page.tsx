"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COPY } from "@/domain/copy";
import { RAIN_LAST_24H_OPTIONS } from "@/domain/vocab";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const inputClass =
  "min-h-[44px] w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function NewAssessment() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [observedAt, setObservedAt] = useState(() => toLocalInputValue(new Date()));
  const [rain, setRain] = useState("unknown");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus(COPY.locationDenied);
      return;
    }
    setLocating(true);
    setStatus(COPY.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(Math.round(pos.coords.latitude * 10000) / 10000));
        setLng(String(Math.round(pos.coords.longitude * 10000) / 10000));
        setLocating(false);
        setStatus("");
      },
      () => {
        setLocating(false);
        setStatus(COPY.locationDenied);
      },
      { timeout: 10000 }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    const latNum = Number(lat);
    const lngNum = Number(lng);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site: {
            ...(name.trim() ? { name: name.trim() } : {}),
            lat: latNum,
            lng: lngNum,
          },
          observed_at: new Date(observedAt).toISOString(),
          rain_last_24h: rain,
          consent,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? COPY.submitError);
      }
      const data = (await res.json()) as { assessment: { id: string } };
      router.push(`/assess/${data.assessment.id}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : COPY.submitError);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p aria-label={COPY.assessStep1of4} className="text-sm text-muted-foreground">
          Step{" "}
          <span aria-hidden="true" className="font-display text-base font-bold text-primary">
            1
          </span>{" "}
          of 4: place and time
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{COPY.assessNewTitle}</h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="site-name">{COPY.siteNameLabel}</label>
          <input
            id="site-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
          <legend className="flex items-center gap-2 px-1 font-medium">
            <svg
              width="20"
              height="8"
              viewBox="0 0 20 8"
              fill="none"
              aria-hidden="true"
              className="text-primary"
            >
              <path
                d="M1 5q2.5-3.5 5 0t5 0t5 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Location
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="lat">{COPY.latLabel}</label>
              <input
                id="lat"
                type="number"
                required
                step="any"
                min={-90}
                max={90}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="lng">{COPY.lngLabel}</label>
              <input
                id="lng"
                type="number"
                required
                step="any"
                min={-180}
                max={180}
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex min-h-[44px] items-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {COPY.useLocation}
            </button>
          </div>
        </fieldset>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <label htmlFor="observed-at">{COPY.observedAtLabel}</label>
          <input
            id="observed-at"
            type="datetime-local"
            required
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <label htmlFor="rain">{COPY.rainLabel}</label>
          <select
            id="rain"
            value={rain}
            onChange={(e) => setRain(e.target.value)}
            className={inputClass}
          >
            {RAIN_LAST_24H_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <label htmlFor="notes">{COPY.notesLabel}</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-1 h-6 w-6 shrink-0 accent-primary"
          />
          <label htmlFor="consent" className="text-sm">
            {COPY.consentCheckbox}
          </label>
        </div>

        <p aria-live="polite" className="min-h-[1.5rem] text-sm text-destructive">
          {status}
        </p>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {saving ? "…" : COPY.continueButton}
        </button>
      </form>
    </div>
  );
}
