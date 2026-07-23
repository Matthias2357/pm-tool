from django.db import models

from core.models import TimeStampedModel


class Project(TimeStampedModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Phase(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="phases", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["order", "starts_on", "name"]
        unique_together = ["project", "name"]

    def __str__(self):
        return f"{self.project}: {self.name}"
