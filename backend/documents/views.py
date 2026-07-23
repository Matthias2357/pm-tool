from rest_framework.viewsets import ModelViewSet

from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(ModelViewSet):
    queryset = Document.objects.select_related("project", "ticket").all()
    serializer_class = DocumentSerializer
