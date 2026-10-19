// The signed-in player's data, loaded once per app visit and updated in place after
// each change, so every screen reads the same copy.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { AccountStatus, CustomDrill, Injury, Overview, Profile, RecoveryLog, TrainingSession } from '@shared/types';
import type { CustomDrillInput, EquipmentInput, EstimateRequest, InjuryInput, ProfileInput, RecoveryCheckIn, SessionInput } from '@shared/validation';
import { recoveryScore } from '@shared/calculations';
import { MAX_CUSTOM_DRILLS, makeDrillLookup, type DrillEstimate, type DrillInfoLookup } from '@shared/custom-drills';
import { drillById } from '@shared/drills';
import { ApiError, useApi, errorMessage } from './api';
import { createOrderSaver } from './order-saver';

// Overview lives in shared/types.ts; re-exported so screens keep importing it from here
export type { Overview } from '@shared/types';

type State = { status: 'loading' } | { status: 'error'; message: string; code: number } | { status: 'ready'; data: Overview };

const byDateDesc = <T,>(key: (x: T) => string) => (a: T, b: T) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0);

const withDashboardOrder = (d: Overview, dashboardOrder: string[]): Overview => ({ ...d, profile: d.profile && { ...d.profile, dashboardOrder } });

function usePlayerDataState() {
  const api = useApi();
  const [state, setState] = useState<State>({ status: 'loading' });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [orderSaver] = useState(createOrderSaver);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await api.get<Overview>('/overview') });
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err), code: err instanceof ApiError ? err.status : 0 });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  // Apply a change to the loaded data without mutating it
  const update = useCallback((fn: (d: Overview) => Overview) => {
    setState((s) => (s.status === 'ready' ? { status: 'ready', data: fn(s.data) } : s));
  }, []);

  const actions = useMemo(
    () => ({
      reload: load,
      async createProfile(input: ProfileInput & { consent: true; ageConfirmed: true }) {
        try {
          const profile = await api.post<Profile>('/me', input);
          update((d) => ({ ...d, profile }));
        } catch (err) {
          // The profile already exists (a lost response, double tap or second tab): pick it up
          if (!(err instanceof ApiError && err.status === 409)) throw err;
          // Fetch outside load() so a failure here reaches the caller instead of the error state
          const data = await api.get<Overview>('/overview');
          if (!data.profile) throw err;
          update(() => data);
        }
      },
      async updateProfile(input: ProfileInput) {
        const saved = await api.patch<Profile>('/me', input);
        // Settings never edits the tile order, so the response's copy of it can only be older than the one on screen
        // (a tile-order save may still be on its way). Keep the current one.
        update((d) => ({ ...d, profile: { ...saved, dashboardOrder: d.profile?.dashboardOrder ?? saved.dashboardOrder } }));
      },
      async updateEquipment(input: EquipmentInput) {
        const saved = await api.patch<Profile>('/me/equipment', input);
        // Merge only the field this request changed, so overlapping saves cannot revert each other
        update((d) => ({
          ...d,
          profile: d.profile && {
            ...d.profile,
            ...(input.cleatType !== undefined ? { cleatType: saved.cleatType } : {}),
            ...(input.surfaceType !== undefined ? { surfaceType: saved.surfaceType } : {}),
          },
        }));
      },
      // Shows the new tile order at once. If the server refuses, the last saved order comes back and the error
      // is thrown for the caller to report. Saves overlap safely: they are sent one at a time, in order.
      saveDashboardOrder: (order: string[]) =>
        orderSaver.save(order, {
          read: () => (stateRef.current.status === 'ready' ? stateRef.current.data.profile?.dashboardOrder : undefined) ?? [],
          show: (next) => update((d) => withDashboardOrder(d, next)),
          send: async (next) => (await api.put<{ dashboardOrder: string[] }>('/me/dashboard', { order: next })).dashboardOrder,
        }),
      async addSession(input: SessionInput) {
        const session = await api.post<TrainingSession>('/sessions', input);
        update((d) => ({ ...d, sessions: [session, ...d.sessions].sort(byDateDesc((s) => s.date)) }));
        return session;
      },
      async deleteSession(id: string) {
        await api.del(`/sessions/${id}`);
        update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
      },
      async saveCheckIn(input: RecoveryCheckIn) {
        const log = await api.put<RecoveryLog>('/recovery', input);
        update((d) => ({
          ...d,
          recovery: [log, ...d.recovery.filter((r) => r.weekStart !== log.weekStart)].sort(byDateDesc((r) => r.weekStart)),
        }));
        return log;
      },
      async deleteCheckIn(id: string) {
        await api.del(`/recovery/${id}`);
        update((d) => ({ ...d, recovery: d.recovery.filter((r) => r.id !== id) }));
      },
      async addInjury(input: InjuryInput) {
        const injury = await api.post<Injury>('/injuries', input);
        update((d) => ({ ...d, injuries: [injury, ...d.injuries].sort(byDateDesc((i) => i.injuryDate)) }));
      },
      async setInjuryReturn(id: string, returnDate: string | null) {
        const injury = await api.patch<Injury>(`/injuries/${id}`, { returnDate });
        update((d) => ({ ...d, injuries: d.injuries.map((i) => (i.id === id ? injury : i)) }));
      },
      async deleteInjury(id: string) {
        await api.del(`/injuries/${id}`);
        update((d) => ({ ...d, injuries: d.injuries.filter((i) => i.id !== id) }));
      },
      estimateDrill: (input: EstimateRequest) => api.post<DrillEstimate>('/drills/custom/estimate', input),
      async addCustomDrill(input: CustomDrillInput) {
        const drill = await api.post<CustomDrill>('/drills/custom', input);
        update((d) => ({ ...d, customDrills: [...(d.customDrills ?? []), drill] }));
        return drill;
      },
      async archiveCustomDrill(id: string) {
        await api.del(`/drills/custom/${id}`);
        // Archived, not removed: sessions that used the drill keep its name and movement load
        update((d) => ({ ...d, customDrills: d.customDrills?.map((x) => (x.id === id ? { ...x, archived: true } : x)) }));
      },
      exportData: () => api.download('/me/export', 'pitchsafe-export.json'),
      deleteAccount: () => api.del('/me'),
    }),
    [api, load, update, orderSaver],
  );

  return { state, actions };
}

