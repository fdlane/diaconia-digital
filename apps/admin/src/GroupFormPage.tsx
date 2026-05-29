"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon } from "./icons";
import { PageLoadingState } from "./PageLoadingState";
import type { UserOption } from "./types";

type FormState = {
  name: string;
  community: string;
  facilitatorId: string;
  chaplainId: string;
  active: boolean;
};

const empty: FormState = { name: "", community: "", facilitatorId: "", chaplainId: "", active: true };

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function GroupFormPage({ id }: { id?: string }) {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [facilitators, setFacilitators] = useState<UserOption[]>([]);
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

    const [usersResult, chaplainsResult, groupResult] = await Promise.all([
      apiFetch<{ users: UserOption[] }>("/users", token),
      apiFetch<{ chaplains: UserOption[] }>("/chaplains", token),
      isEdit && id ? apiFetch<{ group: { name: string; community: string; facilitatorId: string; chaplainId: string | null; active: boolean } }>(`/groups/${id}`, token) : null,
    ]);

    if (!usersResult.ok) {
      setErrorMsg(`Failed to load people: ${usersResult.error}`);
      setLoadStatus("error");
      return;
    }

    const facilitatorOptions = uniqueById(usersResult.data.users.filter((u) => u.role === "facilitator"));
    setFacilitators(facilitatorOptions);

    if (chaplainsResult?.ok) {
      setChaplains(chaplainsResult.data.chaplains.filter((u) => u.role === "chaplain"));
    }

    if (groupResult) {
      if (!groupResult.ok) {
        setErrorMsg(`Failed to load group: ${groupResult.error}`);
        setLoadStatus("error");
        return;
      }
      const g = groupResult.data.group;
      setForm({ name: g.name, community: g.community, facilitatorId: g.facilitatorId, chaplainId: g.chaplainId ?? "", active: g.active });
    } else if (facilitatorOptions.length > 0) {
      setForm((prev) => ({ ...prev, facilitatorId: facilitatorOptions[0]!.id }));
    }

    setLoadStatus("ready");
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = key === "active" ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErrorMsg(l.authMissingSession); setSaveStatus("error"); return; }
    setSaveStatus("saving");
    setErrorMsg("");

    const body = JSON.stringify({
      name: form.name,
      community: form.community,
      facilitatorId: form.facilitatorId,
      chaplainId: form.chaplainId || null,
      active: form.active,
    });

    const result = await apiFetch<{ id: string }>(
      isEdit ? `/groups/${id}` : "/groups",
      token,
      { method: isEdit ? "PUT" : "POST", body },
    );

    if (!result.ok) {
      setErrorMsg(result.error);
      setSaveStatus("error");
      return;
    }

    router.push(isEdit ? `/groups/${id}` : `/groups/${result.data.id}`);
  }

  const breadcrumbs = [
    { label: l.groups, href: "/groups" },
    ...(isEdit ? [{ label: form.name || id!, href: `/groups/${id}` }] : []),
    { label: isEdit ? l.editGroup : l.newGroup },
  ];

  if (loadStatus === "loading") {
    return <PageLoadingState breadcrumbs={breadcrumbs} loadingLabel={l.loading} />;
  }

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <Link href="/groups">{l.groups}</Link>
        <span className="breadcrumb-sep">›</span>
        {isEdit ? (
          <>
            <Link href={`/groups/${id}`}>{form.name || id}</Link>
            <span className="breadcrumb-sep">›</span>
          </>
        ) : null}
        <span>{isEdit ? l.editGroup : l.newGroup}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? l.editGroup : l.newGroup}</h1>
        </div>
        <div className="page-header-actions">
          <Link className="btn-link" href={isEdit ? `/groups/${id}` : "/groups"}>
            <ArrowLeftIcon size={14} />{l.cancel}
          </Link>
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-section">
            <p className="form-section-title">{l.groupDetail}</p>

            <div className="form-field">
              <label htmlFor="f-name">{l.groupName}</label>
              <input
                id="f-name"
                onChange={field("name")}
                placeholder={l.placeholderGroupName}
                required
                value={form.name}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-community">{l.groupCommunity}</label>
              <input
                id="f-community"
                onChange={field("community")}
                placeholder={l.placeholderCommunity}
                required
                value={form.community}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-facilitator">{l.loanSteward}</label>
              <select
                id="f-facilitator"
                onChange={field("facilitatorId")}
                required
                value={form.facilitatorId}
              >
                <option disabled value="">{l.placeholderSelectSteward}</option>
                {facilitators.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}{m.email ? ` — ${m.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="f-chaplain">{l.chaplainOptional}</label>
              <select
                id="f-chaplain"
                onChange={field("chaplainId")}
                value={form.chaplainId}
              >
                <option value="">{l.selectChaplain}</option>
                {chaplains.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.displayName}{ch.email ? ` — ${ch.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {isEdit ? (
              <div className="form-field" style={{ flexDirection: "row", alignItems: "center", gap: "0.625rem" }}>
                <input
                  checked={form.active}
                  id="f-active"
                  onChange={field("active")}
                  style={{ width: "auto", height: "auto" }}
                  type="checkbox"
                />
                <label
                  htmlFor="f-active"
                  style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.9375rem", color: "var(--ink-2)", fontWeight: 500 }}
                >
                  {l.groupActive}
                </label>
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <Link className="btn-link" href={isEdit ? `/groups/${id}` : "/groups"}>
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
