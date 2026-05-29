import Link from "next/link";
import { ArrowLeftIcon } from "./icons";

type BreadcrumbItem = { label: string; href?: string };

type Props = {
  breadcrumbs: BreadcrumbItem[];
  errorMsg: string;
  backHref: string;
  backLabel: string;
};

export function PageErrorState({ breadcrumbs, errorMsg, backHref, backLabel }: Props) {
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
      <div className="banner banner-error">{errorMsg || "Not found"}</div>
      <Link className="btn btn-ghost" href={backHref}>
        <ArrowLeftIcon size={15} />
        {backLabel}
      </Link>
    </div>
  );
}
