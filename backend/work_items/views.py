from rest_framework.viewsets import ModelViewSet

from .models import Epic, MindMapEdge, MindMapNode, Ticket
from .serializers import EpicSerializer, MindMapEdgeSerializer, MindMapNodeSerializer, TicketSerializer


class EpicViewSet(ModelViewSet):
    queryset = Epic.objects.select_related("project").all()
    serializer_class = EpicSerializer


class TicketViewSet(ModelViewSet):
    queryset = Ticket.objects.select_related("project", "phase", "epic").all()
    serializer_class = TicketSerializer


class MindMapNodeViewSet(ModelViewSet):
    queryset = MindMapNode.objects.select_related("project", "ticket").all()
    serializer_class = MindMapNodeSerializer


class MindMapEdgeViewSet(ModelViewSet):
    queryset = MindMapEdge.objects.select_related("project", "source", "target").all()
    serializer_class = MindMapEdgeSerializer
