'use client';

import { useState } from 'react';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrbitLogo } from '@/components/brand/OrbitLogo';
import { supabase } from '@/lib/supabase/client';

interface SignInSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Passwordless sign-in.
 *
 * The 6-digit code is the primary path rather than the emailed link: a link
 * tapped in a phone's mail app often opens in a different browser context than
 * the installed app, and the session would land in the wrong place. Typing the
 * code keeps everything in this window. Both come from the same
 * `signInWithOtp` call — the email carries a link and a code.
 */
export function SignInSheet({ open, onClose }: SignInSheetProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep('email');
    setCode('');
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendCode = async () => {
    if (!supabase || !email.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStep('code');
      toast.success('Check your email for the code');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!supabase || code.trim().length < 6) return;
    setBusy(true);
    try {
      const token = code.trim();
      const addr = email.trim();

      // The token's type depends on whether this address already had an
      // account. A returning user's code comes from the Magic Link flow
      // ('email'); a brand-new one comes from Confirm signup ('signup'), and
      // the wrong type is rejected even when the digits are right. There's no
      // way to know which up front, so try the common case and fall back.
      let { error } = await supabase.auth.verifyOtp({ email: addr, token, type: 'email' });
      if (error) {
        const retry = await supabase.auth.verifyOtp({ email: addr, token, type: 'signup' });
        if (!retry.error) error = null;
      }
      if (error) throw error;

      toast.success('Signed in — syncing your projects');
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That code did not work');
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle = {
    background: 'var(--muted-bg)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: '10px',
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="p-0 border-0 rounded-t-3xl overflow-hidden mx-auto w-full sm:max-w-2xl"
        style={{ background: 'var(--card)' }}
      >
        <div className="px-5 pb-8 pt-6">
          <SheetHeader className="px-0 pb-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <OrbitLogo className="h-12 w-12" />
              <SheetTitle className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {step === 'email' ? 'Sync your projects' : 'Enter your code'}
              </SheetTitle>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {step === 'email'
                  ? 'Back up to the cloud and pick up where you left off on any device.'
                  : `We sent a 6-digit code to ${email}`}
              </p>
            </div>
          </SheetHeader>

          {step === 'email' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sync-email" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  Email
                </Label>
                <Input
                  id="sync-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                  className="h-12"
                  style={fieldStyle}
                />
              </div>
              <Button
                onClick={sendCode}
                disabled={busy || !email.includes('@')}
                className="w-full h-12 rounded-2xl text-base font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: 'white',
                }}
              >
                {busy ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Mail size={18} className="mr-2" />}
                Send me a code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sync-code" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  6-digit code
                </Label>
                <Input
                  id="sync-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && verify()}
                  className="h-12 text-center text-lg tracking-[0.4em]"
                  style={fieldStyle}
                />
              </div>
              <Button
                onClick={verify}
                disabled={busy || code.length < 6}
                className="w-full h-12 rounded-2xl text-base font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: 'white',
                }}
              >
                {busy && <Loader2 size={18} className="mr-2 animate-spin" />}
                Verify and sync
              </Button>
              <button
                onClick={() => setStep('email')}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-xs"
                style={{ color: 'var(--muted)' }}
              >
                <ArrowLeft size={13} />
                Use a different email
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Your projects stay on this device either way — signing in just adds a backup.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
