from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "ticket", "document_type", "created_at")
    list_filter = ("project", "document_type")
    search_fields = ("title", "notes")
