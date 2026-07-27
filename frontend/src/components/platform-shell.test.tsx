import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PlatformShell from "@/components/platform-shell";

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

describe("PlatformShell", () => {
  it("registers a user, opens an isolated workspace, and signs out", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => session,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformShell />);

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Display name"), "Alice Tan");
    await user.type(screen.getByLabelText("Email"), "alice@example.test");
    await user.type(screen.getByLabelText("Password"), "strong-pass-1");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "strong-pass-1",
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Understand the match/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("No saved drafts yet")).toBeInTheDocument();
    expect(screen.getByText("Alice Tan")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("restores a returning user's saved draft documents", async () => {
    const user = userEvent.setup();
    const draft = {
      suggestionId: "draft-123",
      title: "Combined coverage planning draft",
      summaryType: "combined",
      profile: {
        age: 34,
        annualBudgetSgd: 3000,
        residencyStatus: "Foreigner",
        spouseCitizenship: "Singapore citizen",
        needsGovernmentHospital: true,
        needsCriticalIllness: true,
      },
      evaluations: [],
      recommendedPlanName: "Example Balanced Bundle",
      createdAt: "2026-07-27T00:00:00+00:00",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => session,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [draft],
        }),
    );
    render(<PlatformShell />);

    await user.type(screen.getByLabelText("Email"), "alice@example.test");
    await user.type(screen.getByLabelText("Password"), "strong-pass-1");
    await user.click(
      screen.getByRole("button", { name: "Sign in to workspace" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Combined coverage planning draft",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fictional result: Example Balanced Bundle"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download draft PDF/ }),
    ).toBeEnabled();
  });

  it("shows the safe authentication error returned by the backend", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          detail: "The email or password is incorrect.",
        }),
      }),
    );
    render(<PlatformShell />);

    await user.type(screen.getByLabelText("Email"), "alice@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(
      screen.getByRole("button", { name: "Sign in to workspace" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "email or password is incorrect",
    );
  });

  it("checks matching passwords before creating an account", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformShell />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Display name"), "Alice Tan");
    await user.type(screen.getByLabelText("Email"), "alice@example.test");
    await user.type(screen.getByLabelText("Password"), "strong-pass-1");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "different-pass",
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "passwords do not match",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
