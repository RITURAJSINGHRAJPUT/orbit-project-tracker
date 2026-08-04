/**
 * Section heading with a trailing rule.
 *
 * Shared by the project form and the read-only detail sheet so the two present
 * the same fields identically.
 */
export function ProjectSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--primary)' }}
        >
          {title}
        </h3>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
