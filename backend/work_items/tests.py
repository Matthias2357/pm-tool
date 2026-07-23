from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Phase, Project

from .models import Ticket


class TicketApiTests(APITestCase):
    def setUp(self):
        self.project = Project.objects.create(name="Projekt A")
        self.other_project = Project.objects.create(name="Projekt B")
        self.phase = Phase.objects.create(project=self.project, name="Umsetzung")
        self.other_phase = Phase.objects.create(project=self.other_project, name="Planung")

    def test_tickets_can_be_filtered_by_project(self):
        Ticket.objects.create(project=self.project, title="Sichtbar")
        Ticket.objects.create(project=self.other_project, title="Nicht sichtbar")

        response = self.client.get(f"/api/tickets/?project={self.project.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data["results"]], ["Sichtbar"])

    def test_ticket_rejects_phase_from_another_project(self):
        response = self.client.post(
            "/api/tickets/",
            {
                "project": self.project.id,
                "phase": self.other_phase.id,
                "title": "Falsche Phase",
                "status": "backlog",
                "importance": 1,
                "urgency": 1,
                "progress": 0,
                "criticality": "normal",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phase", response.data)

    def test_ticket_status_can_be_updated_for_drag_and_drop(self):
        ticket = Ticket.objects.create(project=self.project, phase=self.phase, title="Verschieben")

        response = self.client.patch(
            f"/api/tickets/{ticket.id}/",
            {"status": "in_progress"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "in_progress")

    def test_personal_methodology_priority_is_returned(self):
        ticket = Ticket.objects.create(
            project=self.project,
            title="Wichtig, aber nicht dringend",
            importance=4,
            urgency=1,
        )

        response = self.client.get(f"/api/tickets/{ticket.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["methodology_priority"], "gamma")

    def test_new_ticket_is_unprioritized_by_default(self):
        response = self.client.post(
            "/api/tickets/",
            {
                "project": self.project.id,
                "title": "Noch zu bewerten",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["importance"], -1)
        self.assertEqual(response.data["urgency"], -1)
        self.assertEqual(response.data["methodology_priority"], "unprioritized")
