import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { katex as markdownItKatex } from "@mdit/plugin-katex";
import html2pdf from "html2pdf.js";
import MarkdownIt from "markdown-it";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  File as FileIcon,
  FileText,
  Folder,
  GitBranch,
  Image,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Menu,
  NotebookPen,
  Pencil,
  Plus,
  Settings,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "katex/dist/katex.min.css";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const noteRenderer = new MarkdownIt({ breaks: true, linkify: true, typographer: true }).use(markdownItKatex);

type View = "dashboard" | "kanban" | "timeline" | "mindmap" | "methodology" | "documents";
type TicketStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
type Criticality = "normal" | "warning" | "critical";

interface Project {
  id: number;
  name: string;
  description: string;
  is_archived: boolean;
  phases: Phase[];
}

interface Phase {
  id: number;
  project: number;
  name: string;
  description: string;
  order: number;
  starts_on: string | null;
  ends_on: string | null;
}

interface Epic {
  id: number;
  project: number;
  title: string;
  description: string;
  progress: number;
}

interface Ticket {
  id: number;
  project: number;
  phase: number | null;
  phase_name: string | null;
  epic: number | null;
  epic_title: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  importance: number;
  urgency: number;
  progress: number;
  starts_on: string | null;
  due_on: string | null;
  criticality: Criticality;
  methodology_priority: MethodologyPriority;
}

type MethodologyPriority = "alpha" | "beta" | "gamma" | "delta" | "unprioritized";

interface TicketDraft {
  title: string;
  description: string;
  status: TicketStatus;
  phase: string;
  epic: string;
  due_on: string;
  starts_on: string;
  importance: number;
  urgency: number;
  progress: number;
  criticality: Criticality;
}

type DocumentKind = "image" | "pdf" | "word" | "other";

interface DocumentAttachment {
  id: number;
  project: number;
  entry: number;
  title: string;
  file: string;
  file_url: string;
  file_name: string;
  file_kind: DocumentKind;
  file_size: number;
  editable_note_id: number | null;
}

interface DocumentEntry {
  id: number;
  block: number;
  name: string;
  entry_date: string;
  notes: string;
  documents: DocumentAttachment[];
}

interface DocumentBlock {
  id: number;
  project: number;
  name: string;
  description: string;
  order: number;
  entries: DocumentEntry[];
}

interface EditableNote {
  id: number;
  entry: number;
  document: number | null;
  document_data: DocumentAttachment | null;
  title: string;
  source: string;
}

interface NoteEditorState {
  entry: DocumentEntry;
  note: EditableNote | null;
}

const emptyTicket: TicketDraft = {
  title: "",
  description: "",
  status: "backlog",
  phase: "",
  epic: "",
  due_on: "",
  starts_on: "",
  importance: -1,
  urgency: -1,
  progress: 0,
  criticality: "normal",
};

const columns: { status: TicketStatus; label: string; accent: string }[] = [
  { status: "backlog", label: "Backlog", accent: "#64748b" },
  { status: "todo", label: "To-do", accent: "#3b82f6" },
  { status: "in_progress", label: "In Bearbeitung", accent: "#7c3aed" },
  { status: "review", label: "Review", accent: "#c026d3" },
  { status: "done", label: "Erledigt", accent: "#e5484d" },
];

