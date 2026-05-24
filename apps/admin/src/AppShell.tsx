"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProfileInitials } from "@diaconia/shared";
import { useAuth, type CurrentUserProfile } from "./AuthContext";
import { t } from "./adminLabels";
import {
  CalendarIcon,
  DashboardIcon,
  DotsVerticalIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { SignInPage } from "./SignInPage";

function Avatar({ user }: { user: CurrentUserProfile }) {
  return (
    <div className="avatar-circle" aria-hidden>
      {user.avatarUrl ? (
        <img alt="" src={user.avatarUrl} />
      ) : (
        <span>{getProfileInitials(user.displayName, user.email)}</span>
      )}
    </div>
  );
}

function ProfileEditor({
  initial,
  onSave,
  onClose,
  locale,
}: {
  initial: CurrentUserProfile;
  onSave: (p: CurrentUserProfile) => void;
  onClose: () => void;
  locale: import("@diaconia/shared").SupportedLocale;
}) {
  const l = t(locale);
  const [draft, setDraft] = useState(initial);

  function update(field: keyof CurrentUserProfile) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-label={l.editProfile}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <h2>{l.editProfile}</h2>
          <button
            aria-label={l.cancel}
            className="icon-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="pe-name">{l.displayName}</label>
            <input id="pe-name" onChange={update("displayName")} value={draft.displayName} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-email">{l.email}</label>
            <input id="pe-email" onChange={update("email")} type="email" value={draft.email} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-phone">{l.phone}</label>
            <input id="pe-phone" onChange={update("phone")} value={draft.phone} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-avatar">{l.avatarUrl}</label>
            <input id="pe-avatar" onChange={update("avatarUrl")} value={draft.avatarUrl} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            {l.cancel}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(draft)}
            type="button"
          >
            {l.saveProfile}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded, signOut, updateProfile, locale, setLocale } = useAuth();
  const l = t(locale);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/", label: l.dashboard, Icon: DashboardIcon },
    { href: "/meetings", label: l.meetings, Icon: CalendarIcon },
    { href: "/members", label: l.members, Icon: UsersIcon },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dotsOpen, setDotsOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) {
        setDotsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded) return null;
  if (!currentUser) return <SignInPage />;

  function handleSignOut() {
    setDotsOpen(false);
    signOut();
    router.push("/");
  }

  function handleSaveProfile(profile: CurrentUserProfile) {
    updateProfile(profile);
    setProfileEditorOpen(false);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="app-layout">
      {/* App Bar */}
      <header className="app-bar">
        <div className="app-bar-left">
          <button
            aria-label={l.toggleSidebar}
            className="icon-btn hamburger-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
          >
            <MenuIcon size={20} />
          </button>
          <Link aria-label={l.dashboard} className="brand-link" href="/">
            <img alt="Diaconia" className="brand-logo" src="/logo.png" />
          </Link>
        </div>

        <div className="app-bar-right">
          <div className="locale-toggle">
            <button
              className={locale === "es" ? "locale-btn active" : "locale-btn"}
              onClick={() => setLocale("es")}
              type="button"
            >
              ES
            </button>
            <button
              className={locale === "en" ? "locale-btn active" : "locale-btn"}
              onClick={() => setLocale("en")}
              type="button"
            >
              EN
            </button>
          </div>
          <Avatar user={currentUser} />
          <div className="dots-anchor" ref={dotsRef}>
            <button
              aria-expanded={dotsOpen}
              aria-label={l.userMenu}
              className="icon-btn dots-btn"
              onClick={() => setDotsOpen((v) => !v)}
              type="button"
            >
              <DotsVerticalIcon size={18} />
            </button>
            {dotsOpen ? (
              <div className="context-menu" role="menu">
                <div className="context-menu-header">
                  <strong>{currentUser.displayName}</strong>
                  <span>{currentUser.email || currentUser.phone || "Diaconia Admin"}</span>
                </div>
                <div className="context-menu-divider" />
                <button
                  className="context-menu-item"
                  onClick={() => {
                    setDotsOpen(false);
                    setProfileEditorOpen(true);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <UserIcon size={16} />
                  {l.profile}
                </button>
                <button
                  className="context-menu-item danger"
                  onClick={handleSignOut}
                  role="menuitem"
                  type="button"
                >
                  <LogOutIcon size={16} />
                  {l.signOut}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {sidebarOpen ? (
          <div
            aria-hidden
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        {/* Sidebar */}
        <nav
          aria-label={l.toggleSidebar}
          className={`sidebar${sidebarOpen ? "" : " sidebar-collapsed"}`}
        >
          <div className="nav-items">
            {navItems.map(({ href, label, Icon }) => (
              <Link
                className={`nav-item${isActive(href) ? " nav-item-active" : ""}`}
                href={href}
                key={href}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
              >
                <span className="nav-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </div>
          <div className="nav-footer">
            <Link
              className={`nav-item${isActive("/settings") ? " nav-item-active" : ""}`}
              href="/settings"
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">
                <SettingsIcon size={18} />
              </span>
              <span className="nav-label">{l.settings}</span>
            </Link>
          </div>
        </nav>

        <main className="main-content">{children}</main>
      </div>

      {profileEditorOpen ? (
        <ProfileEditor
          initial={currentUser}
          locale={locale}
          onClose={() => setProfileEditorOpen(false)}
          onSave={handleSaveProfile}
        />
      ) : null}
    </div>
  );
}
