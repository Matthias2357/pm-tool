import django.core.validators
import django.db.models.deletion
from django.db import migrations, models

import documents.models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentBlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="document_blocks",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "name"],
                "unique_together": {("project", "name")},
            },
        ),
        migrations.CreateModel(
            name="DocumentEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("entry_date", models.DateField()),
                ("notes", models.TextField(blank=True)),
                (
                    "block",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="entries",
                        to="documents.documentblock",
                    ),
                ),
            ],
            options={
                "ordering": ["-entry_date", "-created_at"],
            },
        ),
        migrations.AddField(
            model_name="document",
            name="entry",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to="documents.documententry",
            ),
        ),
        migrations.AlterField(
            model_name="document",
            name="file",
            field=models.FileField(
                upload_to=documents.models.document_upload_path,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=["pdf", "doc", "docx", "jpg", "jpeg", "png", "gif", "webp"]
                    )
                ],
            ),
        ),
    ]
