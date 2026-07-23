from django.db import models

from core.models import TimeStampedModel
from projects.models import Project


class TeamMember(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="team_members", on_delete=models.CASCADE)
    last_name = models.CharField("Name", max_length=120)
    first_name = models.CharField("Vorname", max_length=120)
    role = models.CharField("Funktion", max_length=160, blank=True)
    email = models.EmailField("E-Mail", blank=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class SubTeam(TimeStampedModel):
    project = models.ForeignKey(Project, related_name="subteams", on_delete=models.CASCADE)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(TeamMember, related_name="subteams", blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["project", "name"], name="unique_subteam_name_per_project"),
        ]

    def __str__(self):
        return self.name

