from django.db import models

from core.models import TimeStampedModel
from projects.models import Phase, Project


class Epic(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="epics", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    progress = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return self.title


class Ticket(TimeStampedModel):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In Bearbeitung"
        REVIEW = "review", "Review"
        DONE = "done", "Erledigt"

    class Criticality(models.TextChoices):
        NORMAL = "normal", "Normal"
        WARNING = "warning", "Warnung"
        CRITICAL = "critical", "Kritisch"

    project = models.ForeignKey(Project, related_name="tickets", on_delete=models.CASCADE)
    phase = models.ForeignKey(Phase, related_name="tickets", null=True, blank=True, on_delete=models.SET_NULL)
    epic = models.ForeignKey(Epic, related_name="tickets", null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BACKLOG)
    importance = models.SmallIntegerField(default=-1)
    urgency = models.SmallIntegerField(default=-1)
    progress = models.PositiveSmallIntegerField(default=0)
    starts_on = models.DateField(null=True, blank=True)
    due_on = models.DateField(null=True, blank=True)
    criticality = models.CharField(max_length=20, choices=Criticality.choices, default=Criticality.NORMAL)

    class Meta:
        ordering = ["due_on", "created_at"]

    def __str__(self):
        return self.title


class MindMapNode(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="mindmap_nodes", on_delete=models.CASCADE)
    ticket = models.OneToOneField(Ticket, related_name="mindmap_node", null=True, blank=True, on_delete=models.SET_NULL)
    label = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)

    def __str__(self):
        return self.label


class MindMapEdge(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="mindmap_edges", on_delete=models.CASCADE)
    source = models.ForeignKey(MindMapNode, related_name="outgoing_edges", on_delete=models.CASCADE)
    target = models.ForeignKey(MindMapNode, related_name="incoming_edges", on_delete=models.CASCADE)
    label = models.CharField(max_length=120, blank=True)

    class Meta:
        unique_together = ["source", "target"]

    def __str__(self):
        return f"{self.source} -> {self.target}"
