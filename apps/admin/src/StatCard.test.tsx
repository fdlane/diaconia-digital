import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders as a navigation link when an href is provided", () => {
    const html = renderToStaticMarkup(
      <StatCard
        description="Meetings awaiting submission"
        href="/meetings"
        icon={<span aria-hidden="true">icon</span>}
        iconColor="blue"
        label="Planned Meetings"
        value={3}
      />,
    );

    expect(html).toContain("<a");
    expect(html).toContain('href="/meetings"');
    expect(html).toContain("Planned Meetings");
  });
});
