import React from "react";
import ReactDOM from "react-dom/client";
import { CalendarDays, FileText, GitBranch, KanbanSquare, LayoutDashboard, ListChecks } from "lucide-react";
import "./styles.css";

const modules = [
  { title: "Kanban", icon: KanbanSquare, text: "Tickets nach Status, Epic und Phase steuern." },
  { title: "Timeline", icon: CalendarDays, text: "Start- und Faelligkeitsdaten chronologisch planen." },
  { title: "Mind-Map", icon: GitBranch, text: "Themen verbinden und daraus Tickets erzeugen." },
  { title: "Fortschritt", icon: LayoutDashboard, text: "Kritische Elemente und Projektstand sehen." },
  { title: "Eisenhower", icon: ListChecks, text: "Aufgaben nach Wichtigkeit und Dringlichkeit sortieren." },
  { title: "Dokumente", icon: FileText, text: "Ticket-Dokumente, Protokolle und Vertraege sammeln." },
];

function App() {
  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">PM Tool</p>
          <h1>Projektarbeit fuer Verein und Planung</h1>
        </div>
        <a className="api-link" href={`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/`} target="_blank" rel="noreferrer">
          API oeffnen
        </a>
      </section>

      <section className="status-grid" aria-label="Projektstatus">
        <div>
          <span>Phase</span>
          <strong>Startup Phase</strong>
        </div>
        <div>
          <span>Tickets</span>
          <strong>0 aktiv</strong>
        </div>
        <div>
          <span>Dokumente</span>
          <strong>0 erfasst</strong>
        </div>
        <div>
          <span>Kritisch</span>
          <strong>0 Warnungen</strong>
        </div>
      </section>

      <section className="module-grid" aria-label="Arbeitsbereiche">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article className="module" key={module.title}>
              <Icon aria-hidden="true" size={22} />
              <h2>{module.title}</h2>
              <p>{module.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
