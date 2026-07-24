import { describe, expect, it } from "vitest";

import { FICTIONAL_PLANS } from "@/data/plans";
import { evaluatePlans } from "@/lib/recommendation";
import type { PlanningProfile } from "@/types/planning";

const exampleProfile: PlanningProfile = {
  age: 34,
  annualBudgetSgd: 3_000,
  residencyStatus: "Foreigner",
  spouseCitizenship: "Singapore citizen",
  needsGovernmentHospital: true,
  needsCriticalIllness: true,
};

describe("evaluatePlans", () => {
  it("recommends PLAN-002 for the KAN-5 example", () => {
    const evaluations = evaluatePlans(exampleProfile, FICTIONAL_PLANS);

    expect(evaluations).toHaveLength(3);
    expect(
      evaluations.find((evaluation) => evaluation.status === "Recommended")
        ?.plan.planId,
    ).toBe("PLAN-002");
    expect(
      evaluations.find((evaluation) => evaluation.plan.planId === "PLAN-003")
        ?.budgetMatch,
    ).toBe(false);
  });

  it("treats age boundaries as inclusive", () => {
    const atMaximum = evaluatePlans(
      { ...exampleProfile, age: 65 },
      FICTIONAL_PLANS,
    );
    const overMaximum = evaluatePlans(
      { ...exampleProfile, age: 66 },
      FICTIONAL_PLANS,
    );

    expect(atMaximum.every((evaluation) => evaluation.ageMatch)).toBe(true);
    expect(overMaximum.every((evaluation) => !evaluation.ageMatch)).toBe(true);
    expect(
      overMaximum.some(
        (evaluation) => evaluation.status === "Recommended",
      ),
    ).toBe(false);
  });

  it("treats a premium equal to budget as affordable", () => {
    const evaluations = evaluatePlans(exampleProfile, FICTIONAL_PLANS);

    expect(
      evaluations.find((evaluation) => evaluation.plan.planId === "PLAN-002")
        ?.budgetMatch,
    ).toBe(true);
  });

  it("prefers the lowest premium when critical illness is not selected", () => {
    const evaluations = evaluatePlans(
      {
        ...exampleProfile,
        annualBudgetSgd: 4_000,
        needsCriticalIllness: false,
      },
      FICTIONAL_PLANS,
    );

    expect(
      evaluations.find((evaluation) => evaluation.status === "Recommended")
        ?.plan.planId,
    ).toBe("PLAN-001");
  });

  it("prefers greater fictional CI coverage when all plans are affordable", () => {
    const evaluations = evaluatePlans(
      { ...exampleProfile, annualBudgetSgd: 3_600 },
      FICTIONAL_PLANS,
    );

    expect(
      evaluations.find((evaluation) => evaluation.status === "Recommended")
        ?.plan.planId,
    ).toBe("PLAN-003");
  });
});
