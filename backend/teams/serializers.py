from rest_framework import serializers

from .models import SubTeam, TeamMember


class TeamMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    subteam_ids = serializers.PrimaryKeyRelatedField(source="subteams", many=True, read_only=True)

    class Meta:
        model = TeamMember
        fields = "__all__"

    def get_full_name(self, obj):
        return str(obj)


class SubTeamSerializer(serializers.ModelSerializer):
    member_details = TeamMemberSerializer(source="members", many=True, read_only=True)

    class Meta:
        model = SubTeam
        fields = "__all__"

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        members = attrs.get("members")
        if project and members is not None:
            invalid = [member.id for member in members if member.project_id != project.id]
            if invalid:
                raise serializers.ValidationError({"members": "Alle Mitglieder müssen zum selben Projekt gehören."})
        return attrs

