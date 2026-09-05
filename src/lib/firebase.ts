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

export interface UserCustomKeyItem {
  id: string;
  label?: string;
  key: string;
  projectName?: string;
  addedAt: string;
  createdAt?: string;
}

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
  planName?: string;
  planExpiresAt?: string | null;
  customGeminiKeys?: UserCustomKeyItem[];
  savedApiKey?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

export interface UserPlanStatus {
  hasActivePlan: boolean;
  daysRemaining: number;
  isExpired: boolean;
  planName: string;
  expiresAtFormatted: string;
}

/**
 * Checks if user has an active paid plan with remaining days
 */
export function checkUserPlanStatus(profile: AppUserProfile | null): UserPlanStatus {
  if (!profile) {
    return {
      hasActivePlan: false,
      daysRemaining: 0,
      isExpired: false,
      planName: 'No Plan',
      expiresAtFormatted: 'ဝယ်ယူထားခြင်း မရှိသေးပါ',
    };
  }

  // Admin always has unlimited active plan
  if (profile.role === 'admin' || profile.email === 'aungkyawkhant.apple@gmail.com') {
    return {
      hasActivePlan: true,
      daysRemaining: 9999,
      isExpired: false,
      planName: 'Admin Lifetime Plan',
      expiresAtFormatted: 'Lifetime Access (Admin)',
    };
  }

  const expiryStr = profile.planExpiresAt || profile.vipExpiresAt;
  if (!expiryStr) {
    if (profile.tier === 'pro' || profile.tier === 'unlimited' || profile.isVip) {
      return {
        hasActivePlan: true,
        daysRemaining: 30,
        isExpired: false,
        planName: profile.planName || 'VIP Active Plan',
        expiresAtFormatted: 'Active',
      };
    }
    return {
      hasActivePlan: false,
      daysRemaining: 0,
      isExpired: false,
      planName: 'Free Trial (Plan မရှိပါ)',
      expiresAtFormatted: 'ဝယ်ယူထားခြင်း မရှိသေးပါ',
    };
  }

  const expiryMs = new Date(expiryStr).getTime();
  const nowMs = Date.now();
  const diffMs = expiryMs - nowMs;

  if (diffMs > 0) {
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      hasActivePlan: true,
      daysRemaining: days,
      isExpired: false,
      planName: profile.planName || (profile.isVip ? 'VIP Studio' : 'Pro Plan'),
      expiresAtFormatted: new Date(expiryStr).toLocaleDateString('en-GB'),
    };
  } else {
    return {
      hasActivePlan: false,
      daysRemaining: 0,
      isExpired: true,
      planName: profile.planName ? `${profile.planName} (သက်တမ်းကုန်)` : 'Plan သက်တမ်းကုန်ဆုံး',
      expiresAtFormatted: `Expired on ${new Date(expiryStr).toLocaleDateString('en-GB')}`,
    };
  }
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
 * Deduct credits after translation & track total translated lines
 */
export async function deductUserCredits(
  uid: string,
  linesCount: number,
  shouldDeductCredits = true
): Promise<void> {
  if (linesCount <= 0) return;
  const userRef = doc(db, 'users', uid);
  if (shouldDeductCredits) {
    await updateDoc(userRef, {
      credits: increment(-linesCount),
      totalTranslatedLines: increment(linesCount),
    });
  } else {
    await updateDoc(userRef, {
      totalTranslatedLines: increment(linesCount),
    });
  }
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

/**
 * Save user custom Gemini keys from different Google Cloud projects
 */
export async function saveUserCustomKeys(
  uid: string,
  keys: UserCustomKeyItem[]
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const primaryKey = keys.length > 0 ? keys[0].key : '';
  await updateDoc(userRef, {
    customGeminiKeys: keys,
    savedApiKey: primaryKey,
  });
}

/**
 * Update user plan and set remaining expiration date
 */
export async function updateUserPlan(
  uid: string,
  planName: string,
  durationDays: number,
  tier: 'pro' | 'unlimited' = 'pro'
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  await updateDoc(userRef, {
    planName,
    planExpiresAt: expiryDate.toISOString(),
    isVip: true,
    tier,
  });
}

export { fbSignOut, signInWithPopup, onAuthStateChanged, onSnapshot, doc };
