"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProfileInitials } from "@diaconia/shared";
import { useAuth, type CurrentUserProfile } from "./AuthContext";
import { localizeAccessError, t } from "./adminLabels";
import {
  CalendarIcon,
  DashboardIcon,
  DotsVerticalIcon,
  GroupsIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { SignInPage } from "./SignInPage";
import { desktopSidebarMediaQuery, getInitialSidebarOpen } from "./sidebarState";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoaded, accessError, refreshSession, signOut, locale, setLocale } = useAuth();
  const l = t(locale);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname.startsWith("/sign-up");
  const accessErrorMessage = accessError ? localizeAccessError(accessError, l) : "";
  const shellUser: CurrentUserProfile = currentUser ?? {
    displayName: l.authSignedInAccount,
    email: "",
    phone: "",
    avatarUrl: "",
  };

  const navItems = [
    { href: "/", label: l.dashboard, Icon: DashboardIcon },
    { href: "/groups", label: l.groups, Icon: GroupsIcon },
    { href: "/meetings", label: l.meetings, Icon: CalendarIcon },
    { href: "/people", label: l.members, Icon: UsersIcon },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    getInitialSidebarOpen(typeof window === "undefined" ? undefined : window.matchMedia.bind(window)),
  );
  const [dotsOpen, setDotsOpen] = useState(false);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia(desktopSidebarMediaQuery);

    function handleDesktopQueryChange(event: MediaQueryListEvent) {
      setSidebarOpen(event.matches);
    }

    setSidebarOpen(desktopQuery.matches);
    desktopQuery.addEventListener("change", handleDesktopQueryChange);

    return () => desktopQuery.removeEventListener("change", handleDesktopQueryChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) {
        setDotsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded) return <AppLoadingScreen label={l.loading} />;
  if (!currentUser && !accessError && isAuthRoute) return <>{children}</>;
  if (!currentUser && !accessError) return <SignInPage />;

  function handleSignOut() {
    setDotsOpen(false);
    signOut();
    router.push("/");
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
          <Avatar user={shellUser} />
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
                  <strong>{shellUser.displayName}</strong>
                  <span>{shellUser.email || shellUser.phone || "Diaconia Admin"}</span>
                </div>
                <div className="context-menu-divider" />
                {currentUser ? (
                  <Link
                    className="context-menu-item"
                    href="/profile"
                    onClick={() => setDotsOpen(false)}
                    role="menuitem"
                  >
                    <UserIcon size={16} />
                    {l.profile}
                  </Link>
                ) : null}
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
          <Link
            aria-label={l.dashboard}
            className="sidebar-brand"
            href="/"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
          >
            <img alt="Diaconia" className="sidebar-brand-logo sidebar-brand-logo-full" src="/sidebar-logo.png" />
            <img alt="" aria-hidden className="sidebar-brand-logo sidebar-brand-logo-mark" src="/sidebar-logo-mark.png" />
          </Link>
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

        <main className="main-content">
          {currentUser ? (
            children
          ) : (
            <AppAccessIssue
              detail={l.authAccessIssueDetail}
              message={accessErrorMessage || l.authSessionLoadFailed}
              onRetry={() => void refreshSession()}
              onSignOut={handleSignOut}
              retryLabel={l.authTryAgain}
              signOutLabel={l.signOut}
              title={l.authAccessIssueTitle}
              lead={l.authAccessIssueLead}
            />
          )}
        </main>
      </div>

    </div>
  );
}

function AppAccessIssue({
  detail,
  lead,
  message,
  onRetry,
  onSignOut,
  retryLabel,
  signOutLabel,
  title,
}: {
  detail: string;
  lead: string;
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
  retryLabel: string;
  signOutLabel: string;
  title: string;
}) {
  return (
    <section className="access-issue-panel" aria-labelledby="access-issue-title">
      <div className="access-issue-status" aria-hidden>
        !
      </div>
      <div className="access-issue-copy">
        <h1 id="access-issue-title">{title}</h1>
        <p className="access-issue-lead">{lead}</p>
        <div className="alert alert-danger">{message}</div>
        <p className="access-issue-detail">{detail}</p>
        <div className="access-issue-actions">
          <button className="btn btn-primary" onClick={onRetry} type="button">
            {retryLabel}
          </button>
          <button className="btn btn-secondary" onClick={onSignOut} type="button">
            {signOutLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
