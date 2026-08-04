'use client';

import { motion } from 'framer-motion';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { Layers, Clock, Zap, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { getDueDateLabel } from '@/lib/utils';
import { AppHeader } from '@/components/layout/AppHeader';
import { PRIORITY_COLORS } from '@/lib/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STAT_CARDS = [
  { key: 'total', label: 'Total Projects', icon: Layers, color: '#3B82F6', class: 'stat-card-primary' },
  { key: 'pending', label: 'Pending', icon: Clock, color: '#F59E0B', class: 'stat-card-pending' },
  { key: 'ongoing', label: 'Ongoing', icon: Zap, color: '#06B6D4', class: 'stat-card-ongoing' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: '#10B981', class: 'stat-card-completed' },
] as const;

const PRIORITY_CHART_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export default function DashboardPage() {
  const { getDashboardStats, projects } = useProjectStore();
  const stats = getDashboardStats();


  const priorityData = Object.entries(stats.byPriority)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: PRIORITY_CHART_COLORS[name as keyof typeof PRIORITY_CHART_COLORS] }));

  const progressData = [
    { name: '0-25%', value: 0, color: '#94A3B8' },
    { name: '26-50%', value: 0, color: '#F59E0B' },
    { name: '51-75%', value: 0, color: '#3B82F6' },
    { name: '76-100%', value: 0, color: '#10B981' },
  ];

  // compute from store
  projects.filter((p) => !p.deletedAt && p.status !== 'archived').forEach((p) => {
    if (p.progress <= 25) progressData[0].value++;
    else if (p.progress <= 50) progressData[1].value++;
    else if (p.progress <= 75) progressData[2].value++;
    else progressData[3].value++;
  });

  return (
    <div className="min-h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-3 pb-2"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          background: 'var(--background)',
        }}
      >
        <AppHeader title="Dashboard" subtitle="Your project overview at a glance" />
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, class: cls }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`orbit-card p-4 ${cls}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18`, color }}
                >
                  <Icon size={18} />
                </div>
              </div>
              <CountUp
                value={stats[key as keyof typeof stats] as number}
                color={color}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Average Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="orbit-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Average Progress
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Across all active projects</p>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
              <TrendingUp size={16} />
              <span className="text-2xl font-bold">{stats.avgProgress}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted-bg)' }}>
            <motion.div
              className="h-full orbit-progress"
              initial={{ width: 0 }}
              animate={{ width: `${stats.avgProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Progress Distribution */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="orbit-card p-4"
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Progress Distribution
            </p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={progressData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {progressData.filter((d) => d.value > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--foreground)',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {progressData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span style={{ color: 'var(--muted)' }}>{d.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Priority Breakdown */}
        {priorityData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="orbit-card p-4"
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              By Priority
            </p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={priorityData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--foreground)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Upcoming Deadlines */}
        {stats.upcomingDeadlines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="orbit-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Upcoming Deadlines
              </p>
            </div>
            <div className="space-y-2.5">
              {stats.upcomingDeadlines.map((p) => {
                const { label, color } = getDueDateLabel(p.dueDate);
                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {p.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{p.client}</p>
                    </div>
                    <span className={`text-xs font-semibold ml-3 flex-shrink-0 ${color}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recently Updated */}
        {stats.recentlyUpdated.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="orbit-card p-4"
          >
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Recently Updated
            </p>
            <div className="space-y-3">
              {stats.recentlyUpdated.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--primary)22', color: 'var(--primary)' }}
                  >
                    {p.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--muted-bg)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${p.progress}%`, background: 'var(--primary)' }}
                        />
                      </div>
                      <span className="text-[10px] font-bold flex-shrink-0" style={{ color: 'var(--muted)' }}>
                        {p.progress}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[p.priority]}`}
                  >
                    {p.priority.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {stats.total === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="orbit-card p-8 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--muted-bg)' }}
            >
              <Layers size={28} style={{ color: 'var(--muted)' }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
              No data yet
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Add some projects to see your dashboard
            </p>
          </motion.div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}

function CountUp({ value, color }: { value: number; color: string }) {
  return (
    <motion.p
      key={value}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-3xl font-bold"
      style={{ color }}
    >
      {value}
    </motion.p>
  );
}
