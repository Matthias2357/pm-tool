from django.contrib import admin

from .models import Document, DocumentBlock, DocumentEntry, EditableNote


@admin.register(DocumentBlock)
class DocumentBlockAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "order", "created_at")
    list_filter = ("project",)
    search_fields = ("name", "description")


@admin.register(DocumentEntry)
class DocumentEntryAdmin(admin.ModelAdmin):
    list_display = ("name", "block", "entry_date", "created_at")
    list_filter = ("block__project", "block")
    search_fields = ("name", "notes")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "entry", "ticket", "document_type", "created_at")
    list_filter = ("project", "document_type")
    search_fields = ("title", "notes")


@admin.register(EditableNote)
class EditableNoteAdmin(admin.ModelAdmin):
    list_display = ("title", "entry", "document", "updated_at")
    list_filter = ("entry__block__project", "entry__block")
    search_fields = ("title", "source")
