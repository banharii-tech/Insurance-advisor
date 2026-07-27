import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSession, endDemoSession } from "@/lib/session";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo session API", () => {
  it("creates a temporary backend session without credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: "session-123",
        createdAt: "2026-07-27T00:00:00+00:00",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDemoSession()).resolves.toEqual({
      sessionId: "session-123",
      createdAt: "2026-07-27T00:00:00+00:00",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/demo-sessions",
      { method: "POST" },
    );
  });

  it("deletes the temporary session using an encoded identifier", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await endDemoSession("session/123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/demo-sessions/session%2F123",
      { method: "DELETE" },
    );
  });
});
