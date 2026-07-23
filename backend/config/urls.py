from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from documents.views import DocumentBlockViewSet, DocumentEntryViewSet, DocumentViewSet
from meetings.views import MeetingViewSet
from projects.views import PhaseViewSet, ProjectViewSet
from work_items.views import EpicViewSet, MindMapEdgeViewSet, MindMapNodeViewSet, TicketViewSet


router = DefaultRouter()
router.register("projects", ProjectViewSet)
router.register("phases", PhaseViewSet)
router.register("epics", EpicViewSet)
router.register("tickets", TicketViewSet)
router.register("mindmap-nodes", MindMapNodeViewSet)
router.register("mindmap-edges", MindMapEdgeViewSet)
router.register("documents", DocumentViewSet)
router.register("document-blocks", DocumentBlockViewSet)
router.register("document-entries", DocumentEntryViewSet)
router.register("meetings", MeetingViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
