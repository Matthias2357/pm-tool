import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0002_phase_description"),
        ("work_items", "0003_ticket_responsible_team"),
    ]

    operations = [
        migrations.AddField(
            model_name="epic",
            name="phase",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="epics",
                to="projects.phase",
            ),
        ),
    ]
