from pathlib import Path

from rest_framework import serializers

from .models import Document, DocumentBlock, DocumentEntry, EditableNote


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_kind = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    editable_note_id = serializers.SerializerMethodField()

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
        return Path(obj.file.name).name if obj.file and obj.file.name else ""

    def get_file_url(self, obj):
        return obj.file.url if obj.file and obj.file.name else ""

    def get_file_kind(self, obj):
        if not obj.file or not obj.file.name:
            return "other"
        extension = Path(obj.file.name).suffix.lower()
        if extension in IMAGE_EXTENSIONS:
            return "image"
        if extension == ".pdf":
            return "pdf"
        if extension in {".doc", ".docx"}:
            return "word"
        return "other"

    def get_file_size(self, obj):
        if not obj.file or not obj.file.name:
            return 0
        try:
            return obj.file.size
        except (OSError, ValueError):
            return 0

    def get_editable_note_id(self, obj):
        try:
            return obj.editable_note.id
        except EditableNote.DoesNotExist:
            return None

    def update(self, instance, validated_data):
        old_name = instance.file.name if "file" in validated_data and instance.file else ""
        storage = instance.file.storage if old_name else None
        updated = super().update(instance, validated_data)
        if storage and old_name != updated.file.name:
            storage.delete(old_name)
        return updated


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


class EditableNoteSerializer(serializers.ModelSerializer):
    document_data = DocumentSerializer(source="document", read_only=True)

    class Meta:
        model = EditableNote
        fields = "__all__"

    def validate(self, attrs):
        entry = attrs.get("entry", getattr(self.instance, "entry", None))
        document = attrs.get("document", getattr(self.instance, "document", None))
        if document and entry and document.entry_id != entry.id:
            raise serializers.ValidationError({"document": "Das PDF gehört zu einem anderen Eintrag."})
        return attrs