const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Übersicht", icon: LayoutDashboard },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "mindmap", label: "Mind-Map", icon: GitBranch },
  { id: "methodology", label: "Methodik", icon: ListChecks },
  { id: "documents", label: "Dokumente", icon: FileText },
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? Object.values(body ?? {}).flat().join(" ") ?? "";
    throw new Error(detail || `API-Fehler ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function unpack<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [documentBlocks, setDocumentBlocks] = useState<DocumentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [editProjectDialog, setEditProjectDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>(emptyTicket);
  const [blockDialog, setBlockDialog] = useState(false);
  const [editBlock, setEditBlock] = useState<DocumentBlock | null>(null);
  const [entryDialogBlock, setEntryDialogBlock] = useState<DocumentBlock | null>(null);
  const [uploadEntry, setUploadEntry] = useState<DocumentEntry | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentAttachment | null>(null);
  const [noteEditor, setNoteEditor] = useState<NoteEditorState | null>(null);
  const [phaseDialog, setPhaseDialog] = useState<Phase | "new" | null>(null);
  const [epicDialog, setEpicDialog] = useState<Epic | "new" | null>(null);

  const project = projects.find((item) => item.id === projectId) ?? null;

  const loadProjects = useCallback(async () => {
    const data = await api<Project[] | { results: Project[] }>("/projects/?archived=false");
    const list = unpack(data);
    setProjects(list);
    setProjectId((current) => current ?? list[0]?.id ?? null);
  }, []);

  const loadBoard = useCallback(async (selectedProject: number) => {
    const [ticketData, epicData, blockData] = await Promise.all([
      api<Ticket[] | { results: Ticket[] }>(`/tickets/?project=${selectedProject}`),
      api<Epic[] | { results: Epic[] }>(`/epics/?project=${selectedProject}`),
      api<DocumentBlock[] | { results: DocumentBlock[] }>(`/document-blocks/?project=${selectedProject}`),
    ]);
    setTickets(unpack(ticketData));
    setEpics(unpack(epicData));
    setDocumentBlocks(unpack(blockData));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProjects()
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      setTickets([]);
      setEpics([]);
      return;
    }
    setLoading(true);
    setError("");
    loadBoard(projectId)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [projectId, loadBoard]);

  function isCritical(ticket: Ticket) {
    return (
      ticket.criticality !== "normal" ||
      (ticket.due_on !== null && ticket.status !== "done" && ticket.due_on < new Date().toISOString().slice(0, 10))
    );
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const created = await api<Project>("/projects/", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), description: form.get("description") }),
      });
      await loadProjects();
      setProjectId(created.id);
      setProjectDialog(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function updateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = new FormData(event.currentTarget);
    try {
      await api<Project>(`/projects/${project.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: form.get("name"), description: form.get("description") }),
      });
      await loadProjects();
      setEditProjectDialog(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  function openNewTicket(status: TicketStatus = "backlog", epic: Epic | null = null) {
    setEditingTicket(null);
    setTicketDraft({ ...emptyTicket, status, epic: epic?.id.toString() ?? "" });
    setTicketDialog(true);
  }

  function openTicket(ticket: Ticket) {
    setEditingTicket(ticket);
    setTicketDraft({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      phase: ticket.phase?.toString() ?? "",
      epic: ticket.epic?.toString() ?? "",
      due_on: ticket.due_on ?? "",
      starts_on: ticket.starts_on ?? "",
      importance: ticket.importance,
      urgency: ticket.urgency,
      progress: ticket.progress,
      criticality: ticket.criticality,
    });
    setTicketDialog(true);
  }

  async function saveTicket(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    const payload = {
      ...ticketDraft,
      project: projectId,
      phase: ticketDraft.phase ? Number(ticketDraft.phase) : null,
      epic: ticketDraft.epic ? Number(ticketDraft.epic) : null,
      due_on: ticketDraft.due_on || null,
      starts_on: ticketDraft.starts_on || null,
    };
    setError("");
    try {
      await api<Ticket>(editingTicket ? `/tickets/${editingTicket.id}/` : "/tickets/", {
        method: editingTicket ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      await loadBoard(projectId);
      setTicketDialog(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function moveTicket(ticketId: number, status: TicketStatus, epic: Epic | null) {
    const original = tickets;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, status, epic: epic?.id ?? null, epic_title: epic?.title ?? null }
          : ticket,
      ),
    );
    try {
      await api<Ticket>(`/tickets/${ticketId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status, epic: epic?.id ?? null }),
      });
    } catch (reason) {
      setTickets(original);
      setError((reason as Error).message);
    }
  }

  async function saveEpic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !epicDialog) return;
    const form = new FormData(event.currentTarget);
    const existing = epicDialog === "new" ? null : epicDialog;
    try {
      await api<Epic>(existing ? `/epics/${existing.id}/` : "/epics/", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          project: projectId,
          title: form.get("title"),
          description: form.get("description"),
          progress: existing?.progress ?? 0,
        }),
      });
      await loadBoard(projectId);
      setEpicDialog(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function deleteEpic() {
    if (!projectId || !epicDialog || epicDialog === "new") return;
    if (!window.confirm(`Epic „${epicDialog.title}“ wirklich löschen? Die Tickets bleiben ohne Epic erhalten.`)) return;
    try {
      await api<void>(`/epics/${epicDialog.id}/`, { method: "DELETE" });
      await loadBoard(projectId);
      setEpicDialog(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function reprioritizeTicket(ticketId: number, priority: MethodologyPriority) {
    const values: Record<MethodologyPriority, { importance: number; urgency: number }> = {
      alpha: { importance: 4, urgency: 4 },
      beta: { importance: 1, urgency: 4 },
      gamma: { importance: 4, urgency: 1 },
      delta: { importance: 1, urgency: 1 },
      unprioritized: { importance: -1, urgency: -1 },
    };
    const original = tickets;
    const update = values[priority];
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...update, methodology_priority: priority } : ticket,
      ),
    );
    try {
      await api<Ticket>(`/tickets/${ticketId}/`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
    } catch (reason) {
      setTickets(original);
      setError((reason as Error).message);
    }
  }

  async function assignTicketPhase(ticketId: number, phase: Phase | null) {
    const original = tickets;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, phase: phase?.id ?? null, phase_name: phase?.name ?? null }
          : ticket,
      ),
    );
    try {
      await api<Ticket>(`/tickets/${ticketId}/`, {
        method: "PATCH",
        body: JSON.stringify({ phase: phase?.id ?? null }),
      });
    } catch (reason) {
      setTickets(original);
      setError((reason as Error).message);
    }
  }

  async function savePhase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !phaseDialog) return;
    const form = new FormData(event.currentTarget);
    const existing = phaseDialog === "new" ? null : phaseDialog;
    try {
      await api<Phase>(existing ? `/phases/${existing.id}/` : "/phases/", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          project: projectId,
          name: form.get("name"),
          description: form.get("description"),
          order: existing?.order ?? project?.phases.length ?? 0,
          starts_on: form.get("starts_on") || null,
          ends_on: form.get("ends_on") || null,
        }),
      });
      await loadProjects();
      setPhaseDialog(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function deleteTicket() {
    if (!editingTicket || !projectId || !window.confirm(`„${editingTicket.title}“ wirklich löschen?`)) return;
    try {
      await api<void>(`/tickets/${editingTicket.id}/`, { method: "DELETE" });
      await loadBoard(projectId);
      setTicketDialog(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function createDocumentBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const form = new FormData(event.currentTarget);
    try {
      await api<DocumentBlock>("/document-blocks/", {
        method: "POST",
        body: JSON.stringify({
          project: projectId,
          name: form.get("name"),
          description: form.get("description"),
        }),
      });
      await loadBoard(projectId);
      setBlockDialog(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function updateDocumentBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !editBlock) return;
    const form = new FormData(event.currentTarget);
    try {
      await api<DocumentBlock>(`/document-blocks/${editBlock.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: form.get("name"), description: form.get("description") }),
      });
      await loadBoard(projectId);
      setEditBlock(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function createDocumentEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !entryDialogBlock) return;
    const form = new FormData(event.currentTarget);
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    try {
      const entry = await api<DocumentEntry>("/document-entries/", {
        method: "POST",
        body: JSON.stringify({
          block: entryDialogBlock.id,
          name: form.get("name"),
          entry_date: form.get("entry_date"),
          notes: form.get("notes"),
        }),
      });
      for (const file of files) {
        const upload = new FormData();
        upload.append("project", String(projectId));
        upload.append("entry", String(entry.id));
        upload.append("title", file.name.replace(/\.[^.]+$/, ""));
        upload.append("document_type", "other");
        upload.append("file", file);
        await api<DocumentAttachment>("/documents/", { method: "POST", body: upload });
      }
      await loadBoard(projectId);
      setEntryDialogBlock(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function addDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !uploadEntry) return;
    const form = new FormData(event.currentTarget);
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) {
      setError("Bitte wähle mindestens eine Datei aus.");
      return;
    }
    try {
      for (const file of files) {
        const upload = new FormData();
        upload.append("project", String(projectId));
        upload.append("entry", String(uploadEntry.id));
        upload.append("title", file.name.replace(/\.[^.]+$/, ""));
        upload.append("document_type", "other");
        upload.append("file", file);
        await api<DocumentAttachment>("/documents/", { method: "POST", body: upload });
      }
      await loadBoard(projectId);
      setUploadEntry(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function openEditableNote(entry: DocumentEntry, noteId?: number) {
    if (!noteId) {
      setNoteEditor({ entry, note: null });
      return;
    }
    try {
      const note = await api<EditableNote>(`/editable-notes/${noteId}/`);
      setNoteEditor({ entry, note });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function saveEditableNote(title: string, source: string, preview: HTMLElement) {
    if (!projectId || !noteEditor) return;
    try {
      const note = await api<EditableNote>(
        noteEditor.note ? `/editable-notes/${noteEditor.note.id}/` : "/editable-notes/",
        {
          method: noteEditor.note ? "PATCH" : "POST",
          body: JSON.stringify({
            entry: noteEditor.entry.id,
            title,
            source,
          }),
        },
      );
      const fileName = `${title.trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, "_") || "Notiz"}.pdf`;
      const pdfBlob = await html2pdf()
        .set({
          margin: [14, 14, 16, 14],
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(preview)
        .outputPdf("blob");
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
      const upload = new FormData();
      upload.append("title", title);
      upload.append("file", pdfFile);

      let documentId = note.document;
      if (documentId) {
        await api<DocumentAttachment>(`/documents/${documentId}/`, { method: "PATCH", body: upload });
      } else {
        upload.append("project", String(projectId));
        upload.append("entry", String(noteEditor.entry.id));
        upload.append("document_type", "other");
        const document = await api<DocumentAttachment>("/documents/", { method: "POST", body: upload });
        documentId = document.id;
        await api<EditableNote>(`/editable-notes/${note.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ document: documentId }),
        });
      }
      await loadBoard(projectId);
      setNoteEditor(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">MK</div>
          <div>
            <strong>Project Management</strong>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
            <X size={20} />
          </button>
        </div>

        <nav>
          <span className="nav-heading">Arbeitsbereiche</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <a href={`${API_BASE}/`} target="_blank" rel="noreferrer">
            <Settings size={17} />
            API-Verwaltung
          </a>
          <span>Daten: ~/pm-tool-contents</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Menü öffnen">
            <Menu size={22} />
          </button>
          <div className="project-select-wrap">
            <label htmlFor="project-select">Aktuelles Projekt</label>
            <div className="select-control">
              <select
                id="project-select"
                value={projectId ?? ""}
                onChange={(event) => setProjectId(event.target.value ? Number(event.target.value) : null)}
              >
                {!projects.length && <option value="">Noch kein Projekt</option>}
                {projects.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
          <button className="button secondary" onClick={() => setProjectDialog(true)}>
            <Plus size={17} /> Projekt
          </button>
          <button className="icon-button header-edit-button" onClick={() => setEditProjectDialog(true)} disabled={!project} aria-label="Aktuelles Projekt bearbeiten">
            <Pencil size={17} />
          </button>
          <button className="button primary" onClick={() => openNewTicket()} disabled={!project}>
            <Plus size={17} /> Ticket
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Fehler schließen"><X size={17} /></button>
          </div>
        )}

        {loading && !projects.length ? (
          <div className="center-state"><Loader2 className="spin" /> Daten werden geladen …</div>
        ) : !project ? (
          <EmptyProject onCreate={() => setProjectDialog(true)} />
        ) : view === "dashboard" ? (
          <Dashboard project={project} tickets={tickets} epics={epics} onOpenKanban={() => setView("kanban")} />
        ) : view === "kanban" ? (
          <Kanban
            tickets={tickets}
            epics={epics}
            onOpen={openTicket}
            onCreate={openNewTicket}
            onMove={moveTicket}
            onCreateEpic={() => setEpicDialog("new")}
            onEditEpic={setEpicDialog}
            critical={isCritical}
          />
        ) : view === "timeline" ? (
          <Timeline
            project={project}
            tickets={tickets}
            onOpenTicket={openTicket}
            onAssignPhase={assignTicketPhase}
            onCreatePhase={() => setPhaseDialog("new")}
            onEditPhase={setPhaseDialog}
          />
        ) : view === "methodology" ? (
          <Methodology
            tickets={tickets}
            onOpen={openTicket}
            onCreate={() => openNewTicket()}
            onReprioritize={reprioritizeTicket}
          />
        ) : view === "documents" ? (
          <Documents
            blocks={documentBlocks}
            onCreateBlock={() => setBlockDialog(true)}
            onEditBlock={setEditBlock}
            onCreateEntry={setEntryDialogBlock}
            onAddDocuments={setUploadEntry}
            onCreateNote={(entry) => openEditableNote(entry)}
            onEditNote={(entry, noteId) => openEditableNote(entry, noteId)}
            onPreview={setPreviewDocument}
          />
        ) : (
          <ComingSoon view={view} onKanban={() => setView("kanban")} />
        )}
      </main>

      {projectDialog && (
        <Modal title="Neues Projekt" onClose={() => setProjectDialog(false)}>
          <form className="form" onSubmit={createProject}>
            <label>
              Projektname
              <input name="name" required autoFocus maxLength={200} placeholder="z. B. Vereinsfest 2027" />
            </label>
            <label>
              Beschreibung
              <textarea name="description" rows={4} placeholder="Ziel und Rahmen des Projekts" />
            </label>
            <p className="form-hint">Projektphasen legst du anschließend passend zu deinem Ablauf in der Timeline an.</p>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setProjectDialog(false)}>Abbrechen</button>
              <button className="button primary" type="submit">Projekt anlegen</button>
            </div>
          </form>
        </Modal>
      )}

      {editProjectDialog && project && (
        <Modal title="Projekt bearbeiten" onClose={() => setEditProjectDialog(false)}>
          <form className="form" onSubmit={updateProject}>
            <label>
              Projektname
              <input name="name" required autoFocus maxLength={200} defaultValue={project.name} />
            </label>
            <label>
              Beschreibung
              <textarea name="description" rows={4} defaultValue={project.description} />
            </label>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setEditProjectDialog(false)}>Abbrechen</button>
              <button className="button primary" type="submit">Änderungen speichern</button>
            </div>
          </form>
        </Modal>
      )}

      {ticketDialog && project && (
        <Modal title={editingTicket ? "Ticket bearbeiten" : "Neues Ticket"} onClose={() => setTicketDialog(false)} wide>
          <form className="form ticket-form" onSubmit={saveTicket}>
            <label className="full">
              Titel
              <input
                required
                autoFocus
                maxLength={200}
                value={ticketDraft.title}
                onChange={(event) => setTicketDraft({ ...ticketDraft, title: event.target.value })}
                placeholder="Was ist zu erledigen?"
              />
            </label>
            <label className="full">
              Beschreibung
              <textarea
                rows={4}
                value={ticketDraft.description}
                onChange={(event) => setTicketDraft({ ...ticketDraft, description: event.target.value })}
                placeholder="Details, Ergebnis und nächste Schritte"
              />
            </label>
            <label>
              Status
              <select value={ticketDraft.status} onChange={(event) => setTicketDraft({ ...ticketDraft, status: event.target.value as TicketStatus })}>
                {columns.map((column) => <option value={column.status} key={column.status}>{column.label}</option>)}
              </select>
            </label>
            <label>
              Phase
              <select value={ticketDraft.phase} onChange={(event) => setTicketDraft({ ...ticketDraft, phase: event.target.value })}>
                <option value="">Keine Phase</option>
                {project.phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name}</option>)}
              </select>
            </label>
            <label>
              Epic
              <select value={ticketDraft.epic} onChange={(event) => setTicketDraft({ ...ticketDraft, epic: event.target.value })}>
                <option value="">Kein Epic</option>
                {epics.map((epic) => <option value={epic.id} key={epic.id}>{epic.title}</option>)}
              </select>
            </label>
            <label>
              Fällig am
              <input type="date" value={ticketDraft.due_on} onChange={(event) => setTicketDraft({ ...ticketDraft, due_on: event.target.value })} />
            </label>
            <label>
              Startdatum
              <input type="date" value={ticketDraft.starts_on} onChange={(event) => setTicketDraft({ ...ticketDraft, starts_on: event.target.value })} />
            </label>
            <label>
              Wichtigkeit
              <select value={ticketDraft.importance} onChange={(event) => setTicketDraft({ ...ticketDraft, importance: Number(event.target.value) })}>
                <option value={-1}>Noch nicht bewertet</option>
                <option value={1}>1 · niedrig</option>
                <option value={2}>2 · eher niedrig</option>
                <option value={3}>3 · wichtig</option>
                <option value={4}>4 · sehr wichtig</option>
              </select>
            </label>
            <label>
              Dringlichkeit
              <select value={ticketDraft.urgency} onChange={(event) => setTicketDraft({ ...ticketDraft, urgency: Number(event.target.value) })}>
                <option value={-1}>Noch nicht bewertet</option>
                <option value={1}>1 · niedrig</option>
                <option value={2}>2 · eher niedrig</option>
                <option value={3}>3 · dringend</option>
                <option value={4}>4 · sehr dringend</option>
              </select>
            </label>
            <label>
              Fortschritt in %
              <input type="number" min={0} max={100} value={ticketDraft.progress} onChange={(event) => setTicketDraft({ ...ticketDraft, progress: Number(event.target.value) })} />
            </label>
            <label>
              Kritikalität
              <select value={ticketDraft.criticality} onChange={(event) => setTicketDraft({ ...ticketDraft, criticality: event.target.value as Criticality })}>
                <option value="normal">Normal</option>
                <option value="warning">Warnung</option>
                <option value="critical">Kritisch</option>
              </select>
            </label>
            <div className="dialog-actions full split-actions">
              <div>{editingTicket && <button type="button" className="button danger" onClick={deleteTicket}>Löschen</button>}</div>
              <div>
                <button type="button" className="button ghost" onClick={() => setTicketDialog(false)}>Abbrechen</button>
                <button className="button primary" type="submit">Speichern</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {blockDialog && (
        <Modal title="Thematischen Block erstellen" onClose={() => setBlockDialog(false)}>
          <form className="form" onSubmit={createDocumentBlock}>
            <label>
              Name des Blocks
              <input name="name" required autoFocus maxLength={200} placeholder="z. B. Festausschusssitzungen" />
            </label>
            <label>
              Beschreibung (optional)
              <textarea name="description" rows={3} placeholder="Welche Einträge werden hier gesammelt?" />
            </label>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setBlockDialog(false)}>Abbrechen</button>
              <button className="button primary" type="submit">Block erstellen</button>
            </div>
          </form>
        </Modal>
      )}

      {editBlock && (
        <Modal title="Thematischen Block bearbeiten" onClose={() => setEditBlock(null)}>
          <form className="form" onSubmit={updateDocumentBlock}>
            <label>
              Name des Blocks
              <input name="name" required autoFocus maxLength={200} defaultValue={editBlock.name} />
            </label>
            <label>
              Beschreibung
              <textarea name="description" rows={3} defaultValue={editBlock.description} />
            </label>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setEditBlock(null)}>Abbrechen</button>
              <button className="button primary" type="submit">Änderungen speichern</button>
            </div>
          </form>
        </Modal>
      )}

      {entryDialogBlock && (
        <Modal title={`Neuer Eintrag · ${entryDialogBlock.name}`} onClose={() => setEntryDialogBlock(null)} wide>
          <form className="form" onSubmit={createDocumentEntry}>
            <label>
              Name
              <input name="name" required autoFocus maxLength={200} placeholder="z. B. Sitzungsprotokoll" />
            </label>
            <label>
              Datum
              <GermanDatePicker name="entry_date" />
            </label>
            <label>
              Notiz
              <textarea name="notes" rows={4} placeholder="Kurze Zusammenfassung des Inhalts" />
            </label>
            <label className="file-picker">
              <Upload size={22} />
              <span><strong>Dokumente auswählen</strong>PDF, Word oder Bilder · mehrere Dateien möglich</span>
              <input
                name="files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setEntryDialogBlock(null)}>Abbrechen</button>
              <button className="button primary" type="submit">Eintrag speichern</button>
            </div>
          </form>
        </Modal>
      )}

      {previewDocument && (
        <DocumentPreview document={previewDocument} onClose={() => setPreviewDocument(null)} />
      )}

      {uploadEntry && (
        <Modal title={`Dokumente hinzufügen · ${uploadEntry.name}`} onClose={() => setUploadEntry(null)}>
          <form className="form" onSubmit={addDocuments}>
            <label className="file-picker">
              <Upload size={22} />
              <span><strong>Dokumente auswählen</strong>PDF, Word oder Bilder · mehrere Dateien möglich</span>
              <input
                name="files"
                type="file"
                required
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setUploadEntry(null)}>Abbrechen</button>
              <button className="button primary" type="submit"><Upload size={16} /> Hochladen</button>
            </div>
          </form>
        </Modal>
      )}

      {noteEditor && (
        <NoteEditor
          state={noteEditor}
          onClose={() => setNoteEditor(null)}
          onSave={saveEditableNote}
        />
      )}

      {phaseDialog && project && (
        <Modal
          title={phaseDialog === "new" ? "Neue Phase" : "Phase bearbeiten"}
          onClose={() => setPhaseDialog(null)}
          overflowVisible
        >
          <form className="form" onSubmit={savePhase}>
            <label>
              Name der Phase
              <input
                name="name"
                required
                autoFocus
                maxLength={120}
                defaultValue={phaseDialog === "new" ? "" : phaseDialog.name}
                placeholder="z. B. Genehmigungsplanung"
              />
            </label>
            <label>
              Kurze Beschreibung (optional)
              <textarea
                name="description"
                rows={3}
                defaultValue={phaseDialog === "new" ? "" : phaseDialog.description}
                placeholder="Ziel, Inhalt und erwartetes Ergebnis dieser Phase"
              />
            </label>
            <div className="phase-date-fields">
              <label>
                Startdatum (optional)
                <GermanDatePicker
                  name="starts_on"
                  defaultValue={phaseDialog === "new" ? "" : phaseDialog.starts_on ?? ""}
                  optional
                />
              </label>
              <label>
                Enddatum (optional)
                <GermanDatePicker
                  name="ends_on"
                  defaultValue={phaseDialog === "new" ? "" : phaseDialog.ends_on ?? ""}
                  optional
                />
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="button ghost" onClick={() => setPhaseDialog(null)}>Abbrechen</button>
              <button className="button primary" type="submit">Phase speichern</button>
            </div>
          </form>
        </Modal>
      )}

      {epicDialog && project && (
        <Modal title={epicDialog === "new" ? "Neues Epic" : "Epic bearbeiten"} onClose={() => setEpicDialog(null)}>
          <form className="form" onSubmit={saveEpic}>
            <label>
              Name des Epics
              <input
                name="title"
                required
                autoFocus
                maxLength={200}
                defaultValue={epicDialog === "new" ? "" : epicDialog.title}
                placeholder="z. B. Veranstaltungslogistik"
              />
            </label>
            <label>
              Beschreibung (optional)
              <textarea
                name="description"
                rows={4}
                defaultValue={epicDialog === "new" ? "" : epicDialog.description}
                placeholder="Welches übergeordnete Thema bündelt dieses Epic?"
              />
            </label>
            <div className="dialog-actions split-actions">
              <div>{epicDialog !== "new" && <button type="button" className="button danger" onClick={deleteEpic}>Epic löschen</button>}</div>
              <div>
                <button type="button" className="button ghost" onClick={() => setEpicDialog(null)}>Abbrechen</button>
                <button className="button primary" type="submit">Epic speichern</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Dashboard({
  project,
  tickets,
  epics,
  onOpenKanban,
}: {
  project: Project;
  tickets: Ticket[];
  epics: Epic[];
  onOpenKanban: () => void;
}) {
  const recent = tickets.slice(0, 5);
  return (
    <div className="page">
      <div className="page-heading">
        <div><span className="eyebrow">Projektübersicht</span><h1>{project.name}</h1><p>{project.description || "Noch keine Projektbeschreibung hinterlegt."}</p></div>
        <button className="button secondary" onClick={onOpenKanban}>Kanban öffnen</button>
      </div>
      <EpicOverview epics={epics} tickets={tickets} />
      <PhaseOverviewTimeline phases={project.phases} />
      <section className="content-card">
        <div className="card-heading"><div><h2>Aktuelle Tickets</h2><p>Die zuletzt relevanten Aufgaben im Projekt.</p></div></div>
        {recent.length ? (
          <div className="ticket-list">
            {recent.map((ticket) => (
              <div key={ticket.id}><span className={`status-dot ${ticket.status}`} /><strong>{ticket.title}</strong><span>{ticket.phase_name ?? "Ohne Phase"}</span><span>{ticket.progress} %</span></div>
            ))}
          </div>
        ) : <div className="empty-inline">Noch keine Tickets vorhanden. Öffne das Kanban-Board und lege das erste Ticket an.</div>}
      </section>
    </div>
  );
}

function EpicOverview({ epics, tickets }: { epics: Epic[]; tickets: Ticket[] }) {
  const withoutEpic = tickets.filter((ticket) => ticket.epic === null);

  function epicStatus(epicTickets: Ticket[]) {
    if (!epicTickets.length) return { key: "empty", label: "Noch ohne Tickets", progress: 0 };
    const done = epicTickets.filter((ticket) => ticket.status === "done").length;
    const progress = Math.round((done / epicTickets.length) * 100);
    if (done === epicTickets.length) return { key: "done", label: "Abgeschlossen", progress };
    if (epicTickets.some((ticket) => ["in_progress", "review"].includes(ticket.status))) {
      return { key: "active", label: "In Arbeit", progress };
    }
    return { key: "planned", label: "Geplant", progress };
  }

  return (
    <section className="epic-overview-card">
      <header>
        <div><h2>Epics</h2><p>Thematische Bereiche und ihr aktueller Bearbeitungsstand.</p></div>
        <span>{epics.length} {epics.length === 1 ? "Epic" : "Epics"}</span>
      </header>
      {!epics.length ? (
        <div className="empty-inline">Noch keine Epics vorhanden. Lege das erste Epic im Kanban-Board an.</div>
      ) : (
        <div className="epic-overview-grid">
          {epics.map((epic) => {
            const epicTickets = tickets.filter((ticket) => ticket.epic === epic.id);
            const status = epicStatus(epicTickets);
            return (
              <article className="epic-overview-item" key={epic.id}>
                <div className="epic-overview-title">
                  <span className="epic-heading-icon"><GitBranch size={17} /></span>
                  <div><strong>{epic.title}</strong><small>{epicTickets.length} {epicTickets.length === 1 ? "Ticket" : "Tickets"}</small></div>
                  <span className={`epic-status ${status.key}`}>{status.label}</span>
                </div>
                {epic.description && <p>{epic.description}</p>}
                <div className="epic-overview-progress">
                  <div><span style={{ width: `${status.progress}%` }} /></div>
                  <strong>{status.progress} %</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {withoutEpic.length > 0 && (
        <div className="epic-unassigned-note"><KanbanSquare size={16} /> {withoutEpic.length} {withoutEpic.length === 1 ? "Ticket ist" : "Tickets sind"} noch keinem Epic zugeordnet.</div>
      )}
    </section>
  );
}

function PhaseOverviewTimeline({ phases }: { phases: Phase[] }) {
  const ordered = [...phases].sort((a, b) => a.order - b.order);
  const today = new Date().toISOString().slice(0, 10);

  function phaseState(phase: Phase) {
    if (phase.starts_on && phase.starts_on > today) return "future";
    if (phase.ends_on && phase.ends_on < today) return "past";
    if (phase.starts_on || phase.ends_on) return "current";
    return "undated";
  }

  return (
    <section className="overview-timeline-card">
      <header>
        <div><h2>Phasen-Zeitstrahl</h2><p>Chronologischer Projektablauf aus der Timeline.</p></div>
        <span>{ordered.length} Phasen</span>
      </header>
      {!ordered.length ? (
        <div className="overview-timeline-empty"><CalendarDays size={18} /> Noch keine Phasen angelegt.</div>
      ) : (
        <div className="overview-timeline-scroll">
          <div className="overview-timeline-track">
            {ordered.map((phase, index) => {
              const state = phaseState(phase);
              return (
                <div className={`overview-phase ${state}`} key={phase.id}>
                  <div className="overview-phase-marker">
                    <span>{index + 1}</span>
                    {index < ordered.length - 1 && <i />}
                  </div>
                  <div className="overview-phase-content">
                    <strong>{phase.name}</strong>
                    <span>{formatDateRange(phase.starts_on, phase.ends_on)}</span>
                    {phase.description && <p>{phase.description}</p>}
                    {state === "current" && <small>Aktuelle Phase</small>}
                    {state === "past" && <small>Abgeschlossen</small>}
                    {state === "future" && <small>Geplant</small>}
                    {state === "undated" && <small>Ohne Zeitraum</small>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Timeline({
  project,
  tickets,
  onOpenTicket,
  onAssignPhase,
  onCreatePhase,
  onEditPhase,
}: {
  project: Project;
  tickets: Ticket[];
  onOpenTicket: (ticket: Ticket) => void;
  onAssignPhase: (ticketId: number, phase: Phase | null) => void;
  onCreatePhase: () => void;
  onEditPhase: (phase: Phase) => void;
}) {
  const withoutPhase = tickets.filter((ticket) => ticket.phase === null);
  const phases = [...project.phases].sort((a, b) => a.order - b.order);

  function droppedTicketId(event: React.DragEvent) {
    return Number(event.dataTransfer.getData("text/ticket-id"));
  }

  return (
    <div className="page timeline-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Chronologische Planung</span>
          <h1>Timeline</h1>
          <p>Erstelle eigene Projektphasen und ordne Tickets per Drag-and-drop ein.</p>
        </div>
        <button className="button primary" onClick={onCreatePhase}><Plus size={17} /> Phase erstellen</button>
      </div>

      <section
        className="unphased-section"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const id = droppedTicketId(event);
          if (id) onAssignPhase(id, null);
        }}
      >
        <header>
          <div><span className="unphased-icon"><ListChecks size={18} /></span><div><h2>Tickets ohne Phase</h2><p>Ziehe diese Tickets in eine der Projektphasen.</p></div></div>
          <b>{withoutPhase.length}</b>
        </header>
        <div className="unphased-tickets">
          {withoutPhase.map((ticket) => (
            <TimelineTicketRow ticket={ticket} key={ticket.id} onOpen={onOpenTicket} compact />
          ))}
          {!withoutPhase.length && <div className="timeline-drop-empty"><CheckCircle2 size={17} /> Alle Tickets sind einer Phase zugeordnet.</div>}
        </div>
      </section>

      <div className="timeline-phases">
        {!phases.length && (
          <div className="timeline-no-phases">
            <CalendarDays size={30} />
            <h2>Noch keine Projektphasen</h2>
            <p>Lege deine erste Phase frei nach dem Ablauf dieses Projekts an.</p>
            <button className="button primary" onClick={onCreatePhase}><Plus size={17} /> Erste Phase erstellen</button>
          </div>
        )}
        {phases.map((phase, index) => {
          const phaseTickets = tickets.filter((ticket) => ticket.phase === phase.id);
          return (
            <section
              className="timeline-phase"
              key={phase.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = droppedTicketId(event);
                if (id) onAssignPhase(id, phase);
              }}
            >
              <div className="timeline-rail">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index < phases.length - 1 && <i />}
              </div>
              <div className="timeline-phase-card">
                <header>
                  <div>
                    <span className="phase-label">Phase {index + 1}</span>
                    <h2>{phase.name}</h2>
                    {phase.description && <p className="phase-description">{phase.description}</p>}
                    <div className="phase-dates">
                      <span><CalendarDays size={13} /> {formatDateRange(phase.starts_on, phase.ends_on)}</span>
                      <span>{phaseTickets.length} Tickets</span>
                    </div>
                  </div>
                  <button className="icon-button" onClick={() => onEditPhase(phase)} aria-label={`${phase.name} bearbeiten`}><Pencil size={17} /></button>
                </header>
                <div className="phase-ticket-list">
                  {phaseTickets.map((ticket) => <TimelineTicketRow ticket={ticket} key={ticket.id} onOpen={onOpenTicket} />)}
                  {!phaseTickets.length && <div className="timeline-drop-empty">Ticket in diese Phase ziehen</div>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TimelineTicketRow({ ticket, onOpen, compact = false }: { ticket: Ticket; onOpen: (ticket: Ticket) => void; compact?: boolean }) {
  return (
    <button
      className={`timeline-ticket ${compact ? "compact" : ""}`}
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/ticket-id", String(ticket.id))}
      onClick={() => onOpen(ticket)}
    >
      <span className={`status-dot ${ticket.status}`} />
      <span className="timeline-ticket-title"><strong>{ticket.title}</strong>{ticket.epic_title && <small>{ticket.epic_title}</small>}</span>
      <span className="timeline-ticket-date start-date"><small>Start</small><strong>{formatGermanDate(ticket.starts_on)}</strong></span>
      <span className="timeline-ticket-date"><small>Ende</small><strong>{formatGermanDate(ticket.due_on)}</strong></span>
      <span className="timeline-ticket-progress"><i><b style={{ width: `${ticket.progress}%` }} /></i><small>{ticket.progress} %</small></span>
    </button>
  );
}

function formatGermanDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("de-DE") : "–";
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "Zeitraum noch offen";
  return `${formatGermanDate(start)} – ${formatGermanDate(end)}`;
}

function Kanban({
  tickets,
  epics,
  onOpen,
  onCreate,
  onMove,
  onCreateEpic,
  onEditEpic,
  critical,
}: {
  tickets: Ticket[];
  epics: Epic[];
  onOpen: (ticket: Ticket) => void;
  onCreate: (status: TicketStatus, epic: Epic | null) => void;
  onMove: (id: number, status: TicketStatus, epic: Epic | null) => void;
  onCreateEpic: () => void;
  onEditEpic: (epic: Epic) => void;
  critical: (ticket: Ticket) => boolean;
}) {
  const withoutEpic = tickets.filter((ticket) => ticket.epic === null);
  return (
    <div className="page kanban-page">
      <div className="page-heading compact">
        <div><span className="eyebrow">Arbeitsbereich</span><h1>Kanban-Board</h1><p>Epics gliedern das Board thematisch. Ziehe Karten zwischen Status und Epic-Bereichen.</p></div>
        <button className="button primary" onClick={onCreateEpic}><Plus size={17} /> Epic erstellen</button>
      </div>
      <div className="epic-boards">
        {epics.map((epic) => {
          const epicTickets = tickets.filter((ticket) => ticket.epic === epic.id);
          const done = epicTickets.filter((ticket) => ticket.status === "done").length;
          const progress = epicTickets.length ? Math.round((done / epicTickets.length) * 100) : 0;
          return (
            <section className="epic-board-section" key={epic.id}>
              <header className="epic-board-heading">
                <div>
                  <span className="epic-heading-icon"><GitBranch size={18} /></span>
                  <div><span className="eyebrow">Epic</span><h2>{epic.title}</h2>{epic.description && <p>{epic.description}</p>}</div>
                </div>
                <div className="epic-heading-meta">
                  <span>{epicTickets.length} Tickets</span>
                  <span>{progress} % erledigt</span>
                  <button className="icon-button" onClick={() => onEditEpic(epic)} aria-label={`${epic.title} bearbeiten`}><Pencil size={16} /></button>
                </div>
              </header>
              <KanbanGroup epic={epic} tickets={epicTickets} onOpen={onOpen} onCreate={onCreate} onMove={onMove} critical={critical} />
            </section>
          );
        })}
        <section className="epic-board-section unassigned-epic">
          <header className="epic-board-heading">
            <div>
              <span className="epic-heading-icon neutral"><KanbanSquare size={18} /></span>
              <div><span className="eyebrow">Sammelbereich</span><h2>Tickets ohne Epic</h2><p>Noch keinem übergeordneten Thema zugeordnet.</p></div>
            </div>
            <div className="epic-heading-meta"><span>{withoutEpic.length} Tickets</span></div>
          </header>
          <KanbanGroup epic={null} tickets={withoutEpic} onOpen={onOpen} onCreate={onCreate} onMove={onMove} critical={critical} />
        </section>
      </div>
    </div>
  );
}

function KanbanGroup({
  epic,
  tickets,
  onOpen,
  onCreate,
  onMove,
  critical,
}: {
  epic: Epic | null;
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onCreate: (status: TicketStatus, epic: Epic | null) => void;
  onMove: (id: number, status: TicketStatus, epic: Epic | null) => void;
  critical: (ticket: Ticket) => boolean;
}) {
  return (
    <div className="board">
        {columns.map((column) => {
          const items = tickets.filter((ticket) => ticket.status === column.status);
          return (
            <section
              className="board-column"
              key={column.status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = Number(event.dataTransfer.getData("text/ticket-id"));
                if (id) onMove(id, column.status, epic);
              }}
            >
              <header style={{ borderTopColor: column.accent }}>
                <div><h2>{column.label}</h2><span>{items.length}</span></div>
                <button onClick={() => onCreate(column.status, epic)} aria-label={`Ticket in ${column.label} anlegen`}><Plus size={18} /></button>
              </header>
              <div className="column-body">
                {items.map((ticket) => (
                  <button
                    className={`ticket-card ${critical(ticket) ? "ticket-critical" : ""}`}
                    key={ticket.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/ticket-id", String(ticket.id))}
                    onClick={() => onOpen(ticket)}
                  >
                    <div className="ticket-card-top">
                      <span className="epic-label">{epic?.title ?? "Ohne Epic"}</span>
                      {critical(ticket) && <AlertTriangle size={16} />}
                    </div>
                    <strong>{ticket.title}</strong>
                    {ticket.description && <p>{ticket.description}</p>}
                    <div className="ticket-meta">
                      <span>{ticket.phase_name ?? "Ohne Phase"}</span>
                      {ticket.due_on && <span><CalendarDays size={13} /> {new Date(`${ticket.due_on}T00:00:00`).toLocaleDateString("de-DE")}</span>}
                    </div>
                    <div className="progress"><span style={{ width: `${ticket.progress}%` }} /></div>
                  </button>
                ))}
                {!items.length && <div className="column-empty">Karte hierher ziehen</div>}
              </div>
            </section>
          );
        })}
      </div>
  );
}

const priorityInfo: Record<MethodologyPriority, { label: string; combination: string; className: string }> = {
  alpha: { label: "Alpha", combination: "Wichtig und dringend", className: "priority-alpha" },
  beta: { label: "Beta", combination: "Nicht wichtig und dringend", className: "priority-beta" },
  gamma: { label: "Gamma", combination: "Wichtig und nicht dringend", className: "priority-gamma" },
  delta: { label: "Delta", combination: "Nicht wichtig und nicht dringend", className: "priority-delta" },
  unprioritized: { label: "Noch ohne Prio", combination: "Wichtigkeit und Dringlichkeit noch nicht bewertet", className: "priority-unprioritized" },
};

function Methodology({
  tickets,
  onOpen,
  onCreate,
  onReprioritize,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onCreate: () => void;
  onReprioritize: (id: number, priority: MethodologyPriority) => void;
}) {
  return (
    <div className="page methodology-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Projektmanagement-Wissen</span>
          <h1>Methodik</h1>
          <p>Methoden dokumentieren, vergleichen und direkt auf die Aufgaben des aktuellen Projekts anwenden.</p>
        </div>
        <button className="button primary" onClick={onCreate}><Plus size={17} /> Ticket</button>
      </div>

      <section className="method-intro">
        <div>
          <span className="method-number">01</span>
          <div>
            <h2>Eisenhower-Matrix</h2>
            <p>Aufgaben werden anhand der beiden Dimensionen Wichtigkeit und Dringlichkeit priorisiert.</p>
          </div>
        </div>
        <div className="gamma-rule">
          <AlertTriangle size={19} />
          <p><strong>Persönliche Gamma-Regel:</strong> Gamma-Aufgaben werden zunächst nicht erledigt. Sie werden regelmäßig neu bewertet und erst bearbeitet, wenn sie dringend und damit zu Alpha-Aufgaben werden.</p>
        </div>
      </section>

      <div className="methodology-layout">
        <section className="matrix-card personal-matrix-card">
          <header>
            <div><span className="matrix-kicker">Im PM-Tool aktiv</span><h2>Individuelle Eisenhower-Matrix</h2></div>
            <p>Alpha bis Delta</p>
          </header>
          <p className="matrix-help">Ziehe Tickets in einen Quadranten, um Wichtigkeit und Dringlichkeit zu ändern.</p>
          <div className="unprioritized-pool">
            <PriorityQuadrant priority="unprioritized" tickets={tickets} onOpen={onOpen} onDrop={onReprioritize} />
          </div>
          <div className="matrix-axis-label top">Dringlichkeit →</div>
          <div className="personal-matrix">
            <div className="matrix-corner" />
            <div className="axis-heading">Dringend</div>
            <div className="axis-heading">Nicht dringend</div>
            <div className="axis-heading vertical">Wichtig</div>
            <PriorityQuadrant priority="alpha" tickets={tickets} onOpen={onOpen} onDrop={onReprioritize} />
            <PriorityQuadrant priority="gamma" tickets={tickets} onOpen={onOpen} onDrop={onReprioritize} />
            <div className="axis-heading vertical">Nicht wichtig</div>
            <PriorityQuadrant priority="beta" tickets={tickets} onOpen={onOpen} onDrop={onReprioritize} />
            <PriorityQuadrant priority="delta" tickets={tickets} onOpen={onOpen} onDrop={onReprioritize} />
          </div>
          <div className="matrix-axis-label side">Wichtigkeit ↑</div>
        </section>
      </div>
    </div>
  );
}

function PriorityQuadrant({
  priority,
  tickets,
  onOpen,
  onDrop,
}: {
  priority: MethodologyPriority;
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onDrop: (id: number, priority: MethodologyPriority) => void;
}) {
  const info = priorityInfo[priority];
  const items = tickets.filter((ticket) => ticket.methodology_priority === priority);
  return (
    <div
      className={`priority-quadrant ${info.className}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const id = Number(event.dataTransfer.getData("text/ticket-id"));
        if (id) onDrop(id, priority);
      }}
    >
      <header><div><strong>{info.label}</strong><span>{info.combination}</span></div><b>{items.length}</b></header>
      <div className="priority-ticket-list">
        {items.map((ticket) => (
          <button
            key={ticket.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/ticket-id", String(ticket.id))}
            onClick={() => onOpen(ticket)}
          >
            <span>{ticket.title}</span>
            {ticket.due_on && <small><CalendarDays size={12} /> {new Date(`${ticket.due_on}T00:00:00`).toLocaleDateString("de-DE")}</small>}
          </button>
        ))}
        {!items.length && <div className="priority-empty">Ticket hierher ziehen</div>}
      </div>
    </div>
  );
}

function Documents({
  blocks,
  onCreateBlock,
  onEditBlock,
  onCreateEntry,
  onAddDocuments,
  onCreateNote,
  onEditNote,
  onPreview,
}: {
  blocks: DocumentBlock[];
  onCreateBlock: () => void;
  onEditBlock: (block: DocumentBlock) => void;
  onCreateEntry: (block: DocumentBlock) => void;
  onAddDocuments: (entry: DocumentEntry) => void;
  onCreateNote: (entry: DocumentEntry) => void;
  onEditNote: (entry: DocumentEntry, noteId: number) => void;
  onPreview: (document: DocumentAttachment) => void;
}) {
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(() => new Set(blocks.map((block) => block.id)));
  const [openEntries, setOpenEntries] = useState<Set<number>>(new Set());

  useEffect(() => {
    setOpenBlocks((current) => {
      const next = new Set(current);
      blocks.forEach((block) => next.add(block.id));
      return next;
    });
  }, [blocks]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) {
    setter((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const documentCount = blocks.reduce(
    (sum, block) => sum + block.entries.reduce((entrySum, entry) => entrySum + entry.documents.length, 0),
    0,
  );

  return (
    <div className="page documents-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Projektwissen</span>
          <h1>Dokumente</h1>
          <p>Thematisch geordnete Sitzungen, Protokolle, Pläne und Workshop-Ergebnisse.</p>
        </div>
        <button className="button primary" onClick={onCreateBlock}><Plus size={17} /> Thematischer Block</button>
      </div>

      <div className="document-summary">
        <div><Folder size={19} /><strong>{blocks.length}</strong><span>Blöcke</span></div>
        <div><FileText size={19} /><strong>{blocks.reduce((sum, block) => sum + block.entries.length, 0)}</strong><span>Einträge</span></div>
        <div><FileIcon size={19} /><strong>{documentCount}</strong><span>Dateien</span></div>
        <p>Gespeichert unter <code>~/pm-tool-contents/uploads</code></p>
      </div>

      {!blocks.length ? (
        <div className="documents-empty">
          <div className="empty-icon"><Folder size={30} /></div>
          <h2>Noch keine Dokumentenblöcke</h2>
          <p>Erstelle beispielsweise „Festausschusssitzungen“ oder „Festleitersitzungen“.</p>
          <button className="button primary" onClick={onCreateBlock}><Plus size={17} /> Ersten Block erstellen</button>
        </div>
      ) : (
        <div className="document-blocks">
          {blocks.map((block) => {
            const isOpen = openBlocks.has(block.id);
            const files = block.entries.reduce((sum, entry) => sum + entry.documents.length, 0);
            return (
              <section className="document-block" key={block.id}>
                <header>
                  <button className="collapse-button" onClick={() => toggle(setOpenBlocks, block.id)}>
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <span className="folder-icon"><Folder size={19} /></span>
                    <span><strong>{block.name}</strong>{block.description && <small>{block.description}</small>}</span>
                  </button>
                  <div className="block-meta"><span>{block.entries.length} Einträge</span><span>{files} Dateien</span></div>
                  <button className="icon-button block-edit-button" onClick={() => onEditBlock(block)} aria-label={`${block.name} bearbeiten`}><Pencil size={16} /></button>
                  <button className="button secondary compact-button" onClick={() => onCreateEntry(block)}><Plus size={16} /> Eintrag</button>
                </header>
                {isOpen && (
                  <div className="document-entries">
                    {!block.entries.length && <div className="entry-empty">Noch keine Einträge in diesem Block.</div>}
                    {block.entries.map((entry) => {
                      const entryOpen = openEntries.has(entry.id);
                      return (
                        <article className="document-entry" key={entry.id}>
                          <button className="entry-heading" onClick={() => toggle(setOpenEntries, entry.id)}>
                            {entryOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            <span className="entry-date">
                              <strong>{new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong>
                            </span>
                            <span className="entry-title"><strong>{entry.name}</strong>{entry.notes && <small>{entry.notes}</small>}</span>
                            <span className="attachment-count"><FileIcon size={14} /> {entry.documents.length}</span>
                          </button>
                          <button
                            className="entry-note-button"
                            onClick={() => onCreateNote(entry)}
                            title="Markdown-/TeX-Notiz erstellen"
                          >
                            <NotebookPen size={15} />
                            Notiz
                          </button>
                          {entryOpen && (
                            <div className="attachment-grid">
                              {!entry.documents.length && <div className="attachment-empty">Für diesen Eintrag wurden keine Dokumente hochgeladen.</div>}
                              {entry.documents.map((document) => (
                                <div className="attachment-tile-wrap" key={document.id}>
                                  <button className="attachment-tile" onClick={() => onPreview(document)}>
                                    <AttachmentThumbnail document={document} />
                                    <span className="attachment-info">
                                      <strong>{document.title}</strong>
                                      <small>{document.file_name} · {formatFileSize(document.file_size)}</small>
                                    </span>
                                  </button>
                                  {document.editable_note_id && (
                                    <button
                                      className="edit-note-button"
                                      onClick={() => onEditNote(entry, document.editable_note_id!)}
                                      aria-label={`${document.title} bearbeiten`}
                                      title="Notiz bearbeiten und PDF neu erzeugen"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button className="attachment-tile add-attachment-tile" onClick={() => onAddDocuments(entry)}>
                                <span className="attachment-preview"><Plus size={24} /></span>
                                <span className="attachment-info"><strong>Dokumente hinzufügen</strong><small>PDF, Word oder Bilder</small></span>
                              </button>
                              <button className="attachment-tile add-note-tile" onClick={() => onCreateNote(entry)}>
                                <span className="attachment-preview"><NotebookPen size={24} /></span>
                                <span className="attachment-info"><strong>Notiz erstellen</strong><small>Markdown und TeX als PDF</small></span>
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttachmentThumbnail({ document }: { document: DocumentAttachment }) {
  if (document.file_kind === "image") {
    return <span className="attachment-preview image-preview"><img src={document.file_url} alt="" /></span>;
  }
  if (document.file_kind === "pdf") {
    return <span className="attachment-preview pdf-preview"><FileText size={25} /><b>PDF</b></span>;
  }
  if (document.file_kind === "word") {
    return <span className="attachment-preview word-preview"><FileText size={25} /><b>WORD</b></span>;
  }
  return <span className="attachment-preview"><FileIcon size={25} /></span>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function GermanDatePicker({
  name,
  defaultValue,
  optional = false,
}: {
  name: string;
  defaultValue?: string;
  optional?: boolean;
}) {
  const today = new Date();
  const [value, setValue] = useState(() => defaultValue ?? (optional ? "" : toLocalIsoDate(today)));
  const initialDate = defaultValue ? new Date(`${defaultValue}T00:00:00`) : today;
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [open, setOpen] = useState(false);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="german-date-picker">
      <input name={name} type="hidden" value={value} readOnly />
      <button type="button" className="date-display" onClick={() => setOpen((current) => !current)}>
        <CalendarDays size={17} />
        <span>{value ? new Date(`${value}T00:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Datum wählen"}</span>
        <small>TT.MM.JJJJ</small>
      </button>
      {open && (
        <div className="calendar-popover">
          <header>
            <button type="button" className="icon-button" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} aria-label="Vorheriger Monat"><ChevronLeft size={18} /></button>
            <strong>{visibleMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</strong>
            <button type="button" className="icon-button" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} aria-label="Nächster Monat"><ChevronRight size={18} /></button>
          </header>
          <div className="calendar-grid calendar-weekdays">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid calendar-days">
            {cells.map((day, index) =>
              day === null ? <span key={`empty-${index}`} /> : (
                <button
                  type="button"
                  key={day}
                  className={value === toLocalIsoDate(new Date(year, month, day)) ? "selected" : ""}
                  onClick={() => {
                    setValue(toLocalIsoDate(new Date(year, month, day)));
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="calendar-today"
            onClick={() => {
              const now = new Date();
              setValue(toLocalIsoDate(now));
              setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              setOpen(false);
            }}
          >
            Heute
          </button>
          {optional && value && (
            <button
              type="button"
              className="calendar-clear"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
            >
              Datum entfernen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function NoteEditor({
  state,
  onClose,
  onSave,
}: {
  state: NoteEditorState;
  onClose: () => void;
  onSave: (title: string, source: string, preview: HTMLElement) => Promise<void>;
}) {
  const [title, setTitle] = useState(state.note?.title ?? "Neue Notiz");
  const [source, setSource] = useState(
    state.note?.source ??
      "Hier beginnt deine Notiz in **Markdown**.\n\nEine TeX-Formel kann inline stehen: $a^2 + b^2 = c^2$\n\nOder als eigener Block:\n\n$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$",
  );
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const rendered = useMemo(() => noteRenderer.render(source), [source]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!previewRef.current) return;
    setSaving(true);
    try {
      await onSave(title, source, previewRef.current);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="note-editor-backdrop" role="dialog" aria-modal="true" aria-label="Notiz bearbeiten">
      <form className="note-editor-shell" onSubmit={submit}>
        <header>
          <div>
            <span className="eyebrow">{state.note ? "Notiz bearbeiten" : "Neue Notiz"} · {state.entry.name}</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Titel der Notiz"
            />
          </div>
          <div>
            <button type="button" className="button ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? <><Loader2 className="spin" size={17} /> PDF wird erstellt …</> : <><FileText size={17} /> Als PDF speichern</>}
            </button>
          </div>
        </header>
        <div className="note-editor-help">
          <span><strong>Markdown:</strong> <code># Überschrift</code>, <code>**fett**</code>, <code>- Liste</code></span>
          <span><strong>TeX:</strong> <code>$Formel$</code> oder <code>$$Formel$$</code></span>
          <span>Die Quelle bleibt gespeichert und kann später über das Stift-Symbol bearbeitet werden.</span>
        </div>
        <div className="note-editor-columns">
          <section className="note-source-pane">
            <header><strong>Markdown / TeX</strong><span>Quelltext</span></header>
            <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck />
          </section>
          <section className="note-preview-pane">
            <header><strong>PDF-Vorschau</strong><span>DIN A4</span></header>
            <div className="note-page-wrap">
              <article className="note-pdf-page" ref={previewRef}>
                <h1 className="note-pdf-title">{title}</h1>
                <div dangerouslySetInnerHTML={{ __html: rendered }} />
              </article>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}

function DocumentPreview({ document, onClose }: { document: DocumentAttachment; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label={`Vorschau ${document.title}`}>
      <header>
        <div><strong>{document.title}</strong><span>{document.file_name} · {formatFileSize(document.file_size)}</span></div>
        <div className="preview-actions">
          {document.file_kind === "image" && (
            <>
              <button className="icon-button" onClick={() => setZoom((value) => Math.max(.5, value - .25))} aria-label="Verkleinern"><ZoomOut size={19} /></button>
              <span>{Math.round(zoom * 100)} %</span>
              <button className="icon-button" onClick={() => setZoom((value) => Math.min(4, value + .25))} aria-label="Vergrößern"><ZoomIn size={19} /></button>
            </>
          )}
          <a className="icon-button" href={document.file_url} download={document.file_name} aria-label="Herunterladen"><Download size={19} /></a>
          <button className="icon-button" onClick={onClose} aria-label="Vorschau schließen"><X size={21} /></button>
        </div>
      </header>
      <div className="preview-stage">
        {document.file_kind === "image" && (
          <div className="zoom-canvas"><img src={document.file_url} alt={document.title} style={{ transform: `scale(${zoom})` }} /></div>
        )}
        {document.file_kind === "pdf" && <iframe src={document.file_url} title={document.title} />}
        {document.file_kind === "word" && (
          <div className="unsupported-preview"><FileText size={48} /><h2>Word-Dokument</h2><p>Word-Dateien können vom Browser nicht zuverlässig direkt angezeigt werden.</p><a className="button primary" href={document.file_url} download={document.file_name}><Download size={17} /> Datei herunterladen</a></div>
        )}
        {document.file_kind === "other" && (
          <div className="unsupported-preview"><FileIcon size={48} /><h2>Keine Vorschau verfügbar</h2><a className="button primary" href={document.file_url} download={document.file_name}><Download size={17} /> Datei herunterladen</a></div>
        )}
      </div>
    </div>
  );
}

function EmptyProject({ onCreate }: { onCreate: () => void }) {
  return <div className="center-state empty-project"><div className="empty-icon"><KanbanSquare size={32} /></div><h1>Dein erstes Projekt</h1><p>Lege ein Projekt an und definiere anschließend die passenden Phasen in der Timeline.</p><button className="button primary" onClick={onCreate}><Plus size={17} /> Projekt anlegen</button></div>;
}

function ComingSoon({ view, onKanban }: { view: View; onKanban: () => void }) {
  const item = navigation.find((entry) => entry.id === view)!;
  const Icon = item.icon;
  return <div className="center-state coming-soon"><div className="empty-icon"><Icon size={30} /></div><span className="eyebrow">Nächste Ausbaustufe</span><h1>{item.label}</h1><p>Dieser Bereich ist in der Navigation vorbereitet. Zuerst steht dir das vollständig gespeicherte Kanban-Board zur Verfügung.</p><button className="button primary" onClick={onKanban}>Zum Kanban-Board</button></div>;
}

function Modal({
  title,
  onClose,
  wide = false,
  overflowVisible = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  overflowVisible?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? "modal-wide" : ""} ${overflowVisible ? "modal-overflow-visible" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Dialog schließen"><X size={20} /></button></header>
        {children}
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
