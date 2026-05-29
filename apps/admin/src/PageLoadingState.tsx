import Link from "next/link";

type BreadcrumbItem = { label: string; href?: string };

type Props = {
  breadcrumbs: BreadcrumbItem[];
  loadingLabel: string;
};

export function PageLoadingState({ breadcrumbs, loadingLabel }: Props) {
  return (
    <div>
      <nav className="breadcrumb">
        {breadcrumbs.map((item, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          </span>
        ))}
      </nav>
      <div className="status-bar">
        <span className="loading-dot" />
        <span>{loadingLabel}</span>
      </div>
    </div>
  );
}
