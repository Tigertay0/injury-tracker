// The signed-in player's data, loaded once per app visit and updated in place after
// each change, so every screen reads the same copy.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Injury, Overview, Profile, RecoveryLog, TrainingSession } from '@shared/types';
import type { EquipmentInput, InjuryInput, ProfileInput, RecoveryCheckIn, SessionInput } from '@shared/validation';
import { recoveryScore } from '@shared/calculations';
import { ApiError, useApi, errorMessage } from './api';

// Overview lives in shared/types.ts; re-exported so screens keep importing it from here
export type { Overview } from '@shared/types';

type State = { status: 'loading' } | { status: 'error'; message: string; code: number } | { status: 'ready'; data: Overview };

const byDateDesc = <T,>(key: (x: T) => string) => (a: T, b: T) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0);

function usePlayerDataState() {
  const api = useApi();
  const [state, setState] = useState<State>({ status: 'loading' });

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
        const profile = await api.post<Profile>('/me', input);
        update((d) => ({ ...d, profile }));
      },
      async updateProfile(input: ProfileInput) {
        const profile = await api.patch<Profile>('/me', input);
        update((d) => ({ ...d, profile }));
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
      exportData: () => api.download('/me/export', 'pitchsafe-export.json'),
      deleteAccount: () => api.del('/me'),
    }),
    [api, load, update],
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

// Demo mode: the same actions, applied to local state only. Nothing is sent anywhere.
function useDemoState(initial: () => Overview): PlayerData {
  const [data, setData] = useState<Overview>(initial);
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
  return useMemo(() => ({ state: { status: 'ready' as const, data }, actions }), [data, actions]);
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

/** "/app" for signed-in players, "/demo" for the public sample. */
export const AppBaseContext = createContext<'/app' | '/demo'>('/app');
export const useAppBase = () => useContext(AppBaseContext);
