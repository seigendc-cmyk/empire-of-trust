import { Link } from "react-router-dom";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <section className="page">
      <div className="state-panel">{label}</div>
    </section>
  );
}

export function ErrorState({ title = "Something went wrong", message }: { title?: string; message?: string }) {
  return (
    <section className="page">
      <div className="state-panel border-ember bg-ember/10">
        <h1 className="text-xl font-black">{title}</h1>
        {message && <p className="mt-2 text-sm text-paper/65">{message}</p>}
      </div>
    </section>
  );
}

export function EmptyState({ title, message, actionLabel, actionTo }: { title: string; message: string; actionLabel?: string; actionTo?: string }) {
  return (
    <div className="state-panel">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-paper/65">{message}</p>
      {actionLabel && actionTo && (
        <Link className="btn btn-primary mt-5 w-full sm:w-auto" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
