import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatSgd } from "@/lib/format";
import type { PlanEvaluation, PlanningProfile } from "@/types/planning";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 52;
const LINE_HEIGHT = 15;

export function getPlanningSummaryTitle(profile: PlanningProfile): string {
  if (profile.needsGovernmentHospital && profile.needsCriticalIllness) {
    return "COMBINED HOSPITAL AND CRITICAL ILLNESS PLANNING SUMMARY";
  }
  if (profile.needsGovernmentHospital) {
    return "PUBLIC HOSPITAL PLANNING SUMMARY";
  }
  return "CRITICAL ILLNESS PLANNING SUMMARY";
}

function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (value: string, size: number) => number },
  size: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export async function createPlanningSummaryPdf(
  profile: PlanningProfile,
  evaluations: PlanEvaluation[],
  generatedAt = new Date(),
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (height: number) => {
    if (y - height < MARGIN) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawText = (
    text: string,
    options: {
      size?: number;
      isBold?: boolean;
      color?: ReturnType<typeof rgb>;
      gapAfter?: number;
    } = {},
  ) => {
    const size = options.size ?? 10;
    const font = options.isBold ? bold : regular;
    const lines = wrapText(text, PAGE_WIDTH - MARGIN * 2, font, size);
    ensureSpace(lines.length * LINE_HEIGHT + (options.gapAfter ?? 0));

    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font,
        color: options.color ?? rgb(0.07, 0.16, 0.2),
      });
      y -= LINE_HEIGHT;
    }
    y -= options.gapAfter ?? 0;
  };

  drawText(`FICTIONAL ${getPlanningSummaryTitle(profile)}`, {
    size: 16,
    isBold: true,
    color: rgb(0.02, 0.35, 0.3),
    gapAfter: 8,
  });
  drawText(
    "Learning prototype only. All products, providers, premiums and coverage values are fictional. This is not financial advice.",
    { isBold: true, color: rgb(0.65, 0.16, 0.12), gapAfter: 12 },
  );
  drawText(
    `Generated locally on ${generatedAt.toLocaleDateString("en-SG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    { gapAfter: 12 },
  );

  drawText("Planning details", { size: 13, isBold: true, gapAfter: 4 });
  drawText(`Age: ${profile.age}`);
  drawText(`Annual budget: ${formatSgd(profile.annualBudgetSgd)}`);
  drawText(`Residency status: ${profile.residencyStatus}`);
  drawText(`Spouse citizenship: ${profile.spouseCitizenship}`);
  drawText(
    `Coverage needs: ${[
      profile.needsGovernmentHospital ? "Public/government hospital" : "",
      profile.needsCriticalIllness ? "Critical illness" : "",
    ]
      .filter(Boolean)
      .join(", ")}`,
    { gapAfter: 12 },
  );

  const recommended = evaluations.find(
    (evaluation) => evaluation.status === "Recommended",
  );
  drawText("Prototype result", { size: 13, isBold: true, gapAfter: 4 });
  drawText(
    recommended
      ? `${recommended.plan.planName} (${recommended.plan.planId}) is the recommended fictional comparison.`
      : "No fictional plan meets every selected criterion.",
    { isBold: true, gapAfter: 12 },
  );

  drawText("Plan comparisons", { size: 13, isBold: true, gapAfter: 6 });
  evaluations.forEach((evaluation, index) => {
    if (index > 0) y -= 5;
    drawText(
      `${evaluation.plan.planName} - ${evaluation.status}`,
      { size: 11, isBold: true },
    );
    drawText(
      `${evaluation.plan.providerName} | ${formatSgd(
        evaluation.plan.annualPremiumSgd,
      )}/year | ${evaluation.plan.hospitalCoverageLevel} | ${formatSgd(
        evaluation.plan.criticalIllnessCoverageSgd,
      )} fictional CI coverage`,
    );
    drawText(
      `Checks: age ${evaluation.ageMatch ? "pass" : "fail"}, coverage ${
        evaluation.coverageMatch ? "pass" : "fail"
      }, budget ${evaluation.budgetMatch ? "pass" : "fail"}.`,
    );
    drawText(evaluation.explanation, { gapAfter: 5 });
  });

  drawText("Important limitations", { size: 13, isBold: true, gapAfter: 4 });
  drawText(
    "This comparison does not assess real eligibility, residency rules, medical underwriting, exclusions, waiting periods, subsidies, tax treatment, claims, pricing or policy terms. Verify current official information and consult an appropriately licensed professional.",
  );

  return document.save();
}

export async function downloadPlanningSummary(
  profile: PlanningProfile,
  evaluations: PlanEvaluation[],
): Promise<void> {
  const bytes = await createPlanningSummaryPdf(profile, evaluations);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `fictional-insurance-plan-summary-${date}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
