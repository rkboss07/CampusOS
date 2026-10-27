import { Notice, Task, StudentProfile } from '../types';
import { defaultStudentProfile } from '../data/initialData';

const GUEST_SESSION_COOKIE = 'campusos_guest_session';
const GUEST_ID_COOKIE = 'campusos_guest_id';
const NAMED_USER_COOKIE = 'campusos_named_user';
const GUEST_PROFILE_COOKIE = 'campusos_guest_profile';
const GUEST_STORAGE_PREFIX = 'campusos_guest_data_';
const CACHE_NAME = 'campusos-guest-cache-v1';

export interface NamedUserAccount {
  uid: string;
  name: string;
  email: string;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getOrCreateGuestId(): string {
  let guestId = getCookie(GUEST_ID_COOKIE) || localStorage.getItem(GUEST_ID_COOKIE);
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  setCookie(GUEST_ID_COOKIE, guestId, 365);
  localStorage.setItem(GUEST_ID_COOKIE, guestId);
  return guestId;
}

export function getActiveNamedUser(): NamedUserAccount | null {
  const raw = getCookie(NAMED_USER_COOKIE) || localStorage.getItem(NAMED_USER_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.email) {
      return parsed as NamedUserAccount;
    }
  } catch {}
  return null;
}

export function startNamedUserSession(name: string, email: string): NamedUserAccount {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Student';
  const safeId = cleanEmail.replace(/[^a-z0-9]/g, '_');
  const account: NamedUserAccount = {
    uid: `account_${safeId}`,
    name: cleanName,
    email: cleanEmail,
  };
  const serialized = JSON.stringify(account);
  setCookie(NAMED_USER_COOKIE, serialized, 30);
  localStorage.setItem(NAMED_USER_COOKIE, serialized);
  // Clear anonymous guest session flag when signing into a named account
  deleteCookie(GUEST_SESSION_COOKIE);
  localStorage.removeItem(GUEST_SESSION_COOKIE);
  return account;
}

export function endNamedUserSession(): void {
  deleteCookie(NAMED_USER_COOKIE);
  localStorage.removeItem(NAMED_USER_COOKIE);
}

export function isGuestSessionActive(): boolean {
  return (
    getCookie(GUEST_SESSION_COOKIE) === 'active' ||
    localStorage.getItem(GUEST_SESSION_COOKIE) === 'active'
  );
}

export function startGuestSession(): string {
  const guestId = getOrCreateGuestId();
  setCookie(GUEST_SESSION_COOKIE, 'active', 30);
  localStorage.setItem(GUEST_SESSION_COOKIE, 'active');
  return guestId;
}

export function endGuestSession(): void {
  deleteCookie(GUEST_SESSION_COOKIE);
  localStorage.removeItem(GUEST_SESSION_COOKIE);
}

export interface GuestWorkspaceData {
  profile: StudentProfile;
  notices: Notice[];
  tasks: Task[];
}

export async function loadGuestWorkspace(
  workspaceId: string,
  defaultName = 'Guest Student'
): Promise<GuestWorkspaceData> {
  const fallbackProfile: StudentProfile = {
    ...defaultStudentProfile,
    name: defaultName,
  };

  // 1. Try reading from browser Cache Storage API first
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      const cachedRes = await cache.match(`/__guest_workspace__/${workspaceId}`);
      if (cachedRes) {
        const parsed = await cachedRes.json();
        if (parsed && parsed.profile) {
          return {
            profile: parsed.profile,
            notices: Array.isArray(parsed.notices) ? parsed.notices : [],
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          };
        }
      }
    } catch {
      // Fall back to localStorage / cookies
    }
  }

  // 2. Fallback to localStorage + Cookie profile
  let profile = fallbackProfile;
  if (workspaceId.startsWith('guest_')) {
    const cookieProfileStr = getCookie(GUEST_PROFILE_COOKIE);
    if (cookieProfileStr) {
      try {
        profile = { ...fallbackProfile, ...JSON.parse(cookieProfileStr) };
      } catch {}
    }
  }

  const rawLocal = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${workspaceId}`);
  if (rawLocal) {
    try {
      const parsed = JSON.parse(rawLocal);
      return {
        profile: parsed.profile || profile,
        notices: Array.isArray(parsed.notices) ? parsed.notices : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      };
    } catch {}
  }

  return {
    profile,
    notices: [],
    tasks: [],
  };
}

export async function saveGuestWorkspace(
  workspaceId: string,
  data: GuestWorkspaceData
): Promise<void> {
  const serialized = JSON.stringify(data);

  // 1. Save profile metadata to Cookie if guest
  if (workspaceId.startsWith('guest_')) {
    setCookie(
      GUEST_PROFILE_COOKIE,
      JSON.stringify({
        name: data.profile.name,
        branch: data.profile.branch,
        year: data.profile.year,
        college: data.profile.college,
      }),
      30
    );
  }

  // 2. Save workspace to localStorage
  try {
    localStorage.setItem(`${GUEST_STORAGE_PREFIX}${workspaceId}`, serialized);
  } catch (err) {
    console.warn('localStorage quota warning:', err);
  }

  // 3. Save workspace to browser Cache Storage API
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      const response = new Response(serialized, {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(`/__guest_workspace__/${workspaceId}`, response);
    } catch {
      // Ignore if Cache API is restricted in private/iframe mode
    }
  }
}
