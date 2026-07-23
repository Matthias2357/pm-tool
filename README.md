# PM Tool

Browserbasiertes Projektmanagement-Tool fuer private Vereinsarbeit. Das Ziel ist eine lokale Alternative zu Trello/Jira mit Kanban, Epics, Timeline, Mind-Map, Dokumentenverwaltung, Sitzungschronologie und Eisenhower-Priorisierung.

## Funktionsumfang

- Kanban-System mit Epics und Tickets
- Zeitleisten-Ansicht fuer chronologische Planung
- Mind-Map mit Verbindungen und Ticket-Erzeugung aus Knoten
- Fortschrittsuebersicht mit Warnung bei kritischen Elementen
- Eisenhower-Matrix fuer Priorisierung
- Projektphasen, z. B. Startup Phase, Grobplanung, Detailplanung und Umsetzung
- Dokumentendatenbank fuer Ticket-Dokumente, Sitzungsprotokolle und Vertraege
- Sitzungschronologie mit Dokumentbezug
- Prompt-Log in `log_of_vibing`
- Lokaler Betrieb per Docker Compose
- Backup-Strategie fuer Datenbank und Dokumente

## Projektstruktur

```text
backend/        Django API und Datenmodell
frontend/       React/Vite Browser-App
docs/           Architektur- und Projektdokumentation
scripts/        Hilfsskripte, z. B. Backup
../pm-tool-contents/
                externe Datenbank-, Dokument- und Backup-Ablage
```

## Starten

1. Beispielkonfiguration kopieren:

```bash
cp .env.example .env
```

2. Werte in `.env` anpassen, besonders Passwoerter und `DJANGO_SECRET_KEY`.

`PM_TOOL_CONTENTS_DIR` legt den Speicherort aller Nutzdaten fest. Der
Standardwert `../pm-tool-contents` entspricht bei einem Repository unter
`~/pm-tool` dem Ordner `~/pm-tool-contents`.

3. Container starten:

```bash
docker compose up --build
```

4. App oeffnen:

```text
Frontend: http://localhost:5173
Backend API: http://localhost:8000/api/
Admin: http://localhost:8000/admin/
```

## Datenbank vorbereiten

Nach dem ersten Start:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py create_example_project
```

## Backup

```bash
./scripts/backup.sh
```

Das Backup landet unter
`<PM_TOOL_CONTENTS_DIR>/backups/<zeitstempel>/` und enthaelt einen
PostgreSQL-Dump sowie die Uploads.

## Datenschutz und GitHub

Diese Dateien und Ordner gehoeren nicht ins Repository:

- `.env`
- `PM_TOOL_CONTENTS_DIR` (standardmaessig `../pm-tool-contents`)
- `log_of_vibing`
- Datenbank-Dumps

Die Software kann dadurch oeffentlich auf GitHub liegen, ohne private Vereins- oder Projektdaten zu veroeffentlichen.

## Architektur

Die Architektur ist in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) dokumentiert.
