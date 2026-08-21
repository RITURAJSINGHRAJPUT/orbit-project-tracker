'use client';

import { useState } from 'react';
import { RotateCcw, User } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/brand/Avatar';
import { DEFAULT_PROFILE, useProfile, useProfileStore } from '@/lib/profile';

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

const MAX_NAME = 60;
const MAX_ORG = 80;

const fieldStyle = {
  background: 'var(--muted-bg)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  borderRadius: '10px',
};

/**
 * Edit the name and organisation shown in the header, on Settings, and at the
 * top of the printed Extra Hours sheet.
 */
export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{ background: 'var(--card)' }}
      >
        {/* Keyed on `open` so the fields are re-seeded from the store on every
            opening. The sheet stays mounted between openings, so without this a
            cancelled edit would still be sitting in the inputs next time. A key
            rather than an effect: remounting seeds state at initialisation,
            where setting it from an effect would cascade an extra render. */}
        <ProfileForm key={String(open)} onDone={onClose} />
      </SheetContent>
    </Sheet>
  );
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const profile = useProfile();
  const setProfile = useProfileStore((s) => s.setProfile);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const [name, setName] = useState(profile.name);
  const [org, setOrg] = useState(profile.org);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const save = () => {
    if (!canSave) return;
    setProfile({ name: trimmed, org: org.trim() });
    toast.success('Profile updated');
    onDone();
  };

  const reset = () => {
    resetProfile();
    setName(DEFAULT_PROFILE.name);
    setOrg(DEFAULT_PROFILE.org);
    toast.info('Profile reset to default');
  };

  return (
    <div className="px-5 pb-8 pt-6">
      <SheetHeader className="px-0 pb-5">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Live preview — the initials fallback updates as you type. */}
          <Avatar size={56} name={trimmed || DEFAULT_PROFILE.name} />
          <SheetTitle className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            Edit profile
          </SheetTitle>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Shown in the app header and at the top of your printed hours sheet.
          </p>
        </div>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label
            htmlFor="profile-name"
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--muted)' }}
          >
            Name
          </Label>
          <Input
            id="profile-name"
            autoComplete="name"
            maxLength={MAX_NAME}
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className="h-12"
            style={fieldStyle}
          />
        </div>

        <div>
          <Label
            htmlFor="profile-org"
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--muted)' }}
          >
            Organisation
          </Label>
          <Input
            id="profile-org"
            autoComplete="organization"
            maxLength={MAX_ORG}
            placeholder="Company or team"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className="h-12"
            style={fieldStyle}
          />
        </div>

        <Button
          id="profile-save"
          onClick={save}
          disabled={!canSave}
          className="w-full h-12 rounded-2xl text-base font-semibold"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            color: 'white',
          }}
        >
          <User size={18} className="mr-2" />
          Save
        </Button>

        <button
          id="profile-reset"
          onClick={reset}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-xs"
          style={{ color: 'var(--muted)' }}
        >
          <RotateCcw size={13} />
          Reset to default
        </button>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        Stored on this device only — set it again if you install Orbit somewhere else.
      </p>
    </div>
  );
}
