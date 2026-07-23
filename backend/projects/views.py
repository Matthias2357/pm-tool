from rest_framework.viewsets import ModelViewSet

from .models import Phase, Project
from .serializers import PhaseSerializer, ProjectSerializer


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.prefetch_related("phases").all()
    serializer_class = ProjectSerializer


class PhaseViewSet(ModelViewSet):
    queryset = Phase.objects.select_related("project").all()
    serializer_class = PhaseSerializer
