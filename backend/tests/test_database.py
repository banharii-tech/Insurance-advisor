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

    def test_initializes_and_reports_ready(self) -> None:
        self.assertTrue(self.database.is_ready())
        self.assertEqual(self.database.count_demo_sessions(), 0)

    def test_creates_and_deletes_disposable_demo_session(self) -> None:
        session = self.database.create_demo_session()

        self.assertTrue(session.session_id)
        self.assertIn("+00:00", session.created_at)
        self.assertEqual(self.database.count_demo_sessions(), 1)
        self.assertTrue(self.database.delete_demo_session(session.session_id))
        self.assertEqual(self.database.count_demo_sessions(), 0)


if __name__ == "__main__":
    unittest.main()
