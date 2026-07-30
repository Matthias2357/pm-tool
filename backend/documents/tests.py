import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project

from .models import Document, DocumentBlock, DocumentEntry, EditableNote


class DocumentApiTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.temp_media = tempfile.TemporaryDirectory()
        cls.media_override = override_settings(MEDIA_ROOT=cls.temp_media.name)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        cls.temp_media.cleanup()
        super().tearDownClass()

    def setUp(self):
        self.project = Project.objects.create(name="Fest")
        self.block = DocumentBlock.objects.create(
            project=self.project,
            name="Festausschusssitzungen",
        )
        self.entry = DocumentEntry.objects.create(
            block=self.block,
            name="Sitzungsprotokoll",
            entry_date="2026-07-23",
            notes="Planungsstand",
        )

    def test_block_api_returns_entries_and_multiple_documents(self):
        for name, content_type in (("protokoll.pdf", "application/pdf"), ("lageplan.png", "image/png")):
            response = self.client.post(
                "/api/documents/",
                {
                    "project": self.project.id,
                    "entry": self.entry.id,
                    "title": name,
                    "document_type": "other",
                    "file": SimpleUploadedFile(name, b"test content", content_type=content_type),
                },
                format="multipart",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.get(f"/api/document-blocks/?project={self.project.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        block = response.data["results"][0]
        self.assertEqual(block["name"], "Festausschusssitzungen")
        self.assertEqual(len(block["entries"][0]["documents"]), 2)
        self.assertEqual(
            {document["file_kind"] for document in block["entries"][0]["documents"]},
            {"pdf", "image"},
        )

    def test_unsupported_file_extension_is_rejected(self):
        response = self.client.post(
            "/api/documents/",
            {
                "project": self.project.id,
                "entry": self.entry.id,
                "title": "Programm",
                "document_type": "other",
                "file": SimpleUploadedFile("programm.exe", b"unsafe"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)

    def test_document_block_can_be_renamed_without_losing_entries(self):
        response = self.client.patch(
            f"/api/document-blocks/{self.block.id}/",
            {"name": "Festleitersitzungen"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.block.refresh_from_db()
        self.assertEqual(self.block.name, "Festleitersitzungen")
        self.assertEqual(self.block.entries.count(), 1)

    def test_document_file_can_be_replaced_without_losing_new_file_reference(self):
        document = Document.objects.create(
            project=self.project,
            entry=self.entry,
            title="Planungsnotiz",
            file=SimpleUploadedFile("alte-notiz.pdf", b"old pdf"),
        )
        old_name = document.file.name
        storage = document.file.storage

        response = self.client.patch(
            f"/api/documents/{document.id}/",
            {
                "title": "Aktualisierte Planungsnotiz",
                "file": SimpleUploadedFile("neue-notiz.pdf", b"new pdf", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["file_name"], "neue-notiz.pdf")
        document.refresh_from_db()
        self.assertTrue(document.file.name.endswith("neue-notiz.pdf"))
        self.assertTrue(storage.exists(document.file.name))
        self.assertFalse(storage.exists(old_name))

    def test_editable_note_keeps_source_and_generated_document_link(self):
        document = Document.objects.create(
            project=self.project,
            entry=self.entry,
            title="Planungsnotiz",
            file=SimpleUploadedFile("planungsnotiz.pdf", b"pdf"),
        )
        response = self.client.post(
            "/api/editable-notes/",
            {
                "entry": self.entry.id,
                "document": document.id,
                "title": "Planungsnotiz",
                "source": "# Stand\n\n$a^2 + b^2 = c^2$",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        note = EditableNote.objects.get(pk=response.data["id"])
        update = self.client.patch(
            f"/api/editable-notes/{note.id}/",
            {"source": "# Neuer Stand"},
            format="json",
        )

        self.assertEqual(update.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.source, "# Neuer Stand")
        self.assertEqual(note.document_id, document.id)
