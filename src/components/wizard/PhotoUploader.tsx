"use client";

import { useState } from "react";
import { COPY } from "@/domain/copy";
import { resizePhoto } from "@/lib/image";

export interface PhotoMeta {
  id: string;
  mime: string;
  width: number;
  height: number;
  sha256: string;
  createdAt: string;
}

export function PhotoUploader({
  assessmentId,
  photos,
  onChanged,
}: {
  assessmentId: string;
  photos: PhotoMeta[];
  onChanged: () => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setStatus(COPY.preparingPhoto);
      const resized = await resizePhoto(file);
      setStatus(COPY.uploadingPhoto);
      const form = new FormData();
      form.append("photo", new File([resized.blob], "photo.jpg", { type: "image/jpeg" }));
      const res = await fetch(`/api/assessments/${assessmentId}/photos`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("upload failed");
      setStatus("");
      onChanged();
    } catch {
      setStatus(COPY.uploadError);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photoId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      onChanged();
    } catch {
      setStatus(COPY.uploadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor="photo-input"
        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-4 text-base font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
      >
        {COPY.choosePhoto}
      </label>
      <input
        id="photo-input"
        type="file"
        accept="image/jpeg"
        disabled={busy}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="sr-only"
      />
      <p aria-live="polite" className="min-h-[1.5rem] text-sm text-muted-foreground">
        {status}
      </p>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COPY.noPhotos}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 rounded-lg border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${p.id}`}
                alt={`Stream photo (${p.width} by ${p.height})`}
                className="aspect-[4/3] w-full rounded object-cover"
              />
              <p className="text-xs text-muted-foreground">
                {p.width} × {p.height}
              </p>
              <button
                type="button"
                onClick={() => void removePhoto(p.id)}
                disabled={busy}
                aria-label={`${COPY.removePhoto} (${p.width} by ${p.height})`}
                className="inline-flex min-h-[44px] items-center justify-center rounded border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                {COPY.removePhoto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
