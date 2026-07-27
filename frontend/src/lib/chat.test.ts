import { afterEach, describe, expect, it, vi } from "vitest";

import { sendChatMessages } from "@/lib/chat";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChatMessages", () => {
  it("sends only message roles and content to the assistant API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assistantMessage: "What is your annual budget?",
        profile: null,
        missingFields: ["annual_budget_sgd"],
        readyForReview: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendChatMessages([
      { id: 17, role: "user", content: "I am 34." },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "I am 34." }],
        }),
      }),
    );
  });

  it("surfaces the API's safe error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Please remove contact details." }),
      }),
    );

    await expect(
      sendChatMessages([{ id: 1, role: "user", content: "hello" }]),
    ).rejects.toThrow("Please remove contact details.");
  });
});
