from pathlib import Path

from rest_framework import serializers

from .models import Document, DocumentBlock, DocumentEntry


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_kind = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = "__all__"

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        entry = attrs.get("entry", getattr(self.instance, "entry", None))
        ticket = attrs.get("ticket", getattr(self.instance, "ticket", None))
        if entry and project and entry.block.project_id != project.id:
            raise serializers.ValidationError({"entry": "Der Eintrag gehört zu einem anderen Projekt."})
        if ticket and project and ticket.project_id != project.id:
            raise serializers.ValidationError({"ticket": "Das Ticket gehört zu einem anderen Projekt."})
        return attrs

    def validate_file(self, value):
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("Eine Datei darf maximal 50 MB groß sein.")
        return value

    def get_file_name(self, obj):
        return Path(obj.file.name).name

    def get_file_url(self, obj):
        return obj.file.url

    def get_file_kind(self, obj):
        extension = Path(obj.file.name).suffix.lower()
        if extension in IMAGE_EXTENSIONS:
            return "image"
        if extension == ".pdf":
            return "pdf"
        if extension in {".doc", ".docx"}:
            return "word"
        return "other"

    def get_file_size(self, obj):
        try:
            return obj.file.size
        except OSError:
            return 0


class DocumentEntrySerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentEntry
        fields = "__all__"


class DocumentBlockSerializer(serializers.ModelSerializer):
    entries = DocumentEntrySerializer(many=True, read_only=True)

    class Meta:
        model = DocumentBlock
        fields = "__all__"
