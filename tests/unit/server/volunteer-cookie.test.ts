import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  VOLUNTEER_COOKIE,
  errorBody,
  getVolunteerId,
  issueVolunteerCookie,
} from "@/server/security/volunteer-cookie";

function reqWithCookie(header: string | null) {
  return new Request("http://localhost/api/x", {
    headers: header ? { cookie: header } : {},
  });
}

describe("volunteer cookie", () => {
  it("reads the st_vid value from the Cookie header", () => {
    expect(getVolunteerId(reqWithCookie("st_vid=abc-123"))).toBe("abc-123");
    expect(getVolunteerId(reqWithCookie("other=1; st_vid=abc-123; x=2"))).toBe("abc-123");
  });

  it("returns undefined when the cookie is missing or empty", () => {
    expect(getVolunteerId(reqWithCookie(null))).toBeUndefined();
    expect(getVolunteerId(reqWithCookie("other=1"))).toBeUndefined();
    expect(getVolunteerId(reqWithCookie("st_vid="))).toBeUndefined();
  });

  it("issues an HttpOnly, Lax, root-path cookie", () => {
    const res = NextResponse.json({ ok: true });
    const id = issueVolunteerCookie(res);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${VOLUNTEER_COOKIE}=${id}`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
  });

  it("builds the shared error shape", () => {
    expect(errorBody("not_found", "Assessment not found.")).toEqual({
      error: { code: "not_found", message: "Assessment not found." },
    });
  });
});
