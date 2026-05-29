type Props = {
  icon: React.ReactNode;
  iconColor: "blue" | "purple" | "green";
  value: number | string;
  label: string;
  description?: string;
  className?: string;
};

export function StatCard({ icon, iconColor, value, label, description, className }: Props) {
  return (
    <div className={`stat-card${className ? ` ${className}` : ""}`}>
      <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {description ? <div className="stat-card-desc">{description}</div> : null}
    </div>
  );
}
