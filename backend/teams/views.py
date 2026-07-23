from rest_framework.viewsets import ModelViewSet

from .models import SubTeam, TeamMember
from .serializers import SubTeamSerializer, TeamMemberSerializer


class TeamMemberViewSet(ModelViewSet):
    queryset = TeamMember.objects.prefetch_related("subteams").all()
    serializer_class = TeamMemberSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        project = self.request.query_params.get("project")
        return queryset.filter(project_id=project) if project else queryset


class SubTeamViewSet(ModelViewSet):
    queryset = SubTeam.objects.select_related("project").prefetch_related("members").all()
    serializer_class = SubTeamSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        project = self.request.query_params.get("project")
        return queryset.filter(project_id=project) if project else queryset

