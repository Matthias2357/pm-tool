# AGENTS.md

## Zweck

Dieses Repository enthält ein lokal betriebenes, browserbasiertes Project-Management-Tool für private Vereins- und Projektarbeit. Arbeite bestehende Funktionen sorgfältig weiter, erhalte Nutzerdaten und halte Oberfläche, API und Dokumentation konsistent.

## Sprache und Zusammenarbeit

- Kommuniziere mit dem Benutzer auf Deutsch.
- Verwende in der Oberfläche verständliche deutsche Bezeichnungen und deutsche Datumsdarstellung (`TT.MM.JJJJ`).
- Führe klar beauftragte Änderungen selbstständig vollständig aus und prüfe sie angemessen.
- Bewahre bestehende, nicht zur Aufgabe gehörende Änderungen im Worktree.
- Erkläre nach der Arbeit knapp das Ergebnis, relevante Auswirkungen und gegebenenfalls notwendige Start- oder Migrationsbefehle.
- Wenn sich im weiteren Entwicklungsverlauf eine zusätzliche dauerhafte Regel als sinnvoll erweist, weise den Benutzer automatisch darauf hin und schlage konkret vor, sie in diese `AGENTS.md` aufzunehmen.
- Ergänze, ändere oder entferne solche neu gelernten Regeln erst, nachdem der Benutzer ausdrücklich zugestimmt hat. Eine bloße Vermutung oder ein eigener Vorschlag genügt nicht als Freigabe.

## Repository und Nutzdaten

- Aktueller Repository-Pfad: `~/projects_and_tools/pm-tool`.
- Nutzdaten liegen außerhalb des Repositories unter `~/projects_and_tools/pm-tool-contents`.
- Verwende für Konfiguration und Skripte bevorzugt `PM_TOOL_CONTENTS_DIR` beziehungsweise den relativen Standard `../pm-tool-contents`, damit das Projekt verschiebbar bleibt.
- PostgreSQL-Daten liegen unter `<PM_TOOL_CONTENTS_DIR>/postgres`.
- Uploads und erzeugte PDFs liegen unter `<PM_TOOL_CONTENTS_DIR>/uploads`.
- Backups liegen unter `<PM_TOOL_CONTENTS_DIR>/backups`.
- Verschiebe Nutzdaten niemals zurück in das Repository und lösche keine persistenten Inhalte ohne ausdrücklichen Auftrag.
- `.env`, `log_of_vibing`, Datenbankdaten, Uploads und Backups dürfen nicht nach Git gelangen.

## Prompt-Log

Jede Benutzeranfrage und die abschließende Codex-Zusammenfassung müssen in `log_of_vibing/prompts.md` protokolliert werden.

- Lege für einen neuen Kalendertag eine Überschrift `## JJJJ-MM-TT` an.
- Verwende fortlaufende Promptnummern.
- Halte immer unmittelbar diese Reihenfolge ein:

```markdown
### User – Prompt N

<Originaltext des Benutzers>

### Codex – Zusammenfassung

<Knappe, konkrete Zusammenfassung des Ergebnisses>
```

- Trenne Zusammenfassungen nicht in einen späteren Sammelabschnitt ab.
- Übernimm den Benutzertext möglichst unverändert.
- Die Zusammenfassung muss den tatsächlichen Endzustand wiedergeben, einschließlich wichtiger Tests oder verbleibender Einschränkungen.
- Das Prompt-Log ist absichtlich nicht für Git bestimmt, muss lokal aber weiterhin gepflegt werden.

## Technik

- Backend: Django 5 mit Django REST Framework.
- Datenbank: PostgreSQL 16.
- Frontend: React, TypeScript und Vite.
- Lokaler Betrieb: Docker Compose.
- Frontend: `http://localhost:5173`.
- Backend-API: `http://localhost:8000/api/`.
- Das Frontend greift über den Same-Origin-Pfad `/api` auf das Backend zu.
- Mediendateien sollen ebenfalls über eine browserkompatible Same-Origin-Route erreichbar sein; beachte besonders Firefox-Einschränkungen bei eingebetteten PDFs.
- Backend und Frontend sind im Entwicklungsbetrieb als Bind Mounts eingebunden und laden Quelländerungen normalerweise automatisch neu.

## Entwicklungsregeln

- Ergänze bei jeder Änderung am Django-Datenmodell eine Migration.
- Halte Beziehungen projektbezogen und validiere in Serializern, dass referenzierte Objekte zum selben Projekt gehören.
- Verwende bei löschbaren Zuordnungen `SET_NULL`, wenn die fachlich untergeordneten Inhalte erhalten bleiben sollen.
- API-500-Fehler immer zuerst anhand der Backend-Logs und des konkreten Tracebacks diagnostizieren.
- Serializer für optionale Dateien und Beziehungen müssen auch fehlende Werte robust ausgeben können.
- Beim Ersetzen einer Datei lösche nur den alten Storage-Pfad; lösche kein an die aktuelle Modellinstanz gebundenes altes `FieldFile`, wenn dadurch die neue Referenz geleert werden könnte.
- Ergänze für behobene Fehler nach Möglichkeit einen Regressionstest.
- Nutze für API-Antworten und Frontendtypen konsistente Feldnamen.
- Vermeide unsichere Paket-Workarounds wie `--force` oder `--legacy-peer-deps`; löse Versionskonflikte mit kompatiblen Abhängigkeiten.

