# Insurance Advisor

> **Project status:** Work in progress. The initial version is expected to be completed by **July 31, 2026**.

A small learning prototype that demonstrates transparent matching between a
fictional Singapore client profile and fictional insurance-plan categories.

> [!IMPORTANT]
> All client, provider, product, premium, and coverage information in this
> repository is fictional. This prototype is for learning and demonstration
> only. It is not financial advice and must not be used to make insurance
> purchasing decisions.

## Dataset

The prototype contains the four deliverables requested by
[KAN-5](https://banhari.atlassian.net/browse/KAN-5):

- `clientdata.csv` contains one fictional profile: a 34-year-old female
  foreigner married to a Singapore citizen, with an annual insurance budget of
  S$3,000. It deliberately contains no medical-history fields.
- `insurance_plans.csv` contains exactly three fictional comparison plans.
  Every plan combines public/government-hospital and critical-illness
  categories so both stated needs can be compared.
- `recommendations.csv` evaluates every plan against the client using the
  rules below and gives a plain-language explanation.
- `README.md` documents the data, assumptions, rules, and limitations.

The provider and product names use `Example` prefixes to make clear that they
do not represent real insurers or products.

## Matching rules

The comparison uses only three simple, deterministic checks:

1. `age_match` is true when `min_age <= client age <= max_age`.
2. `coverage_match` is true when the plan includes every coverage category
   requested by the client.
3. `budget_match` is true when the annual premium is no more than the client's
   annual budget.

`criteria_met_count` is the number of checks that pass. It is a transparent
comparison count, not a financial-suitability score.

A plan is a candidate only when all three checks pass. The recommended
candidate has the greatest fictional critical-illness coverage. Ties are
resolved by lower annual premium and then `plan_id`. Other candidates are
marked `Alternative`; plans that fail a check are marked `Not recommended`.

Residency and spouse citizenship are descriptive only. They are not used as
eligibility rules because this fictional dataset does not provide a regulatory
or product-specific basis for doing so.

## Result

`PLAN-002` is the prototype recommendation because it:

- accepts the fictional client's age;
- includes both requested coverage categories;
- costs exactly S$3,000 per year, within the stated budget; and
- has the greatest fictional critical-illness coverage among the plans that
  meet all three checks.

`PLAN-001` remains an in-budget alternative with lower fictional
critical-illness coverage. `PLAN-003` is not recommended because its S$3,600
annual premium exceeds the budget by S$600.

## Validation

Run the standard-library test suite with Python 3:

```bash
python3 -m unittest discover -s tests -v
```

The tests verify the fictional-data markers, exact record counts, absence of
medical-history fields, identifier relationships, explanations, and matching
rule calculations.

## Limitations

The prototype does not assess actual product eligibility, residency rules,
medical underwriting, exclusions, waiting periods, subsidies, tax treatment,
claims, or current pricing and policy terms. It contains no real customer,
insurer, or product data. Anyone seeking insurance guidance should verify
current official information and speak with an appropriately licensed
professional.
