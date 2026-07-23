from rest_framework.viewsets import ModelViewSet

from .models import Meeting
from .serializers import MeetingSerializer


class MeetingViewSet(ModelViewSet):
    queryset = Meeting.objects.select_related("project", "minutes").prefetch_related("related_tickets").all()
    serializer_class = MeetingSerializer
