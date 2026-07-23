from django.db import models
from django.core.validators import FileExtensionValidator

from core.models import TimeStampedModel
from projects.models import Project
from work_items.models import Ticket


class DocumentBlock(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="document_blocks", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        unique_together = ["project", "name"]

    def __str__(self):
        return self.name


class DocumentEntry(TimeStampedModel):
    block = models.ForeignKey(DocumentBlock, related_name="entries", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    entry_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-entry_date", "-created_at"]

    def __str__(self):
        return self.name


def document_upload_path(instance, filename):
    entry = f"entry_{instance.entry_id}" if instance.entry_id else "unfiled"
    return f"documents/project_{instance.project_id}/{entry}/{filename}"


class Document(TimeStampedModel):
    class DocumentType(models.TextChoices):
        TICKET = "ticket", "Ticket-Dokument"
        MINUTES = "minutes", "Sitzungsprotokoll"
        CONTRACT = "contract", "Vertrag"
        OTHER = "other", "Sonstiges"

    project = models.ForeignKey(Project, related_name="documents", on_delete=models.CASCADE)
    ticket = models.ForeignKey(Ticket, related_name="documents", null=True, blank=True, on_delete=models.SET_NULL)
    entry = models.ForeignKey(
        DocumentEntry,
        related_name="documents",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER)
    file = models.FileField(
        upload_to=document_upload_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["pdf", "doc", "docx", "jpg", "jpeg", "png", "gif", "webp"]
            )
        ],
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.title


class EditableNote(TimeStampedModel):
    entry = models.ForeignKey(DocumentEntry, related_name="editable_notes", on_delete=models.CASCADE)
    document = models.OneToOneField(
        Document,
        related_name="editable_note",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    title = models.CharField(max_length=200)
    source = models.TextField()

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
