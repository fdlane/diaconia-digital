"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, type CurrentUserProfile } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon, CameraIcon } from "./icons";
import { AvatarCircle } from "./AvatarCircle";

export function ProfileEditPage() {
  const { currentUser, updateProfile, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [form, setForm] = useState<CurrentUserProfile>(
    currentUser ?? { displayName: "", email: "", phone: "", avatarUrl: "" },
  );
  const [saving, setSaving] = useState(false);

  function field(key: keyof CurrentUserProfile) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    updateProfile(form);
    router.push("/profile");
  }

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <Link href="/profile">{l.myProfile}</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{l.editMyProfile}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{l.editMyProfile}</h1>
        </div>
        <div className="page-header-actions">
          <Link className="btn-link" href="/profile">
            <ArrowLeftIcon size={14} />{l.cancel}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-section">
            <div className="avatar-edit-wrap">
              <AvatarCircle
                avatarUrl={form.avatarUrl}
                email={form.email}
                fallback="silhouette"
                name={form.displayName}
                size={96}
              />
              <button
                aria-label="Change photo"
                className="avatar-camera-btn"
                disabled
                title="Photo upload coming soon"
                type="button"
              >
                <CameraIcon size={13} />
              </button>
            </div>

            <div className="form-field">
              <label htmlFor="p-name">{l.displayName}</label>
              <input
                id="p-name"
                onChange={field("displayName")}
                required
                value={form.displayName}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-email">{l.colEmail}</label>
              <input
                id="p-email"
                onChange={field("email")}
                type="email"
                value={form.email}
              />
            </div>

            <div className="form-field">
              <label htmlFor="p-phone">{l.colPhone}</label>
              <input
                id="p-phone"
                onChange={field("phone")}
                placeholder="+595 981 000 000"
                value={form.phone}
              />
            </div>
          </div>

          <div className="modal-footer">
            <Link className="btn-link" href="/profile">{l.cancel}</Link>
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? l.saving : l.save}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
