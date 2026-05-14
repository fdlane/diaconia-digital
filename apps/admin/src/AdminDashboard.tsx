"use client";

import { formatDisplayDate } from "@diaconia/shared";
import { useEffect, useMemo, useState } from "react";

type AdminSession = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
  groupName: string;
  community: string;
  facilitatorName: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

type SessionMedia = {
  id: string;
  type: string;
  url: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AdminDashboard() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [mediaBySession, setMediaBySession] = useState<Record<string, SessionMedia[]>>({});
  const [token, setToken] = useState("");
  const [filters, setFilters] = useState({
    facilitatorId: "",
    groupId: "",
    from: "",
    to: "",
  });
  const [status, setStatus] = useState("Listo");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  async function loadSessions() {
    setStatus("Cargando sesiones");
    const requestInit = token
      ? {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      : undefined;
    const response = await fetch(`${apiUrl}/admin/sessions${query ? `?${query}` : ""}`, requestInit);

    if (!response.ok) {
      setStatus(`Error ${response.status}`);
      return;
    }

    const payload = (await response.json()) as { sessions: AdminSession[] };
    setSessions(payload.sessions);
    const mediaEntries = await Promise.all(
      payload.sessions.slice(0, 20).map(async (session) => {
        const mediaResponse = await fetch(`${apiUrl}/admin/sessions/${session.id}/media`, requestInit);

        if (!mediaResponse.ok) {
          return [session.id, []] as const;
        }

        const mediaPayload = (await mediaResponse.json()) as { media: SessionMedia[] };
        return [session.id, mediaPayload.media] as const;
      }),
    );
    setMediaBySession(Object.fromEntries(mediaEntries));
    setStatus(`${payload.sessions.length} sesiones`);
  }

  function exportCsv() {
    const header = [
      "heldAt",
      "groupName",
      "community",
      "facilitatorName",
      "followUpCategory",
      "notes",
      "followUpNotes",
    ];
    const rows = sessions.map((session) =>
      header
        .map((key) => {
          const value = String(session[key as keyof AdminSession] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diaconia-sessions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>Diaconia Admin</strong>
          <span>Sesiones de campo y asistencia</span>
        </div>
        <button className="secondary" onClick={exportCsv} type="button">
          Exportar CSV
        </button>
      </header>

      <section className="content">
        <div className="toolbar" aria-label="Filtros">
          <div className="field">
            <label htmlFor="token">Token Cognito</label>
            <input
              id="token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="Bearer token para ambiente real"
              value={token}
            />
          </div>
          <div className="field">
            <label htmlFor="from">Desde</label>
            <input
              id="from"
              onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))}
              type="date"
              value={filters.from}
            />
          </div>
          <div className="field">
            <label htmlFor="to">Hasta</label>
            <input
              id="to"
              onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))}
              type="date"
              value={filters.to}
            />
          </div>
          <div className="field">
            <label htmlFor="group">Grupo</label>
            <input
              id="group"
              onChange={(event) =>
                setFilters((value) => ({ ...value, groupId: event.target.value }))
              }
              placeholder="UUID"
              value={filters.groupId}
            />
          </div>
          <button onClick={loadSessions} type="button">
            Filtrar
          </button>
        </div>

        <p className="muted">{status}</p>

        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Grupo</th>
                <th>Facilitador</th>
                <th>Seguimiento</th>
                <th>Fotos</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{formatDisplayDate(session.heldAt)}</td>
                  <td>
                    <strong>{session.groupName}</strong>
                    <br />
                    <span className="muted">{session.community}</span>
                  </td>
                  <td>{session.facilitatorName}</td>
                  <td>
                    <span className="badge">{session.followUpCategory}</span>
                    {session.followUpNotes ? <p>{session.followUpNotes}</p> : null}
                  </td>
                  <td>
                    <div className="thumbs">
                      {(mediaBySession[session.id] ?? []).map((media) => (
                        <img alt="Foto de reunion" key={media.id} src={media.url} />
                      ))}
                    </div>
                  </td>
                  <td>{session.notes || "Sin notas"}</td>
                </tr>
              ))}
              {!sessions.length ? (
                <tr>
                  <td colSpan={6}>No hay sesiones para mostrar.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
