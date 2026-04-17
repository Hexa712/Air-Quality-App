/**
 * User Data Service — Firestore CRUD for user profiles, search history,
 * skin analysis history, and personalization.
 *
 * Firestore structure:
 *   users/{uid}
 *     ├── name, email_or_phone, login_method, created_at, last_login, preferences
 *     ├── search_history (subcollection)
 *     │     └── {docId} → { query, timestamp }
 *     └── skin_analysis_history (subcollection)
 *           └── {docId} → { image_id, result, timestamp }
 */

import { db } from '@/lib/firebase';
import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, orderBy, limit, getDocs,
  serverTimestamp, Timestamp, deleteDoc,
} from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  name: string;
  email_or_phone: string;
  login_method: 'email' | 'google' | 'phone';
  created_at: any;
  last_login: any;
  preferences: Record<string, any>;
}

export interface SearchHistoryItem {
  id?: string;
  query: string;
  timestamp: any;
}

export interface SkinAnalysisHistoryItem {
  id?: string;
  image_id: string;
  result: {
    skin_type: string;
    issues: string[];
    severity: string;
    environment_impact?: string;
    recommendations?: any;
    locationName?: string;
    aqi?: number;
    uvIndex?: number;
    humidity?: number;
    temp?: number;
  };
  timestamp: any;
}

// ─── STEP 1 & 2: User Authentication & Data Storage ──────────────────

/**
 * Create or update a user profile on login/signup.
 * Uses { merge: true } so existing data isn't wiped on re-login.
 */
export async function createOrUpdateUser(
  uid: string,
  data: {
    name: string;
    email_or_phone: string;
    login_method: 'email' | 'google' | 'phone';
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    // Returning user — update last_login only
    await updateDoc(userRef, {
      last_login: serverTimestamp(),
      // Update name/email in case user changed Google profile
      name: data.name || existing.data().name,
      email_or_phone: data.email_or_phone || existing.data().email_or_phone,
    });
  } else {
    // New user — create full profile
    await setDoc(userRef, {
      user_id: uid,
      name: data.name,
      email_or_phone: data.email_or_phone,
      login_method: data.login_method,
      created_at: serverTimestamp(),
      last_login: serverTimestamp(),
      preferences: {},
    });
  }
}

/**
 * Fetch the full user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { user_id: uid, ...snap.data() } as UserProfile;
}

/**
 * Update user preferences (e.g. default city, skin type, theme).
 */
export async function updatePreferences(
  uid: string,
  prefs: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    preferences: prefs,
  });
}

// ─── STEP 3: Track User Activity ─────────────────────────────────────

/**
 * Save a search query to the user's search_history subcollection.
 */
export async function saveSearchHistory(
  uid: string,
  searchQuery: string
): Promise<void> {
  if (!searchQuery.trim()) return;
  const colRef = collection(db, 'users', uid, 'search_history');
  await addDoc(colRef, {
    query: searchQuery.trim(),
    timestamp: serverTimestamp(),
  });
}

/**
 * Fetch the user's recent search history.
 */
export async function getSearchHistory(
  uid: string,
  maxResults = 20
): Promise<SearchHistoryItem[]> {
  const colRef = collection(db, 'users', uid, 'search_history');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as SearchHistoryItem[];
}

/**
 * Delete a specific search history entry.
 */
export async function deleteSearchHistoryItem(
  uid: string,
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'search_history', docId));
}

/**
 * Save a skin analysis result to the user's skin_analysis_history subcollection.
 */
export async function saveSkinAnalysis(
  uid: string,
  result: SkinAnalysisHistoryItem['result']
): Promise<string> {
  const colRef = collection(db, 'users', uid, 'skin_analysis_history');
  const imageId = `skin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const docRef = await addDoc(colRef, {
    image_id: imageId,
    result,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch the user's past skin analyses.
 */
export async function getSkinAnalysisHistory(
  uid: string,
  maxResults = 10
): Promise<SkinAnalysisHistoryItem[]> {
  const colRef = collection(db, 'users', uid, 'skin_analysis_history');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as SkinAnalysisHistoryItem[];
}

// ─── STEP 4: Personalization ──────────────────────────────────────────

/**
 * Generate personalized recommendations based on past skin analyses.
 * Returns trending issues, recurring problems, and improvement suggestions.
 */
export async function getPersonalization(uid: string): Promise<{
  recurring_issues: string[];
  trending_severity: string;
  past_skin_types: string[];
  total_analyses: number;
  suggestion: string;
}> {
  const history = await getSkinAnalysisHistory(uid, 20);

  if (history.length === 0) {
    return {
      recurring_issues: [],
      trending_severity: 'none',
      past_skin_types: [],
      total_analyses: 0,
      suggestion: 'Upload your first skin photo to get personalized recommendations!',
    };
  }

  // Count issue frequency
  const issueCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = { mild: 0, moderate: 0, severe: 0 };
  const skinTypes: string[] = [];

  history.forEach(item => {
    const { result } = item;
    if (result.skin_type && !skinTypes.includes(result.skin_type)) {
      skinTypes.push(result.skin_type);
    }
    if (result.severity) {
      severityCounts[result.severity.toLowerCase()] =
        (severityCounts[result.severity.toLowerCase()] || 0) + 1;
    }
    result.issues?.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });

  // Top recurring issues (appeared in 2+ analyses)
  const recurring = Object.entries(issueCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([issue]) => issue);

  // Trending severity (most common)
  const trending = Object.entries(severityCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Generate suggestion based on trends
  let suggestion = '';
  if (severityCounts.severe > severityCounts.mild) {
    suggestion = 'Your skin condition has been trending severe. Consider consulting a dermatologist and maintaining a strict skincare routine.';
  } else if (recurring.length > 0) {
    suggestion = `You have recurring issues with: ${recurring.slice(0, 3).join(', ')}. Focus your routine on targeted treatments for these concerns.`;
  } else if (history.length >= 3 && severityCounts.mild > severityCounts.moderate) {
    suggestion = 'Great progress! Your skin condition is trending toward mild. Keep up your current routine!';
  } else {
    suggestion = 'Keep tracking your skin regularly to build a personalized improvement plan.';
  }

  return {
    recurring_issues: recurring,
    trending_severity: trending,
    past_skin_types: skinTypes,
    total_analyses: history.length,
    suggestion,
  };
}

// ─── STEP 6: Structured Response Helper ───────────────────────────────

export function formatResponse(
  status: 'success' | 'error',
  message: string,
  userId?: string,
  data?: any
) {
  return {
    status,
    message,
    ...(userId && { user_id: userId }),
    ...(data && { data }),
  };
}
