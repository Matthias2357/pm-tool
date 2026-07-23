from rest_framework import status
from rest_framework.test import APITestCase

from .models import Project


class ProjectApiTests(APITestCase):
    def test_creating_project_adds_default_phases(self):
        response = self.client.post(
            "/api/projects/",
            {"name": "Vereinsfest", "description": "Planung"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(pk=response.data["id"])
        self.assertEqual(
            list(project.phases.values_list("name", flat=True)),
            ["Startup Phase", "Grobplanung", "Detailplanung", "Umsetzung"],
        )

    def test_projects_can_be_filtered_by_archive_status(self):
        Project.objects.create(name="Aktiv")
        Project.objects.create(name="Archiv", is_archived=True)

        response = self.client.get("/api/projects/?archived=false")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, ["Aktiv"])

    def test_project_can_be_renamed_without_losing_phases(self):
        project = Project.objects.create(name="Alter Name")
        project.phases.create(name="Startup Phase", order=0)

        response = self.client.patch(
            f"/api/projects/{project.id}/",
            {"name": "Neuer Name"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project.refresh_from_db()
        self.assertEqual(project.name, "Neuer Name")
        self.assertEqual(project.phases.count(), 1)
