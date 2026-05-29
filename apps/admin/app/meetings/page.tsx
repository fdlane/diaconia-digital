import { Suspense } from "react";
import { MeetingsList } from "../../src/MeetingsList";

function MeetingsLoading() {
  return (
    <div className="status-bar" style={{ margin: "1.5rem 0" }}>
      <span className="loading-dot" />
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<MeetingsLoading />}>
      <MeetingsList />
    </Suspense>
  );
}
