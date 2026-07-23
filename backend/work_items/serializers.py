from rest_framework import serializers

from .models import Epic, MindMapEdge, MindMapNode, Ticket


class EpicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Epic
        fields = "__all__"


class TicketSerializer(serializers.ModelSerializer):
    eisenhower_quadrant = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = "__all__"

    def get_eisenhower_quadrant(self, obj):
        important = obj.importance >= 3
        urgent = obj.urgency >= 3
        if important and urgent:
            return "do_now"
        if important:
            return "schedule"
        if urgent:
            return "delegate"
        return "discard"


class MindMapNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MindMapNode
        fields = "__all__"


class MindMapEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MindMapEdge
        fields = "__all__"
