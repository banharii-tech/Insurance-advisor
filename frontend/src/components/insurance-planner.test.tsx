import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import InsurancePlanner from "@/components/insurance-planner";

describe("InsurancePlanner", () => {
  it("renders the three fictional plans and recommendation", async () => {
    const user = userEvent.setup();
    render(<InsurancePlanner />);

    await user.click(
      screen.getByRole("button", { name: "Compare fictional plans" }),
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

  it("shows a no-match result when the budget is below every plan", async () => {
    const user = userEvent.setup();
    render(<InsurancePlanner />);

    const budget = screen.getByLabelText("Annual insurance budget");
    await user.clear(budget);
    await user.type(budget, "1000");
    await user.click(
      screen.getByRole("button", { name: "Compare fictional plans" }),
    );

    expect(
      screen.getByText("No plan meets all selected criteria"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not recommended")).toHaveLength(3);
  });

  it("requires at least one coverage need", async () => {
    const user = userEvent.setup();
    render(<InsurancePlanner />);

    await user.click(
      screen.getByRole("checkbox", { name: /Public hospital plan/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Critical illness/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Compare fictional plans" }),
    );

    expect(
      screen.getAllByText("Select at least one coverage need."),
    ).toHaveLength(2);
  });
});
