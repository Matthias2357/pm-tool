from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("work_items", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ticket",
            name="importance",
            field=models.SmallIntegerField(default=-1),
        ),
        migrations.AlterField(
            model_name="ticket",
            name="urgency",
            field=models.SmallIntegerField(default=-1),
        ),
    ]
