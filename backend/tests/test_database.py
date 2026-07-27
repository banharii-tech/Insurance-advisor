from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app.database import TemporaryDatabase


class TemporaryDatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database = TemporaryDatabase(
            Path(self.temporary_directory.name) / "clearcover.sqlite3"
        )
        self.database.initialize()

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_registers_and_authenticates_separate_users(self) -> None:
        alice = self.database.register_user(
            "Alice Tan", "ALICE@example.test", "strong-pass-1"
        )
        bob = self.database.register_user(
            "Bob Lim", "bob@example.test", "strong-pass-2"
        )

        self.assertTrue(self.database.is_ready())
        self.assertEqual(self.database.count_users(), 2)
        self.assertEqual(self.database.count_sessions(), 2)
        self.assertEqual(alice.email, "alice@example.test")
        self.assertNotEqual(alice.user_id, bob.user_id)
        self.assertIsNone(
            self.database.sign_in("alice@example.test", "wrong-password")
        )
        returning = self.database.sign_in(
            "alice@example.test", "strong-pass-1"
        )
        self.assertIsNotNone(returning)
        self.assertEqual(returning.user_id, alice.user_id)

    def test_rejects_duplicate_email_and_deletes_only_the_session(self) -> None:
        session = self.database.register_user(
            "Alice Tan", "alice@example.test", "strong-pass-1"
        )
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.database.register_user(
                "Another Alice",
                "alice@example.test",
                "another-pass",
            )

        self.assertTrue(self.database.delete_session(session.session_id))
        self.assertIsNone(self.database.get_session(session.session_id))
        self.assertIsNotNone(
            self.database.sign_in("alice@example.test", "strong-pass-1")
        )

    def test_keeps_suggestion_history_isolated_by_user(self) -> None:
        alice = self.database.register_user(
            "Alice Tan", "alice@example.test", "strong-pass-1"
        )
        bob = self.database.register_user(
            "Bob Lim", "bob@example.test", "strong-pass-2"
        )
        self.database.save_suggestion(
            alice.user_id,
            "Hospital planning draft",
            "hospitalisation",
            {"title": "Hospital planning draft"},
        )

        self.assertEqual(len(self.database.list_suggestions(alice.user_id)), 1)
        self.assertEqual(self.database.list_suggestions(bob.user_id), [])

    def test_reset_removes_temporary_accounts_and_drafts(self) -> None:
        self.database.register_user(
            "Alice Tan", "alice@example.test", "strong-pass-1"
        )
        self.database.initialize(reset=True)

        self.assertEqual(self.database.count_users(), 0)
        self.assertEqual(self.database.count_sessions(), 0)


if __name__ == "__main__":
    unittest.main()
