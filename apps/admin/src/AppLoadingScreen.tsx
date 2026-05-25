export function AppLoadingScreen({ label }: { label: string }) {
  return (
    <div className="app-loading-screen" role="status" aria-label={label} aria-live="polite">
      <div className="app-loading-card">
        <span className="app-loading-logo-crop">
          <img alt="Diaconia" className="app-loading-logo" src="/logo.png" />
        </span>
      </div>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
