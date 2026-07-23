import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("teams", "0001_initial"),
        ("work_items", "0002_alter_ticket_importance_alter_ticket_urgency"),
    ]

    operations = [
        migrations.AddField(
            model_name="ticket",
            name="responsible_team",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tickets",
                to="teams.subteam",
            ),
        ),
    ]
