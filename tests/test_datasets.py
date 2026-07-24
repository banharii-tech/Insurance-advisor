import csv
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_csv(filename):
    with (ROOT / filename).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames, list(reader)


def as_bool(value):
    if value not in {"true", "false"}:
        raise ValueError("Boolean values must be lowercase true or false")
    return value == "true"


class DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_headers, cls.clients = read_csv("clientdata.csv")
        cls.plan_headers, cls.plans = read_csv("insurance_plans.csv")
        cls.recommendation_headers, cls.recommendations = read_csv(
            "recommendations.csv"
        )

    def test_client_is_fictional_and_matches_issue_profile(self):
        self.assertEqual(len(self.clients), 1)
        client = self.clients[0]
        self.assertEqual(client["client_id"], "CLIENT-001")
        self.assertEqual(int(client["age"]), 34)
        self.assertEqual(client["gender"], "Female")
        self.assertEqual(client["residency_status"], "Foreigner")
        self.assertEqual(client["spouse_citizenship"], "Singapore citizen")
        self.assertEqual(int(client["annual_budget_sgd"]), 3000)
        self.assertTrue(as_bool(client["is_fictional"]))

    def test_client_dataset_contains_no_medical_history(self):
        prohibited_terms = {"medical", "health", "history", "condition"}
        for header in self.client_headers:
            normalized = header.lower().replace("_", " ")
            self.assertFalse(
                any(term in normalized for term in prohibited_terms),
                f"Client field must not capture medical history: {header}",
            )

    def test_exactly_three_fictional_plans(self):
        self.assertEqual(len(self.plans), 3)
        self.assertEqual(
            {plan["plan_id"] for plan in self.plans},
            {"PLAN-001", "PLAN-002", "PLAN-003"},
        )
        for plan in self.plans:
            self.assertTrue(plan["provider_name"].startswith("Example Provider"))
            self.assertTrue(plan["plan_name"].startswith("Example "))
            self.assertTrue(as_bool(plan["is_fictional"]))
            self.assertLessEqual(int(plan["min_age"]), int(plan["max_age"]))
            self.assertGreater(int(plan["annual_premium_sgd"]), 0)

    def test_each_plan_has_an_explained_recommendation(self):
        self.assertEqual(len(self.recommendations), len(self.plans))
        self.assertEqual(
            {row["plan_id"] for row in self.recommendations},
            {plan["plan_id"] for plan in self.plans},
        )
        for row in self.recommendations:
            self.assertEqual(row["client_id"], "CLIENT-001")
            self.assertTrue(row["explanation"].strip())

    def test_recommendations_follow_documented_rules(self):
        client = self.clients[0]
        plans = {plan["plan_id"]: plan for plan in self.plans}
        client_age = int(client["age"])
        client_budget = int(client["annual_budget_sgd"])

        eligible = []
        for row in self.recommendations:
            plan = plans[row["plan_id"]]
            age_match = int(plan["min_age"]) <= client_age <= int(plan["max_age"])
            coverage_match = (
                not as_bool(client["needs_government_hospital_plan"])
                or as_bool(plan["includes_government_hospital_plan"])
            ) and (
                not as_bool(client["needs_critical_illness_plan"])
                or as_bool(plan["includes_critical_illness_plan"])
            )
            budget_match = int(plan["annual_premium_sgd"]) <= client_budget

            self.assertEqual(as_bool(row["age_match"]), age_match)
            self.assertEqual(as_bool(row["coverage_match"]), coverage_match)
            self.assertEqual(as_bool(row["budget_match"]), budget_match)
            self.assertEqual(
                int(row["criteria_met_count"]),
                sum((age_match, coverage_match, budget_match)),
            )

            if age_match and coverage_match and budget_match:
                eligible.append(plan)
            else:
                self.assertEqual(row["recommendation_status"], "Not recommended")

        expected = sorted(
            eligible,
            key=lambda plan: (
                -int(plan["critical_illness_coverage_sgd"]),
                int(plan["annual_premium_sgd"]),
                plan["plan_id"],
            ),
        )[0]
        recommended = [
            row
            for row in self.recommendations
            if row["recommendation_status"] == "Recommended"
        ]
        self.assertEqual(len(recommended), 1)
        self.assertEqual(recommended[0]["plan_id"], expected["plan_id"])
        self.assertEqual(expected["plan_id"], "PLAN-002")


if __name__ == "__main__":
    unittest.main()
