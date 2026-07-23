from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project
from work_items.models import Ticket

from .models import SubTeam, TeamMember


class TeamApiTests(APITestCase):
    def setUp(self):
        self.project = Project.objects.create(name="Vereinsfest")

    def test_members_can_belong_to_multiple_subteams_and_subteam_can_own_ticket(self):
        member = TeamMember.objects.create(
            project=self.project,
            first_name="Anna",
            last_name="Beispiel",
            role="Koordination",
            email="anna@example.com",
        )
        bar_team = SubTeam.objects.create(project=self.project, name="Bar-Team")
        setup_team = SubTeam.objects.create(project=self.project, name="Aufbau-Team")
        bar_team.members.add(member)
        setup_team.members.add(member)

        ticket = Ticket.objects.create(project=self.project, title="Getränke bestellen")
        response = self.client.patch(
            f"/api/tickets/{ticket.id}/",
            {"responsible_team": bar_team.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["responsible_team"], bar_team.id)
        self.assertEqual(response.data["responsible_team_name"], "Bar-Team")
        self.assertEqual(member.subteams.count(), 2)

    def test_subteam_rejects_members_from_another_project(self):
        other_project = Project.objects.create(name="Anderes Projekt")
        other_member = TeamMember.objects.create(
            project=other_project,
            first_name="Max",
            last_name="Fremd",
        )
        response = self.client.post(
            "/api/subteams/",
            {"project": self.project.id, "name": "Bar-Team", "members": [other_member.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

