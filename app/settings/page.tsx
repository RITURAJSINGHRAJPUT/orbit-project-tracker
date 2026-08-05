'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Moon, Sun, Download, Upload, Bell, BellOff,
  Info, MessageSquare, ChevronRight, Trash2,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/brand/Avatar';
import { PROFILE } from '@/lib/profile';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { toast } from 'sonner';
import { db } from '@/lib/db/dexie';
import type { Project } from '@/lib/types';
import { projectRecordSchema, migrateLegacyProject } from '@/lib/sync/mapper';
import { STATUS_GROUP } from '@/lib/types';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useSyncStore } from '@/lib/sync/useSyncStore';
import { SignInSheet } from '@/components/sync/SignInSheet';
import { formatRelativeDate } from '@/lib/utils';
import { CloudOff, Cloud, RefreshCw, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { projects } = useProjectStore();
  const [notifications, setNotifications] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { session, authReady, state: syncState, lastSyncedAt, pendingCount, sync, signOut } =
    useSyncStore();

  const handleExport = () => {
    try {
      const data = JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), projects }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbit-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const importedProjects = data.projects ?? [];

        if (!Array.isArray(importedProjects)) throw new Error('Invalid format');

        // Validate before writing. This used to bulkPut the file's contents
        // unchecked, so a malformed backup landed straight in IndexedDB — and
        // would then be uploaded to the server on the next sync.
        const valid: Project[] = [];
        let skipped = 0;
        for (const row of importedProjects) {
          // Normalise pre-v2 status names first, or every row in an older
          // backup fails validation and is silently skipped.
          const parsed = projectRecordSchema.safeParse(migrateLegacyProject(row));
          if (parsed.success) valid.push(parsed.data as Project);
          else skipped += 1;
        }

        if (valid.length === 0) throw new Error('No valid projects in file');

        await db.projects.bulkPut(valid);
        await useProjectStore.getState().loadProjects();
        toast.success(
          skipped > 0
            ? `Imported ${valid.length} projects (${skipped} skipped)`
            : `Imported ${valid.length} projects!`
        );
      } catch {
        toast.error('Import failed. Please check the file format.');
      }
    };
    input.click();
  };

  const handleNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported on this device.');
      return;
    }

    if (notifications) {
      setNotifications(false);
      toast.info('Notifications disabled');
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifications(true);
      toast.success('Notifications enabled!');
    } else {
      toast.error('Permission denied. Enable notifications in browser settings.');
    }
  };

  const handleClearData = () => {
    if (!confirm('Are you sure you want to clear all projects? This cannot be undone.')) return;
    db.projects.clear();
    useProjectStore.getState().loadProjects();
    toast.success('All data cleared.');
  };

  const isDark = theme === 'dark';

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
        <AppHeader title="Settings" subtitle="Customize your Orbit experience" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <SettingsSection title="Profile">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="orbit-card p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar size={48} />
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {PROFILE.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {PROFILE.org}
                </p>
              </div>
            </div>
            <div
              className="mt-4 pt-4 border-t grid grid-cols-3 text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              {[
                { label: 'Total', value: projects.filter((p) => !p.deletedAt).length },
                { label: 'Active', value: projects.filter((p) => STATUS_GROUP[p.status] === 'ongoing' && !p.deletedAt).length },
                { label: 'Done', value: projects.filter((p) => STATUS_GROUP[p.status] === 'completed' && !p.deletedAt).length },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </SettingsSection>

        {/* Sync — only surfaced when Supabase is actually configured, so an
            unconfigured build doesn't advertise a feature that can't work. */}
        {isSupabaseConfigured && authReady && (
          <SettingsSection title="Cloud Sync">
            <SettingsCard>
              {session ? (
                <>
                  <SettingsRow
                    id="sync-account"
                    icon={Cloud}
                    iconColor="#10B981"
                    label={session.user.email ?? 'Signed in'}
                    description={
                      syncState === 'syncing'
                        ? 'Syncing…'
                        : syncState === 'offline'
                          ? `Offline · ${pendingCount} waiting`
                          : syncState === 'error'
                            ? 'Last sync failed — will retry'
                            : pendingCount > 0
                              ? `${pendingCount} waiting to upload`
                              : `Synced ${formatRelativeDate(lastSyncedAt)}`
                    }
                  />
                  <Divider />
                  <SettingsRow
                    id="sync-now"
                    icon={RefreshCw}
                    iconColor="#3B82F6"
                    label="Sync now"
                    description="Push local changes and pull updates"
                    onClick={() => void sync()}
                  />
                  <Divider />
                  <SettingsRow
                    id="sync-signout"
                    icon={LogOut}
                    iconColor="var(--muted)"
                    label="Sign out"
                    description="Your projects stay on this device"
                    onClick={() => void signOut()}
                  />
                </>
              ) : (
                <SettingsRow
                  id="sync-signin"
                  icon={CloudOff}
                  iconColor="#F59E0B"
                  label="Not syncing"
                  description="Sign in to back up and sync across devices"
                  onClick={() => setSignInOpen(true)}
                />
              )}
            </SettingsCard>
          </SettingsSection>
        )}

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingsCard>
            <SettingsRow
              id="toggle-theme"
              icon={isDark ? Moon : Sun}
              iconColor={isDark ? '#8B5CF6' : '#F59E0B'}
              label="Dark Mode"
              description={isDark ? 'Currently dark' : 'Currently light'}
              action={
                <button
                  onClick={toggleTheme}
                  className="relative w-12 h-6 rounded-full transition-colors duration-300"
                  style={{ background: isDark ? 'var(--primary)' : 'var(--muted-bg)' }}
                >
                  <motion.div
                    animate={{ x: isDark ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                  />
                </button>
              }
            />
          </SettingsCard>
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data Management">
          <SettingsCard>
            <SettingsRow
              id="export-data"
              icon={Download}
              iconColor="#10B981"
              label="Export Data"
              description={`${projects.filter((p) => !p.deletedAt).length} projects`}
              onClick={handleExport}
            />
            <Divider />
            <SettingsRow
              id="import-data"
              icon={Upload}
              iconColor="#3B82F6"
              label="Import Backup"
              description="Restore from JSON file"
              onClick={handleImport}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsCard>
            <SettingsRow
              id="toggle-notifications"
              icon={notifications ? Bell : BellOff}
              iconColor={notifications ? '#F59E0B' : 'var(--muted)'}
              label="Push Notifications"
              description="Deadline reminders"
              action={
                <button
                  onClick={handleNotifications}
                  className="relative w-12 h-6 rounded-full transition-colors duration-300"
                  style={{ background: notifications ? 'var(--primary)' : 'var(--muted-bg)' }}
                >
                  <motion.div
                    animate={{ x: notifications ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                  />
                </button>
              }
            />
          </SettingsCard>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsCard>
            <SettingsRow
              id="clear-data"
              icon={Trash2}
              iconColor="var(--danger)"
              label="Clear All Data"
              description="Permanently delete everything"
              onClick={handleClearData}
              danger
            />
          </SettingsCard>
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsCard>
            <SettingsRow
              id="app-info"
              icon={Info}
              iconColor="var(--muted)"
              label="Version"
              description="Orbit v1.0.0 (MVP)"
            />
            <Divider />
            <SettingsRow
              id="feedback"
              icon={MessageSquare}
              iconColor="var(--primary)"
              label="Send Feedback"
              description="Help improve Orbit"
              onClick={() => toast.info('Feedback feature coming soon!')}
            />
          </SettingsCard>
        </SettingsSection>

        {/* PWA hint */}
        <div
          className="orbit-card p-4 text-center"
          style={{ border: '1px dashed var(--border)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>
            📲 Install as App
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Add Orbit to your home screen for the best mobile experience
          </p>
        </div>

        <div className="h-2" />
      </div>

      <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--muted)' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="orbit-card overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function SettingsRow({
  id, icon: Icon, iconColor, label, description, action, onClick, danger,
}: {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  label: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = 'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors';
  const body = (
    <>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}18` }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: danger ? 'var(--danger)' : 'var(--foreground)' }}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        )}
      </div>
    </>
  );

  // Rows with an `action` carry their own interactive control (a toggle button).
  // Wrapping that in a <button> is invalid HTML and breaks hydration, so these
  // rows render as a plain container instead.
  if (action) {
    return (
      <div id={id} className={className}>
        {body}
        {action}
      </div>
    );
  }

  return (
    <button
      id={id}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {body}
      {onClick && <ChevronRight size={16} style={{ color: 'var(--muted)' }} />}
    </button>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ background: 'var(--border)' }} />;
}
