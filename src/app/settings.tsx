// Settings: profile, appearance, and the player's data rights (export, delete).
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useClerk } from '@clerk/react';
import { toast } from 'sonner';
import { DownloadSimple } from '@phosphor-icons/react';
import type { Position } from '@shared/types';
import { POSITIONS, ValidationError, validateProfile } from '@shared/validation';
import { Field, FieldSet, inputClass } from '@/components/field';
import { Segmented } from '@/components/segmented';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioRows } from '@/components/ui/radio-rows';
import { errorMessage } from '@/lib/api';
import { POSITION_LABEL } from '@/lib/labels';
import { useAppBase, useOverview, usePlayerData } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'pitchsafe-theme';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try {
    if (t === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // Storage blocked (private mode): the choice lasts for this visit only
  }
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
      <h2 className="text-lead font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-body text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileForm() {
  const { profile } = useOverview();
  const { actions } = usePlayerData();
  const [position, setPosition] = useState<Position | null>(profile?.position ?? null);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const input = validateProfile({ position: position ?? undefined, displayName: name }, { creating: false });
      setSaving(true);
      await actions.updateProfile(input);
      toast.success('Profile saved');
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldSet legend="Position">
        <RadioRows aria-label="Position" value={position} onValueChange={setPosition} options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] }))} />
      </FieldSet>
      <Field label="Name on your coach report" hint="Optional. A first name or nickname is enough." error={error}>
        {(p) => <input {...p} className={cn(inputClass, 'h-11 max-w-sm')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
      </Field>
      <Button type="submit" disabled={saving} className="self-start">
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

function DeleteAccount() {
  const { actions } = usePlayerData();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed.trim().toLowerCase() === 'delete';

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        setTyped('');
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete my account and data</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="app-scope">
        <AlertDialogTitle>Delete everything?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes your profile, sessions, check-ins, injuries and your login. It cannot be undone. Download your data first if you want a copy.
        </AlertDialogDescription>
        <label htmlFor="confirm-delete" className="mt-5 block text-small font-semibold text-ink">
          Type <span className="font-mono">delete</span> to confirm
        </label>
        <input id="confirm-delete" className={cn(inputClass, 'mt-1.5 h-11')} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error && (
          <p role="alert" className="mt-3 text-small text-risk-very-high">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep my account</AlertDialogCancel>
          <AlertDialogAction
            disabled={!confirmed || busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await actions.deleteAccount();
                await clerk.signOut();
                navigate('/', { replace: true });
                toast.success('Your account and data were deleted');
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
              }
            }}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ManageLogin() {
  const clerk = useClerk();
  return (
    <Button variant="secondary" onClick={() => clerk.openUserProfile()}>
      Manage login
    </Button>
  );
}

export default function Settings() {
  const { actions } = usePlayerData();
  const isDemo = useAppBase() === '/demo';
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [exporting, setExporting] = useState(false);

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex max-w-3xl flex-col gap-6">
        <Card title="Profile" description="Your position changes the advice you get.">
          <ProfileForm />
        </Card>

        <Card title="Appearance">
          <Segmented
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'Match device' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Card>

        {!isDemo && (
          <Card title="Login" description="Change your email, password or connected Google account.">
            <ManageLogin />
          </Card>
        )}

        <Card title="Your data" description="Download a copy of everything PitchSafe stores about you, or delete it all.">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await actions.exportData();
                } catch (err) {
                  toast.error(errorMessage(err));
                } finally {
                  setExporting(false);
                }
              }}
            >
              <DownloadSimple aria-hidden />
              {exporting ? 'Preparing…' : 'Download my data'}
            </Button>
            {isDemo ? <p className="self-center text-small text-ink-2">Account deletion is off in the sample.</p> : <DeleteAccount />}
          </div>
        </Card>
      </div>
    </>
  );
}
