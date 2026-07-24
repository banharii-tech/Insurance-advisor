import { describe, expect, it, vi } from "vitest";

import { FICTIONAL_PLANS } from "@/data/plans";
import {
  createPlanningSummaryPdf,
  downloadPlanningSummary,
} from "@/lib/download";
import { evaluatePlans } from "@/lib/recommendation";
import type { PlanningProfile } from "@/types/planning";

const profile: PlanningProfile = {
  age: 34,
  annualBudgetSgd: 3_000,
  residencyStatus: "Foreigner",
  spouseCitizenship: "Singapore citizen",
  needsGovernmentHospital: true,
  needsCriticalIllness: true,
};

describe("createPlanningSummaryPdf", () => {
  it("creates a non-empty PDF containing the completed comparison", async () => {
    const evaluations = evaluatePlans(profile, FICTIONAL_PLANS);
    const bytes = await createPlanningSummaryPdf(
      profile,
      evaluations,
      new Date("2026-07-24T00:00:00Z"),
    );
    const signature = new TextDecoder().decode(bytes.slice(0, 4));

    expect(signature).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(2_000);
  });

  it("downloads the completed summary through the browser", async () => {
    const evaluations = evaluatePlans(profile, FICTIONAL_PLANS);
    const createObjectUrl = vi.fn(() => "blob:planning-summary");
    const revokeObjectUrl = vi.fn();
    let downloadedFilename = "";
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function captureDownload() {
        downloadedFilename = this.download;
      });

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    await downloadPlanningSummary(profile, evaluations);

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(downloadedFilename).toMatch(
      /^fictional-insurance-plan-summary-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:planning-summary");

    click.mockRestore();
  });
});
