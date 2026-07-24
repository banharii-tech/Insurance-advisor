import { describe, expect, it } from "vitest";

import { validateProfile } from "@/lib/validation";
import type { PlanningProfile } from "@/types/planning";

const validProfile: PlanningProfile = {
  age: 34,
  annualBudgetSgd: 3_000,
  residencyStatus: "Foreigner",
  spouseCitizenship: "Singapore citizen",
  needsGovernmentHospital: true,
  needsCriticalIllness: true,
};

describe("validateProfile", () => {
  it("accepts the fictional example profile", () => {
    expect(validateProfile(validProfile)).toEqual({});
  });

  it("rejects invalid age and budget values", () => {
    expect(
      validateProfile({ ...validProfile, age: 17, annualBudgetSgd: 0 }),
    ).toMatchObject({
      age: expect.any(String),
      annualBudgetSgd: expect.any(String),
    });
  });

  it("requires at least one coverage need", () => {
    expect(
      validateProfile({
        ...validProfile,
        needsGovernmentHospital: false,
        needsCriticalIllness: false,
      }).coverageNeeds,
    ).toBe("Select at least one coverage need.");
  });
});
