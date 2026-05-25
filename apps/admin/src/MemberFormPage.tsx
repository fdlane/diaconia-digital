"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type UserRole = "facilitator" | "admin" | "chaplain";

type UserDetail = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  cognitoSub: string;
};

type FormState = {
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  cognitoSub: string;
};

const empty: FormState = {
  displayName: "",
  email: "",
  phone: "",
  role: "facilitator",
  cognitoSub: "",
};

export function MemberFormPage({ id }: { id?: string }) {
  const { token, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    isEdit ? "loading" : "ready",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isEdit && id) void loadUser(id);
  }, [id, token]);

  async function loadUser(userId: string) {
    setLoadStatus("loading");
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${apiUrl}/admin/users/${userId}`, { headers });
      if (!res.ok) {
        setLoadStatus("error");
        setErrorMsg(`Error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { user: UserDetail };
      const u = data.user;
      setForm({
        displayName: u.displayName,
        email: u.email ?? "",
        phone: u.phone ?? "",
        role: u.role,
        cognitoSub: u.cognitoSub,
      });
      setLoadStatus("ready");
    } catch (err) {
      setLoadStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error");
    }
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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

    const body = isEdit
      ? JSON.stringify({
          displayName: form.displayName,
          email: form.email || null,
          phone: form.phone || null,
          role: form.role,
        })
      : JSON.stringify({
          displayName: form.displayName,
          email: form.email || null,
          phone: form.phone || null,
          role: form.role,
          cognitoSub: form.cognitoSub || undefined,
        });

    try {
      const url = isEdit ? `${apiUrl}/admin/users/${id}` : `${apiUrl}/admin/users`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setSaveStatus("error");
        return;
      }

      const data = isEdit ? null : ((await res.json()) as { id: string });
      router.push(isEdit ? `/members/${id}` : `/members/${data!.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setSaveStatus("error");
    }
  }

  if (loadStatus === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/members">{l.members}</Link>
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

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <Link href="/members">{l.members}</Link>
        <span className="breadcrumb-sep">›</span>
        {isEdit ? (
          <>
            <Link href={`/members/${id}`}>{form.displayName || id}</Link>
            <span className="breadcrumb-sep">›</span>
          </>
        ) : null}
        <span>{isEdit ? l.editMember : l.newMember}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? l.editMember : l.newMember}</h1>
        </div>
        <div className="page-header-actions">
          <Link className="btn-link" href={isEdit ? `/members/${id}` : "/members"}>
            <ArrowLeftIcon size={14} />{l.cancel}
          </Link>
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-section">
            <p className="form-section-title">{l.memberDetail}</p>

            <div className="form-field">
              <label htmlFor="f-name">{l.displayName}</label>
              <input
                id="f-name"
                onChange={field("displayName")}
                placeholder="Full name"
                required
                value={form.displayName}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-email">{l.colEmail}</label>
              <input
                id="f-email"
                onChange={field("email")}
                placeholder="email@example.com"
                type="email"
                value={form.email}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-phone">{l.colPhone}</label>
              <input
                id="f-phone"
                onChange={field("phone")}
                placeholder="+595 981 000 000"
                value={form.phone}
              />
            </div>

            <div className="form-field" style={{ maxWidth: 240 }}>
              <label htmlFor="f-role">{l.colRole}</label>
              <select id="f-role" onChange={field("role")} value={form.role}>
                <option value="facilitator">{l.roleFacilitator}</option>
                <option value="admin">{l.roleAdmin}</option>
                <option value="chaplain">{locale === "es" ? "Capellán" : "Chaplain"}</option>
              </select>
            </div>

            {!isEdit ? (
              <div className="form-field">
                <label htmlFor="f-sub">
                  {l.cognitoSub}{" "}
                  <span className="text-muted text-sm">(optional — auto-generated if blank)</span>
                </label>
                <input
                  id="f-sub"
                  onChange={field("cognitoSub")}
                  placeholder="AWS Cognito User Sub"
                  value={form.cognitoSub}
                />
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <Link className="btn-link" href={isEdit ? `/members/${id}` : "/members"}>
              {l.cancel}
            </Link>
            <button className="btn btn-primary" disabled={saveStatus === "saving"} type="submit">
              {saveStatus === "saving" ? l.saving : l.save}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
