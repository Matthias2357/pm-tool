from rest_framework import serializers

from .models import Epic, MindMapEdge, MindMapNode, Ticket


class EpicSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    phase_name = serializers.CharField(source="phase.name", read_only=True)

    class Meta:
        model = Epic
        fields = "__all__"

    def validate_progress(self, value):
        if value > 100:
            raise serializers.ValidationError("Der Fortschritt darf maximal 100 Prozent betragen.")
        return value

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        phase = attrs.get("phase", getattr(self.instance, "phase", None))
        if phase and project and phase.project_id != project.id:
            raise serializers.ValidationError({"phase": "Die Phase gehört zu einem anderen Projekt."})
        return attrs


class TicketSerializer(serializers.ModelSerializer):
    methodology_priority = serializers.SerializerMethodField()
    phase_name = serializers.CharField(source="phase.name", read_only=True)
    epic_title = serializers.CharField(source="epic.title", read_only=True)
    responsible_team_name = serializers.CharField(source="responsible_team.name", read_only=True)

    class Meta:
        model = Ticket
        fields = "__all__"

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        phase = attrs.get("phase", getattr(self.instance, "phase", None))
        epic = attrs.get("epic", getattr(self.instance, "epic", None))
        responsible_team = attrs.get("responsible_team", getattr(self.instance, "responsible_team", None))

        if phase and project and phase.project_id != project.id:
            raise serializers.ValidationError({"phase": "Die Phase gehört zu einem anderen Projekt."})
        if epic and project and epic.project_id != project.id:
            raise serializers.ValidationError({"epic": "Das Epic gehört zu einem anderen Projekt."})
        if responsible_team and project and responsible_team.project_id != project.id:
            raise serializers.ValidationError({"responsible_team": "Das verantwortliche Sub-Team gehört zu einem anderen Projekt."})
        return attrs

    def validate_progress(self, value):
        if value > 100:
            raise serializers.ValidationError("Der Fortschritt darf maximal 100 Prozent betragen.")
        return value

    def validate_importance(self, value):
        if value != -1 and not 1 <= value <= 4:
            raise serializers.ValidationError("Die Wichtigkeit muss -1 oder zwischen 1 und 4 sein.")
        return value

    def validate_urgency(self, value):
        if value != -1 and not 1 <= value <= 4:
            raise serializers.ValidationError("Die Dringlichkeit muss -1 oder zwischen 1 und 4 sein.")
        return value

    def get_methodology_priority(self, obj):
        if obj.importance == -1 or obj.urgency == -1:
            return "unprioritized"
        important = obj.importance >= 3
        urgent = obj.urgency >= 3
        if important and urgent:
            return "alpha"
        if urgent:
            return "beta"
        if important:
            return "gamma"
        return "delta"


class MindMapNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MindMapNode
        fields = "__all__"


class MindMapEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MindMapEdge
        fields = "__all__"
