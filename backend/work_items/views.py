from rest_framework.viewsets import ModelViewSet

from .models import Epic, MindMapEdge, MindMapNode, Ticket
from .serializers import EpicSerializer, MindMapEdgeSerializer, MindMapNodeSerializer, TicketSerializer


class EpicViewSet(ModelViewSet):
    queryset = Epic.objects.select_related("project", "phase").all()
    serializer_class = EpicSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        project = self.request.query_params.get("project")
        return queryset.filter(project_id=project) if project else queryset


class TicketViewSet(ModelViewSet):
    queryset = Ticket.objects.select_related("project", "phase", "epic", "responsible_team").all()
    serializer_class = TicketSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        filters = {
            field: self.request.query_params.get(field)
            for field in ("project", "phase", "epic", "status")
            if self.request.query_params.get(field)
        }
        return queryset.filter(**filters)


class MindMapNodeViewSet(ModelViewSet):
    queryset = MindMapNode.objects.select_related("project", "ticket").all()
    serializer_class = MindMapNodeSerializer


class MindMapEdgeViewSet(ModelViewSet):
    queryset = MindMapEdge.objects.select_related("project", "source", "target").all()
    serializer_class = MindMapEdgeSerializer
