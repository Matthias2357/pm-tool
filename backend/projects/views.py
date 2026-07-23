from rest_framework.viewsets import ModelViewSet

from .models import Phase, Project
from .serializers import PhaseSerializer, ProjectSerializer


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.prefetch_related("phases").all()
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        archived = self.request.query_params.get("archived")
        if archived in {"true", "false"}:
            queryset = queryset.filter(is_archived=archived == "true")
        return queryset


class PhaseViewSet(ModelViewSet):
    queryset = Phase.objects.select_related("project").all()
    serializer_class = PhaseSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        project = self.request.query_params.get("project")
        return queryset.filter(project_id=project) if project else queryset
