"use client";

import { getProfileInitials } from "@diaconia/shared";

type Props = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  fallback?: "initials" | "silhouette";
};

export function AvatarCircle({ name, email, avatarUrl, size = 34, fallback = "initials" }: Props) {
  const initials = getProfileInitials(name, email);
  const iconSize = Math.round(size * 0.46);
  const fontSize =
    size < 40 ? "0.72rem" :
    size < 56 ? "1rem" :
    size < 72 ? "1.375rem" :
    "1.75rem";

  return (
    <div
      aria-hidden
      className="avatar-circle"
      style={{ width: size, height: size, minWidth: size, fontSize }}
    >
      {avatarUrl ? (
        <img alt={name} src={avatarUrl} />
      ) : fallback === "silhouette" ? (
        <svg
          fill="none"
          height={iconSize}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          viewBox="0 0 24 24"
          width={iconSize}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
