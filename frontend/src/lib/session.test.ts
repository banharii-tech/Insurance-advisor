import { afterEach, describe, expect, it, vi } from "vitest";

import {
  listSuggestions,
  saveSuggestion,
  signIn,
  signOut,
  signUp,
} from "@/lib/session";

const session = {
  sessionId: "session-123",
  createdAt: "2026-07-27T00:00:00+00:00",
  user: {
    userId: "user-123",
    displayName: "Alice Tan",
    email: "alice@example.test",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("account and suggestion APIs", () => {
  it("creates and signs in a temporary account", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => session,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      signUp("Alice Tan", "alice@example.test", "strong-pass-1"),
    ).resolves.toEqual(session);
    await expect(
      signIn("alice@example.test", "strong-pass-1"),
    ).resolves.toEqual(session);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8000/api/auth/sign-up",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://localhost:8000/api/auth/sign-in",
    );
  });

  it("signs out the current bearer session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await signOut("session-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/auth/sessions/current",
      {
        method: "DELETE",
        headers: { Authorization: "Bearer session-123" },
      },
    );
  });

  it("loads and saves drafts inside the bearer session", async () => {
    const draft = {
      suggestionId: "draft-123",
      title: "Hospital planning draft",
      summaryType: "hospitalisation" as const,
      profile: {
        age: 34,
        annualBudgetSgd: 3000,
        residencyStatus: "Foreigner" as const,
        spouseCitizenship: "Not applicable" as const,
        needsGovernmentHospital: true,
        needsCriticalIllness: false,
      },
      evaluations: [],
      recommendedPlanName: null,
      createdAt: "2026-07-27T00:00:00+00:00",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [draft],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listSuggestions("session-123")).resolves.toEqual([draft]);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => draft,
    });
    await saveSuggestion("session-123", {
      title: draft.title,
      summaryType: draft.summaryType,
      profile: draft.profile,
      evaluations: draft.evaluations,
      recommendedPlanName: draft.recommendedPlanName,
    });

    expect(fetchMock.mock.calls[0][1]).toEqual({
      headers: { Authorization: "Bearer session-123" },
    });
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({
      Authorization: "Bearer session-123",
      "Content-Type": "application/json",
    });
  });

  it("surfaces a safe API detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "The email or password is incorrect." }),
      }),
    );

    await expect(
      signIn("alice@example.test", "wrong-password"),
    ).rejects.toThrow("email or password is incorrect");
  });
});
