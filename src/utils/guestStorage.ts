import { Notice, Task, StudentProfile } from '../types';
import { defaultStudentProfile } from '../data/initialData';

const GUEST_SESSION_COOKIE = 'campusos_guest_session';
const GUEST_ID_COOKIE = 'campusos_guest_id';
const GUEST_PROFILE_COOKIE = 'campusos_guest_profile';
const GUEST_STORAGE_PREFIX = 'campusos_guest_data_';
const CACHE_NAME = 'campusos-guest-cache-v1';

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

export async function loadGuestWorkspace(guestId: string): Promise<GuestWorkspaceData> {
  const fallbackProfile: StudentProfile = {
    ...defaultStudentProfile,
    name: 'Guest Student',
  };

  // 1. Try reading from browser Cache Storage API first
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      const cachedRes = await cache.match(`/__guest_workspace__/${guestId}`);
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
  const cookieProfileStr = getCookie(GUEST_PROFILE_COOKIE);
  if (cookieProfileStr) {
    try {
      profile = { ...fallbackProfile, ...JSON.parse(cookieProfileStr) };
    } catch {}
  }

  const rawLocal = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${guestId}`);
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
  guestId: string,
  data: GuestWorkspaceData
): Promise<void> {
  const serialized = JSON.stringify(data);

  // 1. Save profile metadata to Cookie
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

  // 2. Save workspace to localStorage
  try {
    localStorage.setItem(`${GUEST_STORAGE_PREFIX}${guestId}`, serialized);
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
      await cache.put(`/__guest_workspace__/${guestId}`, response);
    } catch {
      // Ignore if Cache API is restricted in private/iframe mode
    }
  }
}
