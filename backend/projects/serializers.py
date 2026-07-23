from rest_framework import serializers

from .models import Phase, Project

DEFAULT_PHASES = ("Startup Phase", "Grobplanung", "Detailplanung", "Umsetzung")


class PhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Phase
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    phases = PhaseSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = "__all__"

    def create(self, validated_data):
        project = super().create(validated_data)
        Phase.objects.bulk_create(
            Phase(project=project, name=name, order=order)
            for order, name in enumerate(DEFAULT_PHASES)
        )
        return project
