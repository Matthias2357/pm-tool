from django.contrib import admin

from .models import Epic, MindMapEdge, MindMapNode, Ticket


@admin.register(Epic)
class EpicAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "progress")
    list_filter = ("project",)
    search_fields = ("title", "description")


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "phase", "epic", "status", "due_on", "criticality", "progress")
    list_filter = ("project", "phase", "status", "criticality")
    search_fields = ("title", "description")


@admin.register(MindMapNode)
class MindMapNodeAdmin(admin.ModelAdmin):
    list_display = ("label", "project", "ticket", "x", "y")
    list_filter = ("project",)
    search_fields = ("label", "notes")


@admin.register(MindMapEdge)
class MindMapEdgeAdmin(admin.ModelAdmin):
    list_display = ("source", "target", "label", "project")
    list_filter = ("project",)
