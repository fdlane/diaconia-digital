"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon } from "./icons";
import { PageLoadingState } from "./PageLoadingState";

type UserRole = "admin" | "facilitator" | "chaplain" | "member";

type UserDetail = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  authSubject: string;
};

type FormState = {
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  authSubject: string;
};

const empty: FormState = {
  displayName: "",
  email: "",
  phone: "",
  role: "facilitator",
  authSubject: "",
};

export function MemberFormPage({ id }: { id?: string }) {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    isEdit ? "loading" : "ready",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !token) return;
    if (!isEdit || !id || loadedIdRef.current === id) return;
    loadedIdRef.current = id;
    void loadUser(id);
  }, [id, isEdit, isLoaded, token]);

  async function loadUser(userId: string) {
    if (!token) return;
    setLoadStatus("loading");
    const result = await apiFetch<{ user: UserDetail }>(`/users/${userId}`, token);
    if (!result.ok) {
      setLoadStatus("error");
      setErrorMsg(result.error);
      return;
    }
    const u = result.data.user;
    setForm({
      displayName: u.displayName,
      email: u.email ?? "",
      phone: u.phone ?? "",
      role: u.role,
      authSubject: u.authSubject,
    });
    setLoadStatus("ready");
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErrorMsg(l.authMissingSession); setSaveStatus("error"); return; }
    setSaveStatus("saving");
    setErrorMsg("");

    const body = isEdit
      ? JSON.stringify({ displayName: form.displayName, email: form.email || null, phone: form.phone, role: form.role })
      : JSON.stringify({ displayName: form.displayName, email: form.email || null, phone: form.phone, role: form.role, authSubject: form.authSubject || undefined });

    const result = await apiFetch<{ id: string }>(
      isEdit ? `/users/${id}` : "/users",
      token,
      { method: isEdit ? "PUT" : "POST", body },
    );

    if (!result.ok) {
      setErrorMsg(result.error);
      setSaveStatus("error");
      return;
    }

    router.push(isEdit ? `/people/${id}` : `/people/${result.data.id}`);
  }

  const breadcrumbs = [
    { label: l.members, href: "/people" },
    ...(isEdit ? [{ label: form.displayName || id!, href: `/people/${id}` }] : []),
    { label: isEdit ? l.editMember : l.newMember },
  ];

  if (loadStatus === "loading") {
    return <PageLoadingState breadcrumbs={breadcrumbs} loadingLabel={l.loading} />;
  }

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <Link href="/people">{l.members}</Link>
        <span className="breadcrumb-sep">›</span>
        {isEdit ? (
          <>
            <Link href={`/people/${id}`}>{form.displayName || id}</Link>
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
          <Link className="btn-link" href={isEdit ? `/people/${id}` : "/people"}>
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
                placeholder={l.placeholderFullName}
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
                required
                value={form.phone}
              />
            </div>

            <div className="form-field" style={{ maxWidth: 240 }}>
              <label htmlFor="f-role">{l.colRole}</label>
              <select id="f-role" onChange={field("role")} value={form.role}>
                <option value="facilitator">{l.roleFacilitator}</option>
                <option value="admin">{l.roleAdmin}</option>
                <option value="chaplain">{l.chaplain}</option>
                <option value="member">{l.rolePerson}</option>
              </select>
            </div>

            {!isEdit ? (
              <div className="form-field">
                <label htmlFor="f-sub">
                  {l.authSubjectLabel}{" "}
                  <span className="text-muted text-sm">({l.authSubjectOptionalHint})</span>
                </label>
                <input
                  id="f-sub"
                  onChange={field("authSubject")}
                  placeholder={l.authSubjectLabel}
                  value={form.authSubject}
                />
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <Link className="btn-link" href={isEdit ? `/people/${id}` : "/people"}>
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
