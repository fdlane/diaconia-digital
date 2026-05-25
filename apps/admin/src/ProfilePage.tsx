"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { EditIcon } from "./icons";
import { AvatarCircle } from "./AvatarCircle";

export function ProfilePage() {
  const { currentUser, locale } = useAuth();
  const l = t(locale);

  if (!currentUser) return null;

  return (
    <div className="form-page">
      <nav className="breadcrumb">
        <span>{l.myProfile}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{l.myProfile}</h1>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" href="/profile/edit">
            <EditIcon size={15} />{l.editMyProfile}
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="avatar-hero">
            <AvatarCircle
              avatarUrl={currentUser.avatarUrl}
              email={currentUser.email}
              fallback="silhouette"
              name={currentUser.displayName}
              size={96}
            />
            <div className="avatar-hero-info">
              <p className="avatar-hero-name">{currentUser.displayName}</p>
              {currentUser.email ? (
                <p className="text-muted">{currentUser.email}</p>
              ) : null}
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">{l.colPhone}</span>
              <span className={`detail-value${currentUser.phone ? "" : " muted"}`}>
                {currentUser.phone || l.noPhone}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">{l.avatarUrl}</span>
              <span
                className={`detail-value text-sm${currentUser.avatarUrl ? "" : " muted"}`}
                style={{ wordBreak: "break-all" }}
              >
                {currentUser.avatarUrl || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
