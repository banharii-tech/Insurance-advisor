import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import InsurancePlanner from "@/components/insurance-planner";

const extractedProfile = {
  age: 34,
  annualBudgetSgd: 3_000,
  residencyStatus: "Foreigner",
  spouseCitizenship: "Singapore citizen",
  needsGovernmentHospital: true,
  needsCriticalIllness: true,
};

function mockReadyConversation(profile = extractedProfile) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assistantMessage:
          "I have enough information. Please review the details.",
        profile,
        missingFields: [],
        readyForReview: true,
        requestIntent: "combined",
        needsSupportedPlanChoice: false,
        supportedPlanTypes: [
          "hospitalisation",
          "critical_illness",
          "combined",
        ],
      }),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InsurancePlanner", () => {
  it("collects a freeform answer and requires review before comparison", async () => {
    const user = userEvent.setup();
    mockReadyConversation();
    render(<InsurancePlanner />);

    expect(
      screen.getByRole("log", { name: "Conversation with planning assistant" }),
    ).toHaveTextContent("I can guide a fictional public hospital");

    await user.type(
      screen.getByLabelText("Reply to the planning assistant"),
      "I am 34, a foreigner, married to a citizen, with S$3,000 for both.",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Did we understand you correctly?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Example Balanced Bundle")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Confirm and compare fictional plans",
      }),
    );

    expect(
      screen.getByText("Your fictional plan comparison"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Fictional plan")).toHaveLength(3);
    expect(
      screen.getAllByText("Example Balanced Bundle").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("3 plans checked")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download planning summary/ }),
    ).toBeEnabled();
  });

  it("lets the user correct extracted criteria before deterministic evaluation", async () => {
    const user = userEvent.setup();
    mockReadyConversation();
    render(<InsurancePlanner />);

    await user.type(
      screen.getByLabelText("Reply to the planning assistant"),
      "My planning details",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    const budget = await screen.findByLabelText("Annual insurance budget");
    await user.clear(budget);
    await user.type(budget, "1000");
    await user.click(
      screen.getByRole("button", {
        name: "Confirm and compare fictional plans",
      }),
    );

    expect(
      screen.getByText("No plan meets all selected criteria"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not recommended")).toHaveLength(3);
  });

  it("shows a safe API error without losing the user's answer", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          detail: "Please remove contact details or identification numbers.",
        }),
      }),
    );
    render(<InsurancePlanner />);

    await user.type(
      screen.getByLabelText("Reply to the planning assistant"),
      "My email is person@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please remove contact details");
    expect(
      within(
        screen.getByRole("log", {
          name: "Conversation with planning assistant",
        }),
      ).getByText("My email is person@example.com"),
    ).toBeInTheDocument();
  });

  it("redirects unsupported requests into a guided supported plan choice", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage:
            "I can’t generate a life plan or provide personal financial advice. I can guide the closest supported public hospital or critical illness comparison.",
          profile: null,
          missingFields: ["supported_plan_type"],
          readyForReview: false,
          requestIntent: "unsupported",
          needsSupportedPlanChoice: true,
          supportedPlanTypes: [
            "hospitalisation",
            "critical_illness",
            "combined",
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage: "What is your age?",
          profile: null,
          missingFields: ["age"],
          readyForReview: false,
          requestIntent: "critical_illness",
          needsSupportedPlanChoice: false,
          supportedPlanTypes: [
            "hospitalisation",
            "critical_illness",
            "combined",
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<InsurancePlanner />);

    await user.type(
      screen.getByLabelText("Reply to the planning assistant"),
      "Create a life plan and give me financial advice.",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(/I can’t generate a life plan/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Supported planning summaries" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Critical illness/ }),
    );
    expect(await screen.findByText("What is your age?")).toBeInTheDocument();

    const secondRequest = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    ) as { messages: Array<{ content: string }> };
    expect(secondRequest.messages.at(-1)?.content).toBe(
      "Guide me through a critical illness insurance comparison.",
    );
  });
});
