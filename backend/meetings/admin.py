from django.contrib import admin

from .models import Meeting


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "held_on", "minutes")
    list_filter = ("project", "held_on")
    search_fields = ("title", "summary")
    filter_horizontal = ("related_tickets",)
