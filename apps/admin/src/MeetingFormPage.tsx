"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Group = {
  id: string;
  name: string;
  community: string;
  active: boolean;
};

type SessionDetail = {
  id: string;
  groupId: string;
  heldAt: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

type FormState = {
  groupId: string;
  heldAt: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

const empty: FormState = {
  groupId: "",
  heldAt: "",
  notes: "",
  followUpCategory: "none",
  followUpNotes: "",
};

function toDatetimeLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingFormPage({ id }: { id?: string }) {
  const { token, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void loadData();
  }, [id, token]);

  async function loadData() {
    setLoadStatus("loading");
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

    try {
      const [groupsRes, sessionRes] = await Promise.all([
        fetch(`${apiUrl}/admin/groups`, { headers }),
        isEdit && id ? fetch(`${apiUrl}/admin/sessions/${id}`, { headers }) : Promise.resolve(null),
      ]);

      if (!groupsRes.ok) {
        setErrorMsg(`Failed to load groups: ${groupsRes.status}`);
        setLoadStatus("error");
        return;
      }

      const groupsData = (await groupsRes.json()) as { groups: Group[] };
      setGroups(groupsData.groups.filter((g) => g.active));

      if (sessionRes) {
        if (!sessionRes.ok) {
          setErrorMsg(`Failed to load session: ${sessionRes.status}`);
          setLoadStatus("error");
          return;
        }
        const sessionData = (await sessionRes.json()) as { session: SessionDetail };
        const s = sessionData.session;
        setForm({
          groupId: s.groupId,
          heldAt: toDatetimeLocal(s.heldAt),
          notes: s.notes,
          followUpCategory: s.followUpCategory,
          followUpNotes: s.followUpNotes,
        });
      } else if (groupsData.groups.length > 0) {
        setForm((prev) => ({ ...prev, groupId: groupsData.groups[0]!.id }));
      }

      setLoadStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setLoadStatus("error");
    }
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setErrorMsg("");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };

    const heldAtIso = form.heldAt ? new Date(form.heldAt).toISOString() : "";

    const body = JSON.stringify({
      groupId: form.groupId,
      heldAt: heldAtIso,
      notes: form.notes,
      followUpCategory: form.followUpCategory,
      followUpNotes: form.followUpNotes,
    });

    try {
      const url = isEdit ? `${apiUrl}/admin/sessions/${id}` : `${apiUrl}/admin/sessions`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setSaveStatus("error");
        return;
      }

      const data = isEdit ? null : ((await res.json()) as { id: string });
      router.push(isEdit ? `/meetings/${id}` : `/meetings/${data!.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setSaveStatus("error");
    }
  }

  if (loadStatus === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/meetings">{l.meetings}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{l.loading}</span>
        </nav>
        <div className="status-bar">
          <span className="loading-dot" />
          <span>{l.loading}</span>
        </div>
      </div>
    );
  }

  const followUpOptions = [
    { value: "none", label: l.followUpNone },
    { value: "financial", label: l.followUpFinancial },
    { value: "training", label: l.followUpTraining },
    { value: "wellbeing", label: l.followUpWellbeing },
    { value: "documentation", label: l.followUpDocumentation },
    { value: "other", label: l.followUpOther },
  ];

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <Link href="/meetings">{l.meetings}</Link>
        <span className="breadcrumb-sep">›</span>
        {isEdit ? (
          <>
            <Link href={`/meetings/${id}`}>{id}</Link>
            <span className="breadcrumb-sep">›</span>
          </>
        ) : null}
        <span>{isEdit ? l.editMeeting : l.newMeeting}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? l.editMeeting : l.newMeeting}</h1>
        </div>
        <div className="page-header-actions">
          <Link className="btn-link" href={isEdit ? `/meetings/${id}` : "/meetings"}>
            <ArrowLeftIcon size={14} />{l.cancel}
          </Link>
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      {loadStatus === "ready" && groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg fill="none" height={40} stroke="currentColor" strokeLinecap="round"
                strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24" width={40}>
                <rect height="7" rx="1" width="7" x="3" y="3" />
                <rect height="7" rx="1" width="7" x="14" y="3" />
                <rect height="7" rx="1" width="7" x="3" y="14" />
                <rect height="7" rx="1" width="7" x="14" y="14" />
              </svg>
            </div>
            <p className="empty-state-title">{l.noGroupsForMeeting}</p>
            <Link className="btn btn-primary" href="/groups/new">
              {l.createGroupFirst}
            </Link>
          </div>
        </div>
      ) : null}

      {groups.length > 0 ? (
      <form onSubmit={handleSubmit}>
        <div className="card">
          {/* Basic Info */}
          <div className="form-section">
            <p className="form-section-title">{l.overview}</p>

            <div className="form-field">
              <label htmlFor="f-group">{l.colGroup}</label>
              <select
                id="f-group"
                onChange={field("groupId")}
                required
                value={form.groupId}
              >
                <option disabled value="">{l.selectGroup}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.community}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field" style={{ maxWidth: 280 }}>
              <label htmlFor="f-date">{l.dateTime}</label>
              <input
                id="f-date"
                onChange={field("heldAt")}
                required
                type="datetime-local"
                value={form.heldAt}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-notes">{l.colNotes}</label>
              <textarea
                id="f-notes"
                maxLength={4000}
                onChange={field("notes")}
                placeholder={locale === "es" ? "Notas de la reunión" : "Meeting notes"}
                style={{ minHeight: "6rem" }}
                value={form.notes}
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="form-section">
            <p className="form-section-title">{l.followUpLabel}</p>

            <div className="form-field" style={{ maxWidth: 280 }}>
              <label htmlFor="f-followup">{l.colFollowUp}</label>
              <select
                id="f-followup"
                onChange={field("followUpCategory")}
                value={form.followUpCategory}
              >
                {followUpOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {form.followUpCategory !== "none" ? (
              <div className="form-field">
                <label htmlFor="f-followup-notes">{l.colNotes}</label>
                <textarea
                  id="f-followup-notes"
                  maxLength={2000}
                  onChange={field("followUpNotes")}
                  style={{ minHeight: "4rem" }}
                  value={form.followUpNotes}
                />
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <Link className="btn-link" href={isEdit ? `/meetings/${id}` : "/meetings"}>
              {l.cancel}
            </Link>
            <button className="btn btn-primary" disabled={saveStatus === "saving"} type="submit">
              {saveStatus === "saving" ? l.saving : l.save}
            </button>
          </div>
        </div>
      </form>
      ) : null}
    </div>
  );
}
