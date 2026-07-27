import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PlatformShell from "@/components/platform-shell";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlatformShell", () => {
  it("opens and closes a disposable demo session without authentication", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: "session-123",
          createdAt: "2026-07-27T00:00:00+00:00",
        }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformShell />);

    expect(
      screen.getByRole("heading", { name: "Sign in to ClearCover" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Tell us in your own words")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continue to demo/ }));

    expect(
      await screen.findByRole("heading", {
        name: /Understand the match/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tell us in your own words")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in to ClearCover" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an accessible error when the demo backend is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Unavailable" }),
      }),
    );
    render(<PlatformShell />);

    await user.click(screen.getByRole("button", { name: /Continue to demo/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "local demo service is unavailable",
    );
  });
});
