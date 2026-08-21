'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useTimeEntryStore } from '@/lib/store/useTimeEntryStore';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { formatDuration, formatMonth, monthDays, toMonthKey, weekdayOf } from '@/lib/time';
import { useProfile } from '@/lib/profile';

/**
 * The printable monthly sheet.
 *
 * A dedicated route rather than a PDF library: `window.print()` costs zero
 * bytes, works offline, and can't fail to load a chunk — which matters because
 * the service worker discovers chunks by scraping route HTML, so a dynamically
 * imported PDF library would be invisible to it and break offline export.
 * Keeping this as its own route means swapping in jsPDF later touches one file.
 */
export default function ExtraHoursReportPage() {
  const { month: storeMonth, getMonthEntries, getMonthSummary } = useTimeEntryStore();
  const projects = useProjectStore((s) => s.projects);

  const [month, setMonth] = useState(storeMonth);
  const [blank, setBlank] = useState(false);
  const [includeBlankDays, setIncludeBlankDays] = useState(false);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const profile = useProfile();

  // Read ?month= and ?blank= without useSearchParams, which would force a
  // Suspense boundary on an otherwise static route.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('month');
    setMonth(q && /^\d{4}-\d{2}$/.test(q) ? q : storeMonth || toMonthKey());
    setBlank(params.get('blank') === '1');
  }, [storeMonth]);

  const entries = getMonthEntries(month);
  const summary = getMonthSummary(month);

  const projectName = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.title ?? 'Unknown project') : '';

  const byDate = new Map(entries.map((e) => [e.date, e] as const));
  const rows =
    blank || includeBlankDays
      ? monthDays(month).map((d) => ({
          date: d.date,
          weekday: d.weekday,
          entry: blank ? null : (byDate.get(d.date) ?? null),
        }))
      : entries.map((e) => ({ date: e.date, weekday: weekdayOf(e.date), entry: e }));

  return (
    <div className="min-h-full" style={{ background: 'var(--background)' }}>
      {/* Controls — hidden when printing */}
      <div className="orbit-no-print px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/extra-hours"
            aria-label="Back"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {blank ? 'Blank sheet preview' : 'Report preview'}
          </h1>
        </div>

        <div className="orbit-card p-4 space-y-3">
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 h-11 w-full px-3 text-sm outline-none rounded-[10px]"
              style={{ background: 'var(--muted-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </label>

          {!blank && (
            <>
              {[
                { label: 'Include blank days', value: includeBlankDays, set: setIncludeBlankDays },
                { label: 'Include signature fields', value: includeSignatures, set: setIncludeSignatures },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center justify-between py-1">
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{label}</span>
                  <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} className="h-5 w-5" />
                </label>
              ))}
            </>
          )}

          {blank && (
            <label className="flex items-center justify-between py-1">
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>Include signature fields</span>
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
          )}

          <button
            id="print-report"
            onClick={() => window.print()}
            className="w-full h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            }}
          >
            <Printer size={18} />
            Print / Save as PDF
          </button>
          <p className="text-[11px] text-center" style={{ color: 'var(--muted)' }}>
            Choose &ldquo;Save as PDF&rdquo; as the destination in the print dialog.
          </p>
        </div>
      </div>

      {/* The sheet itself */}
      <div className="orbit-print-sheet px-4 pb-8">
        <header className="text-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{profile.name}</h2>
          {profile.org && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{profile.org}</p>
          )}
          <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--primary)' }}>
            Extra Working Hours
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{formatMonth(month)}</p>
          <div className="orbit-print-header-bar" />
        </header>

        <table className="orbit-print-table w-full text-xs">
          <thead>
            <tr>
              {['Date', 'Week Name', 'Project', 'Start', 'End', 'Extra Time', 'Remark', 'Sign'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, weekday, entry }) => (
              <tr key={date}>
                <td className="tabular-nums">{date}</td>
                <td>{weekday}</td>
                <td>{entry ? projectName(entry.projectId) : ''}</td>
                <td className="tabular-nums">{entry?.startTime ?? ''}</td>
                <td className="tabular-nums">{entry?.endTime ?? ''}</td>
                <td className="tabular-nums">{entry ? formatDuration(entry.minutes) : ''}</td>
                <td>{entry?.reason ?? ''}</td>
                <td />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>
                  No entries for {formatMonth(month)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!blank && (
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Total Extra Hours:{' '}
            <span className="orbit-print-total tabular-nums" style={{ color: 'var(--success)' }}>
              {formatDuration(summary.totalMinutes)}
            </span>
          </p>
        )}

        {includeSignatures && (
          <div className="orbit-print-signatures mt-8 space-y-6 text-sm" style={{ color: 'var(--foreground)' }}>
            <p>Employee Signature: ______________________________</p>
            <p>Manager Signature: _______________________________</p>
            <p>Date: ____________________</p>
          </div>
        )}
      </div>
    </div>
  );
}
