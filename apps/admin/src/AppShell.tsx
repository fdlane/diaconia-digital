"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProfileInitials } from "@diaconia/shared";
import { defaultProfile, useAuth, type CurrentUserProfile } from "./AuthContext";
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

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/meetings", label: "Meetings", Icon: CalendarIcon },
  { href: "/members", label: "Members", Icon: UsersIcon },
];

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
}: {
  initial: CurrentUserProfile;
  onSave: (p: CurrentUserProfile) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  function update(field: keyof CurrentUserProfile) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-label="Edit profile"
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button
            aria-label="Close"
            className="icon-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="pe-name">Display Name</label>
            <input id="pe-name" onChange={update("displayName")} value={draft.displayName} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-email">Email</label>
            <input id="pe-email" onChange={update("email")} type="email" value={draft.email} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-phone">Phone</label>
            <input id="pe-phone" onChange={update("phone")} value={draft.phone} />
          </div>
          <div className="form-field">
            <label htmlFor="pe-avatar">Avatar URL</label>
            <input id="pe-avatar" onChange={update("avatarUrl")} value={draft.avatarUrl} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(draft)}
            type="button"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded, signOut, updateProfile, locale, setLocale } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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
            aria-label="Toggle sidebar"
            className="icon-btn hamburger-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
          >
            <MenuIcon size={20} />
          </button>
          <Link aria-label="Home" className="brand-link" href="/">
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
              aria-label="User menu"
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
                  Profile
                </button>
                <button
                  className="context-menu-item danger"
                  onClick={handleSignOut}
                  role="menuitem"
                  type="button"
                >
                  <LogOutIcon size={16} />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Mobile overlay */}
        {sidebarOpen ? (
          <div
            aria-hidden
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        {/* Sidebar */}
        <nav
          aria-label="Main navigation"
          className={`sidebar${sidebarOpen ? "" : " sidebar-collapsed"}`}
        >
          <div className="nav-items">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
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
              <span className="nav-label">Settings</span>
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <main className="main-content">{children}</main>
      </div>

      {/* Profile editor modal */}
      {profileEditorOpen ? (
        <ProfileEditor
          initial={currentUser}
          onClose={() => setProfileEditorOpen(false)}
          onSave={handleSaveProfile}
        />
      ) : null}
    </div>
  );
}
