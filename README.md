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

Das Frontend greift standardmaessig ueber den eingebauten Pfad `/api` auf das
Backend zu. Dadurch funktioniert die Anwendung auch beim Zugriff ueber eine
andere lokale IP, ohne dass der Browser einen separaten API-Host erreichen muss.

## Datenbank vorbereiten

Ausstehende Datenbankmigrationen werden beim Start des Backend-Containers
automatisch ausgeführt. Ein Administratorkonto kann bei Bedarf anschließend
angelegt werden:

```bash
docker compose exec backend python manage.py createsuperuser
```

Danach kann unter `http://localhost:5173` direkt ein eigenes Projekt angelegt
werden. Die benötigten Projektphasen werden frei in der Timeline erstellt.
Optional erzeugt der folgende Befehl ein zusätzliches Beispielprojekt mit den
Phasen Startup, Grobplanung, Detailplanung und Umsetzung:

```bash
docker compose exec backend python manage.py create_example_project
```

## Bedienung

- Über die Projektauswahl oben wird das aktive Projekt gewechselt.
- `+ Projekt` legt ein zunächst phasenloses Projekt an.
- `+ Ticket` erstellt eine neue Kanban-Karte.
- Im Kanban-Board lassen sich Karten per Drag-and-drop zwischen den Spalten
  verschieben.
- Ein Klick auf eine Karte öffnet alle Details zum Bearbeiten oder Löschen.
- In der Timeline lassen sich projektspezifische Phasen mit optionalem Start-
  und Enddatum sowie einer kurzen Beschreibung anlegen. Tickets ohne Phase
  stehen oben in einem Sammelfeld und können per Drag-and-drop in eine Phase
  oder zurück verschoben werden.
- Die Übersicht zeigt diese Phasen mit Zeitraum und Beschreibung an einem
  vertikalen Zeitstrahl.
- Die Phasenzuordnung ist dieselbe wie im Kanban und steht dort unmittelbar im
  Ticketformular zur Verfügung.
- Unter `Methodik` verwendet die individuelle Eisenhower-Matrix:
  Alpha (wichtig/dringend), Beta (nicht wichtig/dringend), Gamma
  (wichtig/nicht dringend) und Delta (nicht wichtig/nicht dringend).
- Tickets lassen sich in der individuellen Matrix per Drag-and-drop neu
  priorisieren. Gamma-Aufgaben werden erneut bewertet und erst als
  Alpha-Aufgaben bearbeitet, sobald sie dringend werden.
- Neue Tickets starten mit Wichtigkeit und Dringlichkeit `-1` im Feld
  `Noch ohne Prio`. Von dort werden sie per Drag-and-drop erstmals Alpha, Beta,
  Gamma oder Delta zugeordnet.
- Im Dokumentenbereich lassen sich thematische Blöcke und darin datierte
  Einträge mit Notizen erstellen. Jeder Eintrag kann mehrere PDFs,
  Word-Dokumente und Bilder enthalten.
- Blöcke und Dateilisten sind ein- und ausklappbar. Bilder und PDFs lassen sich
  in einer großen Vorschau öffnen; Bilder können dort gezoomt werden.
- In einem Dokumenteneintrag lassen sich editierbare Notizen mit Markdown und
  eingebetteten TeX-Formeln erstellen. Beim Speichern wird eine PDF erzeugt und
  in der Dokumentenbibliothek abgelegt. Das Stift-Symbol an dieser PDF öffnet
  später erneut die gespeicherte Quelle und ersetzt die PDF nach Änderungen.
- Status, Phase, Epic, Termin, Priorität, Fortschritt und Kritikalität werden in
  PostgreSQL unter `<PM_TOOL_CONTENTS_DIR>/postgres` gespeichert.
- Die weiteren Arbeitsbereiche sind bereits in der Navigation angelegt und
  werden schrittweise ergänzt.

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