type PlayerData = ReturnType<typeof usePlayerDataState>;
export type PlayerActions = PlayerData['actions'];
const PlayerDataContext = createContext<PlayerData | null>(null);

export function PlayerDataProvider({ children }: { children: ReactNode }) {
  const { state, actions } = usePlayerDataState();
  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <PlayerDataContext.Provider value={value}>{children}</PlayerDataContext.Provider>;
}

const DEMO_PLUS_KEY = 'pitchsafe-demo-plus';
const DEMO_ESTIMATE_DELAY_MS = 600;
const DEMO_ESTIMATE_FAILED = "We couldn't estimate this drill. Enter the values yourself.";
const PLUS_PREVIEW_ACCOUNT: AccountStatus = { plusAvailable: true, plus: true };

// Storage can be blocked (private modes, embedded views); the preview then follows the URL alone
function readDemoPlus(): string | null {
  try {
    return sessionStorage.getItem(DEMO_PLUS_KEY);
  } catch {
    return null;
  }
}

function writeDemoPlus(value: '0' | '1') {
  try {
    sessionStorage.setItem(DEMO_PLUS_KEY, value);
  } catch {
    // Not remembered for the tab; the preview then follows the URL alone
  }
}

/** Dev builds only: ?plus=1 on a demo URL previews PitchSafe Plus for this tab, ?plus=0 turns it off. */
function useDemoPlusPreview(): boolean {
  const { search } = useLocation();
  const param = import.meta.env.DEV ? new URLSearchParams(search).get('plus') : null;
  const flag = param === '1' || param === '0' ? param : null;
  useEffect(() => {
    if (flag !== null) writeDemoPlus(flag);
  }, [flag]);
  if (!import.meta.env.DEV) return false;
  return (flag ?? readDemoPlus()) === '1';
}

