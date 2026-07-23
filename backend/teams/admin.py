from django.contrib import admin

from .models import SubTeam, TeamMember


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "role", "email", "project")
    list_filter = ("project",)
    search_fields = ("last_name", "first_name", "role", "email")


@admin.register(SubTeam)
class SubTeamAdmin(admin.ModelAdmin):
    list_display = ("name", "project")
    list_filter = ("project",)
    filter_horizontal = ("members",)

