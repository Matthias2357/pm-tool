from rest_framework.viewsets import ModelViewSet

from .models import Document, DocumentBlock, DocumentEntry
from .serializers import DocumentBlockSerializer, DocumentEntrySerializer, DocumentSerializer


class DocumentViewSet(ModelViewSet):
    queryset = Document.objects.select_related("project", "ticket", "entry__block").all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        entry = self.request.query_params.get("entry")
        project = self.request.query_params.get("project")
        if entry:
            queryset = queryset.filter(entry_id=entry)
        if project:
            queryset = queryset.filter(project_id=project)
        return queryset


class DocumentEntryViewSet(ModelViewSet):
    queryset = DocumentEntry.objects.select_related("block__project").prefetch_related("documents").all()
    serializer_class = DocumentEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        block = self.request.query_params.get("block")
        return queryset.filter(block_id=block) if block else queryset


class DocumentBlockViewSet(ModelViewSet):
    queryset = (
        DocumentBlock.objects.select_related("project")
        .prefetch_related("entries__documents")
        .all()
    )
    serializer_class = DocumentBlockSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        project = self.request.query_params.get("project")
        return queryset.filter(project_id=project) if project else queryset
