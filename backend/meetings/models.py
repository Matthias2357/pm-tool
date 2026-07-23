from django.db import models

from core.models import TimeStampedModel
from documents.models import Document
from projects.models import Project
from work_items.models import Ticket


class Meeting(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="meetings", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    held_on = models.DateField()
    summary = models.TextField(blank=True)
    minutes = models.ForeignKey(Document, related_name="meeting_minutes", null=True, blank=True, on_delete=models.SET_NULL)
    related_tickets = models.ManyToManyField(Ticket, related_name="meetings", blank=True)

    class Meta:
        ordering = ["-held_on", "-created_at"]

    def __str__(self):
        return self.title
