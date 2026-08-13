'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, FileText, Clock } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TimeEntrySheet } from '@/components/time/TimeEntrySheet';
import { useTimeEntryStore } from '@/lib/store/useTimeEntryStore';
import { useProjectStore } from '@/lib/store/useProjectStore';
import {
  TimeEntry,
  WORK_TYPE_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_COLORS,
} from '@/lib/types';
import { formatDuration, formatMonth, parseMonth, toMonthKey, weekdayOf } from '@/lib/time';
import { PROFILE } from '@/lib/profile';
import { cn } from '@/lib/utils';

const shiftMonth = (month: string, delta: number) => {
  const d = parseMonth(month);
  d.setMonth(d.getMonth() + delta);
  return toMonthKey(d);
};

export default function ExtraHoursPage() {
  const { month, setMonth, hasLoaded, getMonthEntries, getMonthSummary } = useTimeEntryStore();
  const projects = useProjectStore((s) => s.projects);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const entries = getMonthEntries();
  const summary = getMonthSummary();

  // A pull can deliver an entry before its project, so a missing id is expected
  // rather than exceptional.
  const projectName = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.title ?? 'Unknown project') : '—';

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (entry: TimeEntry) => {
    setEditing(entry);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="sticky top-0 z-30"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', background: 'var(--background)' }}
      >
        <div className="px-3 pt-3">
          <AppHeader title="Extra Hours" subtitle={PROFILE.name} />
        </div>

        {/* Month switcher */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
              {formatMonth(month)}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {summary.days} day{summary.days === 1 ? '' : 's'} · {formatDuration(summary.totalMinutes)}
            </p>
          </div>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 space-y-4">
        {/* Summary */}
        <div className="orbit-card p-4">
          <div className="grid grid-cols-2 gap-y-3">
            {[
              { label: 'Extra Days', value: String(summary.days) },
              { label: 'Total Extra Hours', value: formatDuration(summary.totalMinutes) },
              { label: 'Average / Day', value: formatDuration(summary.averageMinutes) },
              { label: 'Approved', value: formatDuration(summary.approvedMinutes) },
              { label: 'Pending', value: formatDuration(summary.pendingMinutes) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {label}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <Link
            href={`/extra-hours/report?month=${month}`}
            id="open-report"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--muted-bg)', color: 'var(--primary)' }}
          >
            <FileText size={16} />
            Export PDF / Print
          </Link>
        </div>

        {/* Entries — cards on phones, a table once there's room. A nine-column
            table at 390px is unusable. */}
        {!hasLoaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="orbit-card p-4 animate-pulse" style={{ height: 92, opacity: 0.5 - i * 0.1 }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--muted-bg)' }}
            >
              <Clock size={28} style={{ color: 'var(--muted)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
              No extra hours logged
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Tap + to add a day for {formatMonth(month)}.
            </p>
          </div>
        ) : (
          <>
            {/* Table from sm up */}
            <div className="orbit-card hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--muted)' }}>
                    {['Date', 'Day', 'Project', 'Type', 'Start', 'End', 'Extra', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => openEdit(e)}
                      className="cursor-pointer border-t"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--foreground)' }}>{e.date}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--muted)' }}>{weekdayOf(e.date)}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--muted)' }}>{projectName(e.projectId)}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--muted)' }}>{WORK_TYPE_LABELS[e.workType]}</td>
                      <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--muted)' }}>{e.startTime ?? '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--muted)' }}>{e.endTime ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                        {formatDuration(e.minutes)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', ENTRY_STATUS_COLORS[e.status])}>
                          {ENTRY_STATUS_LABELS[e.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards below sm */}
            <div className="space-y-3 sm:hidden">
              {entries.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.25 }}
                  onClick={() => openEdit(e)}
                  className="orbit-card p-4 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                        {e.date} · <span style={{ color: 'var(--muted)' }}>{weekdayOf(e.date)}</span>
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                        {projectName(e.projectId)} · {WORK_TYPE_LABELS[e.workType]}
                      </p>
                    </div>
                    <span className="text-lg font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--primary)' }}>
                      {formatDuration(e.minutes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                      {e.startTime ?? '—'} → {e.endTime ?? '—'}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', ENTRY_STATUS_COLORS[e.status])}>
                      {ENTRY_STATUS_LABELS[e.status]}
                    </span>
                  </div>

                  {e.reason && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>
                      {e.reason}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <motion.button
        className="fab"
        id="add-entry-fab"
        onClick={openAdd}
        whileTap={{ scale: 0.9 }}
        aria-label="Add extra hours"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      <TimeEntrySheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        entry={editing}
        defaultDate={`${month}-01`}
      />
    </div>
  );
}
