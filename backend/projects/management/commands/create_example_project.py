from django.core.management.base import BaseCommand

from projects.models import Phase, Project


class Command(BaseCommand):
    help = "Legt ein Beispielprojekt mit den vier geplanten Phasen an."

    def handle(self, *args, **options):
        project, created = Project.objects.get_or_create(
            name="Beispielprojekt",
            defaults={"description": "Startprojekt fuer Vereinsarbeit und Planung."},
        )

        phase_names = ["Startup Phase", "Grobplanung", "Detailplanung", "Umsetzung"]
        for index, name in enumerate(phase_names, start=1):
            Phase.objects.get_or_create(project=project, name=name, defaults={"order": index})

        action = "erstellt" if created else "gefunden"
        self.stdout.write(self.style.SUCCESS(f"Beispielprojekt {action}: {project.name}"))
