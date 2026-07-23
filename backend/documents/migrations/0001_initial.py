from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("projects", "0001_initial"),
        ("work_items", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("document_type", models.CharField(choices=[("ticket", "Ticket-Dokument"), ("minutes", "Sitzungsprotokoll"), ("contract", "Vertrag"), ("other", "Sonstiges")], default="other", max_length=20)),
                ("file", models.FileField(upload_to="documents/")),
                ("notes", models.TextField(blank=True)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="documents", to="projects.project")),
                ("ticket", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="documents", to="work_items.ticket")),
            ],
        ),
    ]