## Prüfungen

Führe abhängig vom Umfang mindestens passende Teile dieser Prüfungen aus:

```bash
python3 -m compileall -q backend
docker compose config --quiet
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test
docker compose exec frontend npm run build
git diff --check
```

- Bei kleinen Änderungen dürfen gezielte Django-Testmodule statt der vollständigen Testsuite verwendet werden.
- Melde eine nicht ausführbare Prüfung ehrlich, insbesondere wenn der Docker-Socket nicht zugänglich ist.
- Behandle Build-Warnungen getrennt von Fehlern.

## Oberfläche und Design

- Behalte den Dark Mode mit Rot-, Violett- und Blautönen bei.
- Branding: Logo-Kürzel `MK`, Name `Project Management`, Browser-Titel `Project Management`.
- Layouts sollen die verfügbare Browserbreite responsiv nutzen und auf schmalen Ansichten sinnvoll umbrechen.
- Kalender und dargestellte Daten verwenden deutsches Format.
- Dialoge mit Kalender-Popups dürfen diese nicht abschneiden oder unnötig scrollbar machen.
- Destruktive Aktionen erhalten eine klare Sicherheitsabfrage.
- Löschaktionen sollen abhängige fachliche Inhalte erhalten, sofern dies sinnvoll ist, und die Folge transparent benennen.

## Fachliche Regeln

### Projekte und Phasen

- Neue Projekte starten ohne automatisch angelegte Phasen.
- Phasen werden projektbezogen frei in der Timeline erstellt.
- Phasen haben optional Beschreibung, Start- und Enddatum.
- Beim Löschen einer Phase bleiben Tickets und Epics erhalten und werden phasenlos.

### Tickets, Kanban und Epics

- Epics gliedern das Kanban thematisch.
- Tickets können zwischen Status- und Epic-Bereichen verschoben werden.
- Tickets ohne Epic bleiben in einem eigenen Sammelbereich.
- Erledigte Tickets erhalten im Kanban einen grünen Haken.
- Bei schneller Ticketerfassung per Enter öffnet sich direkt ein neues Formular; die Epic-Zuordnung wird für das Folgeticket beibehalten.
- Tickets werden verantwortlichen Sub-Teams zugeordnet, nicht einzelnen Personen.

### Timeline

- In der Timeline werden Epics als gemeinsame Einheit einer Phase zugeordnet.
- Tickets innerhalb eines Epics erscheinen dort nicht zusätzlich einzeln.
- Einzelne Tickets ohne Epic können weiterhin selbst einer Phase zugeordnet werden.
- Phasenlose Epics und einzelne Tickets stehen oben in einem Drag-and-drop-Sammelbereich.
- Die Übersicht zeigt Phasen als vertikalen Zeitstrahl mit Informationen rechts daneben.

### Methodik

Die aktive individuelle Eisenhower-Priorisierung lautet:

- Alpha: wichtig und dringend.
- Beta: nicht wichtig und dringend.
- Gamma: wichtig und nicht dringend.
- Delta: nicht wichtig und nicht dringend.
- Neue unbewertete Tickets haben Wichtigkeit und Dringlichkeit `-1` und erscheinen unter „Noch ohne Prio“.
- Gamma-Aufgaben werden erst bearbeitet, nachdem eine erneute Bewertung sie dringend und damit zu Alpha gemacht hat.

### Team

- Teammitglieder gehören genau zum Scope eines Projekts.
- Unterschiedliche Projekte haben getrennte Teammitglieder und Sub-Teams.
- Ein Mitglied kann mehreren Sub-Teams angehören.
- Sub-Teams stehen bei Tickets als Verantwortliche zur Auswahl.
- Projektfremde Mitglieder oder Sub-Teams dürfen nicht zugeordnet werden.

### Dokumente und Notizen

- Dokumente werden in einklappbaren thematischen Blöcken und datierten Einträgen organisiert.
- Ein Eintrag kann mehrere PDFs, Word-Dateien und Bilder enthalten.
- Bilder sind in der Vorschau zoombar; PDFs sollen im Browser angezeigt werden können.
- Editierbare Notizen speichern ihre Markdown-/TeX-Quelle und erzeugen eine PDF in der Dokumentbibliothek.
- Beim späteren Bearbeiten einer Notiz wird die zugehörige PDF sicher ersetzt, während die editierbare Quelle erhalten bleibt.

### Übersicht

- Die Epic-Übersicht zeigt Status, Ticketanzahl und Fortschritt.
- Unter „Aktuelle Tickets“ erscheinen alle überfälligen Tickets sowie alle Tickets, die heute oder innerhalb der nächsten sieben Tage fällig sind.
- Tickets ohne Fälligkeitsdatum oder mit späterem Termin erscheinen dort nicht.
