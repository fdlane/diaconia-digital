"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type MemberOption = { id: string; displayName: string; email: string | null; role: string };
type ChaplainOption = { id: string; displayName: string; email: string | null; role: string };

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
  const { token, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [chaplains, setChaplains] = useState<ChaplainOption[]>([]);
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
      const [usersRes, chaplainsRes, groupRes] = await Promise.all([
        fetch(`${apiUrl}/users`, { headers }),
        fetch(`${apiUrl}/chaplains`, { headers }),
        isEdit && id ? fetch(`${apiUrl}/groups/${id}`, { headers }) : Promise.resolve(null),
      ]);

      if (!usersRes.ok) {
        setErrorMsg(`Failed to load members: ${usersRes.status}`);
        setLoadStatus("error");
        return;
      }

      const usersData = (await usersRes.json()) as { users: MemberOption[] };
      const facilitatorOptions = uniqueById(usersData.users.filter((user) => user.role === "facilitator"));
      setMembers(facilitatorOptions);

      if (chaplainsRes.ok) {
        const chaplainsData = (await chaplainsRes.json()) as { chaplains: ChaplainOption[] };
        setChaplains(chaplainsData.chaplains.filter((user) => user.role === "chaplain"));
      }

      if (groupRes) {
        if (!groupRes.ok) {
          setErrorMsg(`Failed to load group: ${groupRes.status}`);
          setLoadStatus("error");
          return;
        }
        const groupData = (await groupRes.json()) as {
          group: { name: string; community: string; facilitatorId: string; chaplainId: string | null; active: boolean };
        };
        const g = groupData.group;
        setForm({ name: g.name, community: g.community, facilitatorId: g.facilitatorId, chaplainId: g.chaplainId ?? "", active: g.active });
      } else if (facilitatorOptions.length > 0) {
        setForm((prev) => ({ ...prev, facilitatorId: facilitatorOptions[0]!.id }));
      }

      setLoadStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setLoadStatus("error");
    }
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = key === "active" ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setErrorMsg("");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };

    const body = JSON.stringify({
      name: form.name,
      community: form.community,
      facilitatorId: form.facilitatorId,
      chaplainId: form.chaplainId || null,
      active: form.active,
    });

    try {
      const url = isEdit ? `${apiUrl}/groups/${id}` : `${apiUrl}/groups`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setSaveStatus("error");
        return;
      }

      const data = isEdit ? null : ((await res.json()) as { id: string });
      router.push(isEdit ? `/groups/${id}` : `/groups/${data!.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setSaveStatus("error");
    }
  }

  if (loadStatus === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/groups">{l.groups}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{l.loading}</span>
        </nav>
        <div className="status-bar"><span className="loading-dot" /><span>{l.loading}</span></div>
      </div>
    );
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
                placeholder={locale === "es" ? "Nombre del grupo" : "Group name"}
                required
                value={form.name}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-community">{l.groupCommunity}</label>
              <input
                id="f-community"
                onChange={field("community")}
                placeholder={locale === "es" ? "Comunidad" : "Community"}
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
                <option disabled value="">
                  {locale === "es" ? "Seleccionar custodio…" : "Select loan steward…"}
                </option>
                {members.map((m) => (
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
                <label htmlFor="f-active" style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.9375rem", color: "var(--ink-2)", fontWeight: 500 }}>
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
