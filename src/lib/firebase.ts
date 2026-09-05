import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
export type { FirebaseUser };
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'vip' | 'admin';
  tier: 'free' | 'pro' | 'unlimited';
  credits: number;
  totalTranslatedLines: number;
  isVip: boolean;
  vipExpiresAt?: string | null;
  createdAt?: any;
  lastLoginAt?: any;
}

const INITIAL_FREE_CREDITS = 300; // Free welcome credits for every new user

/**
 * Ensures user profile exists in Firestore and syncs profile info
 */
export async function syncUserProfile(user: FirebaseUser): Promise<AppUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const isAdminEmail = user.email === 'aungkyawkhant.apple@gmail.com';

  if (!snap.exists()) {
    const newProfile: AppUserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL,
      role: isAdminEmail ? 'admin' : 'user',
      tier: isAdminEmail ? 'unlimited' : 'free',
      credits: isAdminEmail ? 999999 : INITIAL_FREE_CREDITS,
      totalTranslatedLines: 0,
      isVip: isAdminEmail,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  } else {
    const existing = snap.data() as AppUserProfile;
    const updates: Partial<AppUserProfile> = {
      lastLoginAt: serverTimestamp(),
    };
    if (isAdminEmail && existing.role !== 'admin') {
      updates.role = 'admin';
      updates.tier = 'unlimited';
      updates.isVip = true;
      updates.credits = 999999;
    }
    await updateDoc(userRef, updates as any);
    return { ...existing, ...updates };
  }
}

/**
 * Deduct credits after translation
 */
export async function deductUserCredits(uid: string, linesCount: number): Promise<void> {
  if (linesCount <= 0) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    credits: increment(-linesCount),
    totalTranslatedLines: increment(linesCount),
  });
}

/**
 * Add credits or upgrade user
 */
export async function addCreditsToUser(uid: string, credits: number, isVipUpgrade = false): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const updates: any = {
    credits: increment(credits),
  };
  if (isVipUpgrade) {
    updates.isVip = true;
    updates.tier = 'pro';
  }
  await updateDoc(userRef, updates);
}

export { fbSignOut, signInWithPopup, onAuthStateChanged, onSnapshot, doc };
