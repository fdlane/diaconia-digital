"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon, GridIcon } from "./icons";
import { PageLoadingState } from "./PageLoadingState";
import type { UserOption } from "./types";

type Group = {
  id: string;
  name: string;
  community: string;
  active: boolean;
};

type MeetingDetail = {
  id: string;
  groupId: string;
  chaplainId: string | null;
  heldAt: string;
  scheduledStartAt: string;
  occurredAt: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  address: string | null;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

type FormState = {
  groupId: string;
  chaplainId: string;
  heldAt: string;
  latitude: string;
  longitude: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

const empty: FormState = {
  groupId: "",
  chaplainId: "",
  heldAt: "",
  latitude: "",
  longitude: "",
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
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chaplains, setChaplains] = useState<UserOption[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !token) return;
    const loadKey = id ?? "new";
    if (loadedKeyRef.current === loadKey) return;
    loadedKeyRef.current = loadKey;
    void loadData();
  }, [id, isLoaded, token]);

  async function loadData() {
    if (!token) return;
    setLoadStatus("loading");

    const [groupsResult, chaplainsResult, meetingResult] = await Promise.all([
      apiFetch<{ groups: Group[] }>("/groups", token),
      apiFetch<{ chaplains: UserOption[] }>("/chaplains", token),
      isEdit && id ? apiFetch<{ meeting: MeetingDetail }>(`/meetings/${id}`, token) : null,
    ]);

    if (!groupsResult.ok) {
      setErrorMsg(`Failed to load groups: ${groupsResult.error}`);
      setLoadStatus("error");
      return;
    }

    const activeGroups = groupsResult.data.groups.filter((g) => g.active);
    setGroups(activeGroups);

    if (chaplainsResult?.ok) {
      setChaplains(chaplainsResult.data.chaplains);
    }

    if (meetingResult) {
      if (!meetingResult.ok) {
        setErrorMsg(`Failed to load meeting: ${meetingResult.error}`);
        setLoadStatus("error");
        return;
      }
      const s = meetingResult.data.meeting;
      setForm({
        groupId: s.groupId,
        chaplainId: s.chaplainId ?? "",
        heldAt: toDatetimeLocal(s.heldAt),
        latitude: s.latitude != null ? String(s.latitude) : "",
        longitude: s.longitude != null ? String(s.longitude) : "",
        notes: s.notes,
        followUpCategory: s.followUpCategory,
        followUpNotes: s.followUpNotes,
      });
    } else if (activeGroups.length > 0) {
      setForm((prev) => ({ ...prev, groupId: activeGroups[0]!.id }));
    }

    setLoadStatus("ready");
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErrorMsg(l.authMissingSession); setSaveStatus("error"); return; }
    setSaveStatus("saving");
    setErrorMsg("");

    const heldAtIso = form.heldAt ? new Date(form.heldAt).toISOString() : "";

    const body = JSON.stringify({
      groupId: form.groupId,
      chaplainId: form.chaplainId || null,
      scheduledStartAt: heldAtIso,
      occurredAt: heldAtIso,
      status: "completed",
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      locationName: null,
      address: null,
      locationSource: form.latitude && form.longitude ? "manual" : null,
      notes: form.notes,
      followUpCategory: form.followUpCategory,
      followUpNotes: form.followUpNotes,
      attendance: [],
      prayerRequests: [],
    });

    const result = await apiFetch<{ id: string }>(
      isEdit ? `/meetings/${id}` : "/meetings",
      token,
      { method: isEdit ? "PUT" : "POST", body },
    );

    if (!result.ok) {
      setErrorMsg(result.error);
      setSaveStatus("error");
      return;
    }

    router.push(isEdit ? `/meetings/${id}` : `/meetings/${result.data.id}`);
  }

  const breadcrumbs = [
    { label: l.meetings, href: "/meetings" },
    ...(isEdit ? [{ label: id!, href: `/meetings/${id}` }] : []),
    { label: isEdit ? l.editMeeting : l.newMeeting },
  ];

  if (loadStatus === "loading") {
    return <PageLoadingState breadcrumbs={breadcrumbs} loadingLabel={l.loading} />;
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
              <GridIcon size={40} />
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

              <div className="form-field" style={{ maxWidth: 320 }}>
                <label htmlFor="f-chaplain">{l.chaplainAttended}</label>
                <select
                  id="f-chaplain"
                  onChange={field("chaplainId")}
                  value={form.chaplainId}
                >
                  <option value="">{l.selectChaplain}</option>
                  {chaplains.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{l.locationPin}</label>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="text-sm text-muted" htmlFor="f-lat" style={{ marginBottom: "0.25rem", display: "block" }}>
                      {l.latitude}
                    </label>
                    <input
                      id="f-lat"
                      onChange={field("latitude")}
                      placeholder="-25.2867"
                      step="any"
                      type="number"
                      value={form.latitude}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="text-sm text-muted" htmlFor="f-lng" style={{ marginBottom: "0.25rem", display: "block" }}>
                      {l.longitude}
                    </label>
                    <input
                      id="f-lng"
                      onChange={field("longitude")}
                      placeholder="-57.6478"
                      step="any"
                      type="number"
                      value={form.longitude}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted" style={{ marginTop: "0.375rem" }}>
                  {l.gpsInstructions}
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="f-notes">{l.colNotes}</label>
                <textarea
                  id="f-notes"
                  maxLength={4000}
                  onChange={field("notes")}
                  placeholder={l.placeholderMeetingNotes}
                  style={{ minHeight: "6rem" }}
                  value={form.notes}
                />
              </div>
            </div>

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
