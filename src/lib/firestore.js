// Firestore CRUD helpers — with schema enforcement before every write
import { db } from '../firebase.js';
import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp
} from 'firebase/firestore';
import {
  validateSessionInput,
  validateRecoveryInput,
  validateInjuryInput,
  validateEquipmentInput,
  requireFirestoreId,
} from './validation.js';

// ─── Payload size guard ───────────────────────────────────────────────────────
// Firestore documents max out at 1 MB, but we enforce a much tighter limit
// to prevent abuse. Object size is approximated by JSON serialization.
const MAX_PAYLOAD_BYTES = 4096; // 4 KB — more than enough for any PitchSafe record

function assertPayloadSize(data, context) {
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  if (size > MAX_PAYLOAD_BYTES) {
    throw new Error(`[${context}] Payload too large (${size} bytes > ${MAX_PAYLOAD_BYTES} limit)`);
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUserProfile(uid, data) {
  // Only persist exactly these fields — no spread of unknown keys
  const clean = {
    email:       typeof data.email    === 'string' ? data.email.slice(0, 254)   : '',
    position:    typeof data.position === 'string' ? data.position.slice(0, 10) : '',
    cleatType:   '',
    surfaceType: '',
    dataConsent: data.dataConsent === true,
    createdAt:   Timestamp.now(),
  };
  assertPayloadSize(clean, 'createUserProfile');
  await setDoc(doc(db, 'users', uid), clean);
}

export async function updateUserProfile(uid, data) {
  const validated = validateEquipmentInput(data);
  assertPayloadSize(validated, 'updateUserProfile');
  await updateDoc(doc(db, 'users', uid), validated);
}

// ─── Training Sessions ────────────────────────────────────────────────────────

export async function addSession(uid, data) {
  const validated = validateSessionInput(data);
  const payload = {
    date:      validated.date,
    type:      validated.type,
    duration:  validated.duration,
    rpe:       validated.rpe,
    notes:     validated.notes,
    load:      validated.duration * validated.rpe,
    createdAt: Timestamp.now(),
  };
  assertPayloadSize(payload, 'addSession');
  return addDoc(collection(db, 'users', uid, 'sessions'), payload);
}

export async function getSessions(uid) {
  const ref = collection(db, 'users', uid, 'sessions');
  const q = query(ref, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteSession(uid, sessionId) {
  const id = requireFirestoreId(sessionId, 'sessionId');
  await deleteDoc(doc(db, 'users', uid, 'sessions', id));
}

// ─── Recovery Logs ────────────────────────────────────────────────────────────

export async function addRecoveryLog(uid, data) {
  const validated = validateRecoveryInput(data);
  const score = typeof data.score === 'number' && isFinite(data.score)
    ? Math.round(Math.max(0, Math.min(100, data.score)))
    : 0;
  const payload = {
    weekStartDate: validated.weekStartDate,
    sleep:         validated.sleep,
    soreness:      validated.soreness,
    stress:        validated.stress,
    nutrition:     validated.nutrition,
    score,
    createdAt: Timestamp.now(),
  };
  assertPayloadSize(payload, 'addRecoveryLog');
  return addDoc(collection(db, 'users', uid, 'recovery'), payload);
}

export async function getRecoveryLogs(uid) {
  const ref = collection(db, 'users', uid, 'recovery');
  const q = query(ref, orderBy('weekStartDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getLatestRecovery(uid) {
  const ref = collection(db, 'users', uid, 'recovery');
  const q = query(ref, orderBy('weekStartDate', 'desc'), limit(1));
  const snap = await getDocs(q);
  return snap.docs.length > 0 ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
}

// ─── Injuries ─────────────────────────────────────────────────────────────────

export async function addInjury(uid, data) {
  const validated = validateInjuryInput(data);
  const payload = {
    bodyPart:   validated.bodyPart,
    injuryType: validated.injuryType,
    severity:   validated.severity,
    injuryDate: validated.injuryDate,
    returnDate: validated.returnDate || null,
    createdAt:  Timestamp.now(),
  };
  assertPayloadSize(payload, 'addInjury');
  return addDoc(collection(db, 'users', uid, 'injuries'), payload);
}

export async function getInjuries(uid) {
  const ref = collection(db, 'users', uid, 'injuries');
  const q = query(ref, orderBy('injuryDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteInjury(uid, injuryId) {
  const id = requireFirestoreId(injuryId, 'injuryId');
  await deleteDoc(doc(db, 'users', uid, 'injuries', id));
}
