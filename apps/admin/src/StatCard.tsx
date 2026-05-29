import Link from "next/link";
import React from "react";

type Props = {
  icon: React.ReactNode;
  iconColor: "blue" | "purple" | "green";
  value: number | string;
  label: string;
  description?: string;
  className?: string;
  href?: string;
};

export function StatCard({ icon, iconColor, value, label, description, className, href }: Props) {
  const cardClassName = `stat-card${href ? " stat-card-link" : ""}${className ? ` ${className}` : ""}`;
  const content = (
    <>
      <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {description ? <div className="stat-card-desc">{description}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link aria-label={label} className={cardClassName} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