// Demo mode: the same actions, applied to local state only. Nothing is sent anywhere.
function useDemoState(initial: () => Overview): PlayerData {
  const [data, setData] = useState<Overview>(initial);
  const plusPreview = useDemoPlusPreview();
  const dataRef = useRef(data);
  dataRef.current = data;
  const update = useCallback((fn: (d: Overview) => Overview) => setData((d) => fn(d)), []);
  const actions = useMemo<PlayerActions>(
    () => ({
      reload: async () => undefined,
      async createProfile() {},
      async updateProfile(input) {
        update((d) => ({ ...d, profile: d.profile && { ...d.profile, ...input } }));
      },
      async updateEquipment(input) {
        update((d) => ({ ...d, profile: d.profile && { ...d.profile, ...input } }));
      },
      async saveDashboardOrder(order) {
        update((d) => withDashboardOrder(d, [...order]));
      },
      async addSession(input) {
        const session: TrainingSession = { id: crypto.randomUUID(), ...input, load: input.duration * input.rpe };
        update((d) => ({ ...d, sessions: [session, ...d.sessions].sort(byDateDesc((s) => s.date)) }));
        return session;
      },
      async deleteSession(id) {
        update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
      },
      async saveCheckIn(input) {
        const log: RecoveryLog = { id: crypto.randomUUID(), ...input, score: recoveryScore(input) };
        update((d) => ({ ...d, recovery: [log, ...d.recovery.filter((r) => r.weekStart !== log.weekStart)].sort(byDateDesc((r) => r.weekStart)) }));
        return log;
      },
      async deleteCheckIn(id) {
        update((d) => ({ ...d, recovery: d.recovery.filter((r) => r.id !== id) }));
      },
      async addInjury(input) {
        update((d) => ({ ...d, injuries: [{ id: crypto.randomUUID(), ...input }, ...d.injuries].sort(byDateDesc((i) => i.injuryDate)) }));
      },
      async setInjuryReturn(id, returnDate) {
        update((d) => ({ ...d, injuries: d.injuries.map((i) => (i.id === id ? { ...i, returnDate } : i)) }));
      },
      async deleteInjury(id) {
        update((d) => ({ ...d, injuries: d.injuries.filter((i) => i.id !== id) }));
      },
      async estimateDrill(input) {
        await new Promise((resolve) => setTimeout(resolve, DEMO_ESTIMATE_DELAY_MS));
        if (input.name.toLowerCase().includes('fail')) throw new ApiError(DEMO_ESTIMATE_FAILED, 502);
        // Always the 3v3 profile: the demo shows the flow without calling an AI
        const sample = drillById('ssg_3v3');
        if (!sample) throw new ApiError(DEMO_ESTIMATE_FAILED, 502);
        return { category: sample.category, profile: { ...sample.profile }, reason: 'Sample estimate in the demo.' };
      },
      async addCustomDrill(input) {
        // Like the server, only active drills count towards the limit
        if ((dataRef.current.customDrills ?? []).filter((x) => !x.archived).length >= MAX_CUSTOM_DRILLS) {
          throw new ApiError(`You can keep up to ${MAX_CUSTOM_DRILLS} custom drills. Remove one first.`, 409);
        }
        const drill: CustomDrill = { id: crypto.randomUUID(), ...input, archived: false, createdAt: new Date().toISOString() };
        update((d) => ({ ...d, customDrills: [...(d.customDrills ?? []), drill] }));
        return drill;
      },
      async archiveCustomDrill(id) {
        update((d) => ({ ...d, customDrills: d.customDrills?.map((x) => (x.id === id ? { ...x, archived: true } : x)) }));
      },
      async exportData() {
        const blob = new Blob([JSON.stringify({ sample: true, ...dataRef.current }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pitchsafe-sample-export.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      async deleteAccount() {},
    }),
    [update],
  );
  // The preview swaps in a Plus account for display only; the held sample data stays as it was
  const shown = useMemo(() => (plusPreview ? { ...data, account: PLUS_PREVIEW_ACCOUNT } : data), [data, plusPreview]);
  return useMemo(() => ({ state: { status: 'ready' as const, data: shown }, actions }), [shown, actions]);
}

export function DemoPlayerDataProvider({ initial, children }: { initial: () => Overview; children: ReactNode }) {
  const value = useDemoState(initial);
  return <PlayerDataContext.Provider value={value}>{children}</PlayerDataContext.Provider>;
}

export function usePlayerData(): PlayerData {
  const ctx = useContext(PlayerDataContext);
  if (!ctx) throw new Error('usePlayerData must be used inside a player data provider');
  return ctx;
}

/** Data for screens that render only once loading has finished. */
export function useOverview(): Overview {
  const { state } = usePlayerData();
  if (state.status !== 'ready') throw new Error('useOverview used before data loaded');
  return state.data;
}

const FREE_ACCOUNT: AccountStatus = { plusAvailable: false, plus: false };

/** Whether PitchSafe Plus is on sale and whether this player has it. Free until the data has loaded. */
export function useAccount(): AccountStatus {
  const { state } = usePlayerData();
  return (state.status === 'ready' && state.data.account) || FREE_ACCOUNT;
}

/** Names and movement profiles for built-in and custom drills, archived ones included. */
export function useDrillLookup(): DrillInfoLookup {
  const { state } = usePlayerData();
  const customDrills = state.status === 'ready' ? state.data.customDrills : undefined;
  return useMemo(() => makeDrillLookup(customDrills), [customDrills]);
}

/** "/app" for signed-in players, "/demo" for the public sample. */
export const AppBaseContext = createContext<'/app' | '/demo'>('/app');
export const useAppBase = () => useContext(AppBaseContext);
