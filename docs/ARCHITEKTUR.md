# Softwarearchitektur

Dieses Projekt ist als lokal betreibbares Projektmanagement-Tool fuer private Vereinsarbeit geplant. Die Architektur ist ein modularer Monolith mit getrenntem Browser-Frontend, Backend-API, PostgreSQL-Datenbank und lokaler Dokumentenablage.

## Ziele

- Browserbasierte Nutzung auf unterschiedlichen Plattformen
- Lokaler Betrieb auf PC oder Server per Docker Compose
- Keine privaten Projektdaten im GitHub-Repository
- Gemeinsames Datenmodell fuer Kanban, Timeline, Mind-Map, Fortschritt und Eisenhower-Matrix
- Nachvollziehbare Sitzungschronologie, Dokumentenzuordnung und Prompt-Historie
- Einfache Backups von Datenbank und Dokumenten

## Systemuebersicht

```text
Browser
  |
  v
Frontend: React/Vite
  |
  v
Backend: Django + Django REST Framework
  |
  +--> PostgreSQL
  +--> lokales Upload-Volume
  +--> Backup-Verzeichnis
```

## Komponenten

### Frontend

Das Frontend wird als React-App umgesetzt. Es stellt die Arbeitsansichten bereit:

- Kanban-Board mit Epics und Tickets
- Timeline fuer chronologische Planung
- Mind-Map mit Beziehungen zwischen Themen
- Fortschrittsuebersicht mit Warnungen fuer kritische Elemente
- Eisenhower-Matrix fuer Priorisierung
- Dokumentenlisten fuer Ticket-Dokumente, Sitzungsprotokolle und Vertraege

### Backend

Das Backend ist eine Django-Anwendung mit Django REST Framework. Es kapselt Datenmodell, Validierung, API, Authentifizierung und Dateiverwaltung.

Die wichtigsten Django-Apps:

- `projects`: Projekte und Phasen
- `work_items`: Epics, Tickets, Status, Prioritaeten, Mindmap-Knoten
- `documents`: Dokumente, Uploads, Dokumenttypen und Zuordnungen
- `meetings`: Sitzungen, Protokolle und Chronologie
- `core`: gemeinsame Basisklassen und Querschnittsfunktionen

### Datenbank

PostgreSQL speichert strukturierte Daten:

- Projekte und Phasen
- Epics und Tickets
- Kanban-Status
- Timeline-Daten
- Mindmap-Knoten und Verbindungen
- Eisenhower-Werte
- Dokument-Metadaten
- Sitzungen und Protokollbezug

### Dateiablage

Dokumente selbst werden nicht in Git gespeichert. Sie liegen zusammen mit den
PostgreSQL-Daten und Backups ausserhalb des Repositorys unter
`PM_TOOL_CONTENTS_DIR` (standardmaessig `../pm-tool-contents`). Die Datenbank
speichert fuer Dokumente nur Metadaten und Dateipfade.

### Prompt-Log

Prompt-Eingaben werden in `log_of_vibing` protokolliert. Dieser Pfad ist in `.gitignore` enthalten und wird nicht veroeffentlicht.

## Zentrales Datenmodell

Die Architektur vermeidet getrennte Datensilos. Verschiedene Ansichten greifen auf dieselben Daten zu.

```text
Project
  -> Phase
  -> Epic
      -> Ticket
          -> Document
          -> MindMapNode
          -> Meeting
```

Ein Ticket besitzt unter anderem:

- Status fuer Kanban
- Phase fuer Projektplanung
- Epic fuer grobe Struktur
- Start- und Faelligkeitsdatum fuer Timeline
- Wichtigkeit und Dringlichkeit fuer Eisenhower-Matrix
- Fortschritt und Kritikalitaet fuer Uebersichten
- Dokumentzuordnungen
- optionale Verbindung zu Mindmap-Knoten

## Deployment

Der lokale Betrieb erfolgt ueber Docker Compose:

- `db`: PostgreSQL
- `backend`: Django API
- `frontend`: React-App

Private Daten liegen unter `PM_TOOL_CONTENTS_DIR`, nicht im Repository.

## Backup-Strategie

Backups bestehen aus:

- PostgreSQL-Dump
- Kopie des Upload-Verzeichnisses
- optionalem Export der Konfiguration

Das Skript `scripts/backup.sh` legt Backups unter
`<PM_TOOL_CONTENTS_DIR>/backups/` ab.

## CI/CD

GitHub Actions prueft:

- Backend-Imports und Django-Systemcheck
- Frontend-Build
- Docker-Konfiguration

Deployments bleiben bewusst lokal. Das Repository kann oeffentlich sein, solange keine `.env`, Datenbank-Dumps, Uploads oder `log_of_vibing` committed werden.

## Erweiterungspfad

1. Basisdatenmodell und API stabilisieren
2. Kanban-Ansicht bauen
3. Timeline und Phasenuebersicht ergaenzen
4. Dokumentenverwaltung anbinden
5. Mind-Map mit Ticket-Erzeugung verbinden
6. Warnlogik fuer kritische Elemente implementieren
7. Backup/Restore komfortabler machen
