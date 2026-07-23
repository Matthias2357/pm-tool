from django.db import models

from core.models import TimeStampedModel
from projects.models import Project
from work_items.models import Ticket


class Document(TimeStampedModel):
    class DocumentType(models.TextChoices):
        TICKET = "ticket", "Ticket-Dokument"
        MINUTES = "minutes", "Sitzungsprotokoll"
        CONTRACT = "contract", "Vertrag"
        OTHER = "other", "Sonstiges"

    project = models.ForeignKey(Project, related_name="documents", on_delete=models.CASCADE)
    ticket = models.ForeignKey(Ticket, related_name="documents", null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER)
    file = models.FileField(upload_to="documents/")
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.title
