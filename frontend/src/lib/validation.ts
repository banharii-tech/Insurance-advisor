import type { PlanningProfile, ProfileErrors } from "@/types/planning";

export function validateProfile(profile: PlanningProfile): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 100) {
    errors.age = "Enter a whole-number age between 18 and 100.";
  }

  if (
    !Number.isFinite(profile.annualBudgetSgd) ||
    profile.annualBudgetSgd <= 0 ||
    profile.annualBudgetSgd > 100_000
  ) {
    errors.annualBudgetSgd =
      "Enter an annual budget between S$1 and S$100,000.";
  }

  if (
    !profile.needsGovernmentHospital &&
    !profile.needsCriticalIllness
  ) {
    errors.coverageNeeds = "Select at least one coverage need.";
  }

  return errors;
}
