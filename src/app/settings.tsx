// Settings: profile, appearance, and the player's data rights (export, delete).
import { Component, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PricingTable, useClerk } from '@clerk/react';
import { SubscriptionDetailsButton } from '@clerk/react/experimental';
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
import { CONTACT_EMAIL } from '@/config';
import { errorMessage } from '@/lib/api';
import { clerkAppearance } from '@/lib/clerk-root';
import { POSITION_LABEL } from '@/lib/labels';
import { useAccount, useAppBase, useOverview, usePlayerData } from '@/lib/player-data';
import { PLUS_RETURN_URL } from '@/lib/plus-status';
import { usePlusStatus } from '@/lib/use-plus-status';
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

function Card({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:p-6">
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
          This permanently deletes your profile, sessions, check-ins, injuries, custom drills and your login. It cannot be undone. Download your data first if you want a copy. If you have PitchSafe Plus, cancel it first in Settings.
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
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
                return;
              }
              // The login no longer exists, so a sign-out error here is expected and harmless
              await clerk.signOut().catch(() => undefined);
              navigate('/', { replace: true });
              toast.success('Your account and data were deleted');
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

// A text-style button with a full 44px touch target, lined up with the text above it
const TEXT_BUTTON = '-mx-2 inline-flex h-11 items-center self-start px-2 text-small font-semibold text-accent-ink underline underline-offset-2 hover:text-ink disabled:opacity-55';

// The pricing table throws in development when billing is off in Clerk. That must not take the
// rest of Settings down with it, because export and delete live on the same page.
class CheckoutBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[plus] pricing table failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex flex-col items-start">
        <p className="text-small text-ink-2">Checkout can't load right now.</p>
        <button type="button" className={TEXT_BUTTON} onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </div>
    );
  }
}

function PlusCard({ plus }: { plus: boolean }) {
  const { hash } = useLocation();
  const { checking, checkAgain, refreshNow } = usePlusStatus(plus);

  // The lazy page appears after the browser has looked for the #plus anchor, so scroll to it here
  useEffect(() => {
    if (hash === '#plus') document.getElementById('plus')?.scrollIntoView();
  }, [hash]);

  return (
    <Card id="plus" title="PitchSafe Plus" description={plus ? 'You have PitchSafe Plus.' : '$60 a year, or $9.99 a month. Create your own drills and personal workouts, and AI works out how each one loads your body.'}>
      {plus ? (
        <div className="flex flex-col items-start gap-4">
          <SubscriptionDetailsButton onSubscriptionCancel={() => void refreshNow()} subscriptionDetailsProps={{ appearance: clerkAppearance }}>
            <Button variant="secondary">Manage or cancel</Button>
          </SubscriptionDetailsButton>
          {CONTACT_EMAIL && (
            <p className="text-small text-ink-2">
              For a refund, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-ink underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <CheckoutBoundary>
            <PricingTable appearance={clerkAppearance} checkoutProps={{ appearance: clerkAppearance }} newSubscriptionRedirectUrl={PLUS_RETURN_URL} />
          </CheckoutBoundary>
          <p className="text-small text-ink-2">Under 18? Ask a parent or guardian to pay.</p>
          <p className="text-small text-ink-2">Cancel any time here. When Plus ends, your saved drills stay, but you can't add new ones.</p>
          {/* Clerk gives no signal when its checkout is closed with the X, so this covers that case */}
          <button type="button" className={TEXT_BUTTON} disabled={checking} onClick={checkAgain}>
            {checking ? 'Checking…' : 'Already subscribed? Check again'}
          </button>
        </div>
      )}
    </Card>
  );
}

export default function Settings() {
  const { actions } = usePlayerData();
  const { plusAvailable, plus } = useAccount();
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

        {!isDemo && plusAvailable && <PlusCard plus={plus} />}

        <Card title="Your data" description="Download a copy of your PitchSafe data, or delete it.">
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
