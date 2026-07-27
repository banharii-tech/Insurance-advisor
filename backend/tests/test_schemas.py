import unittest

from pydantic import ValidationError

from app.schemas import ChatExtraction


class ChatExtractionTests(unittest.TestCase):
    def test_ready_only_when_all_required_criteria_are_valid(self) -> None:
        extraction = ChatExtraction.model_validate(
            {
                "assistant_message": "Please review these details.",
                "request_intent": "combined",
                "unsupported_topic": None,
                "criteria": {
                    "age": 34,
                    "annual_budget_sgd": 3000,
                    "residency_status": "Foreigner",
                    "spouse_citizenship": "Singapore citizen",
                    "hospitalisation": {
                        "required": True,
                        "government_hospital": True,
                    },
                    "critical_illness": {"required": True},
                },
                "missing_fields": ["age"],
                "needs_confirmation": True,
                "ready_for_review": False,
            }
        )
        self.assertTrue(extraction.ready_for_review)
        self.assertTrue(extraction.needs_confirmation)
        self.assertEqual(extraction.missing_fields, [])

    def test_invalid_age_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            ChatExtraction.model_validate(
                {
                    "assistant_message": "What is your age?",
                    "request_intent": "hospitalisation",
                    "unsupported_topic": None,
                    "criteria": {"age": 12},
                    "missing_fields": [],
                    "needs_confirmation": False,
                    "ready_for_review": False,
                }
            )

    def test_at_least_one_coverage_category_is_required(self) -> None:
        extraction = ChatExtraction.model_validate(
            {
                "assistant_message": "Which coverage would you like?",
                "request_intent": "undetermined",
                "unsupported_topic": None,
                "criteria": {
                    "age": 34,
                    "annual_budget_sgd": 3000,
                    "residency_status": "Foreigner",
                    "spouse_citizenship": "Not applicable",
                    "hospitalisation": {
                        "required": False,
                        "government_hospital": False,
                    },
                    "critical_illness": {"required": False},
                },
                "missing_fields": [],
                "needs_confirmation": False,
                "ready_for_review": True,
            }
        )
        self.assertFalse(extraction.ready_for_review)
        self.assertEqual(
            extraction.missing_fields,
            ["supported_plan_type"],
        )

    def test_unsupported_request_requires_supported_plan_choice(self) -> None:
        extraction = ChatExtraction.model_validate(
            {
                "assistant_message": (
                    "I cannot create a life plan, but I can guide a public "
                    "hospital or critical illness comparison."
                ),
                "request_intent": "unsupported",
                "unsupported_topic": "life_plan",
                "criteria": {},
                "missing_fields": [],
                "needs_confirmation": True,
                "ready_for_review": True,
            }
        )

        self.assertFalse(extraction.ready_for_review)
        self.assertFalse(extraction.needs_confirmation)
        self.assertIn("supported_plan_type", extraction.missing_fields)

    def test_supported_intent_populates_the_coverage_flags(self) -> None:
        expected_flags = {
            "hospitalisation": (True, False),
            "critical_illness": (False, True),
            "combined": (True, True),
        }

        for intent, expected in expected_flags.items():
            with self.subTest(intent=intent):
                extraction = ChatExtraction.model_validate(
                    {
                        "assistant_message": "What is your age?",
                        "request_intent": intent,
                        "criteria": {},
                        "missing_fields": [],
                        "needs_confirmation": False,
                        "ready_for_review": False,
                    }
                )

                self.assertEqual(
                    (
                        extraction.criteria.hospitalisation.required,
                        extraction.criteria.critical_illness.required,
                    ),
                    expected,
                )
                self.assertNotIn(
                    "coverage_needs",
                    extraction.missing_fields,
                )


if __name__ == "__main__":
    unittest.main()
