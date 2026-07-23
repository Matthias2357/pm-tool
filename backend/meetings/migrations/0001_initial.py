from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("documents", "0001_initial"),
        ("projects", "0001_initial"),
        ("work_items", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Meeting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("held_on", models.DateField()),
                ("summary", models.TextField(blank=True)),
                ("minutes", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="meeting_minutes", to="documents.document")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="meetings", to="projects.project")),
                ("related_tickets", models.ManyToManyField(blank=True, related_name="meetings", to="work_items.ticket")),
            ],
            options={
                "ordering": ["-held_on", "-created_at"],
            },
        ),
    ]
