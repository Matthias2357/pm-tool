import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("projects", "0002_phase_description"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_name", models.CharField(max_length=120, verbose_name="Name")),
                ("first_name", models.CharField(max_length=120, verbose_name="Vorname")),
                ("role", models.CharField(blank=True, max_length=160, verbose_name="Funktion")),
                ("email", models.EmailField(blank=True, max_length=254, verbose_name="E-Mail")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_members", to="projects.project")),
            ],
            options={"ordering": ["last_name", "first_name"]},
        ),
        migrations.CreateModel(
            name="SubTeam",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("description", models.TextField(blank=True)),
                ("members", models.ManyToManyField(blank=True, related_name="subteams", to="teams.teammember")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subteams", to="projects.project")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="subteam",
            constraint=models.UniqueConstraint(fields=("project", "name"), name="unique_subteam_name_per_project"),
        ),
    ]

