from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Epic",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="epics", to="projects.project")),
            ],
        ),
        migrations.CreateModel(
            name="Ticket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("backlog", "Backlog"), ("todo", "To do"), ("in_progress", "In Bearbeitung"), ("review", "Review"), ("done", "Erledigt")], default="backlog", max_length=20)),
                ("importance", models.PositiveSmallIntegerField(default=1)),
                ("urgency", models.PositiveSmallIntegerField(default=1)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("starts_on", models.DateField(blank=True, null=True)),
                ("due_on", models.DateField(blank=True, null=True)),
                ("criticality", models.CharField(choices=[("normal", "Normal"), ("warning", "Warnung"), ("critical", "Kritisch")], default="normal", max_length=20)),
                ("epic", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tickets", to="work_items.epic")),
                ("phase", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tickets", to="projects.phase")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tickets", to="projects.project")),
            ],
            options={
                "ordering": ["due_on", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="MindMapNode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("label", models.CharField(max_length=200)),
                ("notes", models.TextField(blank=True)),
                ("x", models.FloatField(default=0)),
                ("y", models.FloatField(default=0)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mindmap_nodes", to="projects.project")),
                ("ticket", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="mindmap_node", to="work_items.ticket")),
            ],
        ),
        migrations.CreateModel(
            name="MindMapEdge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("label", models.CharField(blank=True, max_length=120)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mindmap_edges", to="projects.project")),
                ("source", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="outgoing_edges", to="work_items.mindmapnode")),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="incoming_edges", to="work_items.mindmapnode")),
            ],
            options={
                "unique_together": {("source", "target")},
            },
        ),
    ]
