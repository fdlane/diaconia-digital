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
  const { currentUser, isLoaded, signOut, locale, setLocale } = useAuth();
  const l = t(locale);
  const pathname = usePathname();
  const router = useRouter();

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
  if (!currentUser) return <SignInPage />;

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
                <Link
                  className="context-menu-item"
                  href="/profile"
                  onClick={() => setDotsOpen(false)}
                  role="menuitem"
                >
                  <UserIcon size={16} />
                  {l.profile}
                </Link>
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

        <main className="main-content">{children}</main>
      </div>

    </div>
  );
}
