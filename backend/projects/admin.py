from django.contrib import admin

from .models import Phase, Project


class PhaseInline(admin.TabularInline):
    model = Phase
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "is_archived", "created_at")
    search_fields = ("name", "description")
    inlines = [PhaseInline]


@admin.register(Phase)
class PhaseAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "order", "starts_on", "ends_on")
    list_filter = ("project",)
