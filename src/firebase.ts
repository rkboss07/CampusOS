import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Notice, Task, StudentProfile } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitize string helper to enforce blueprint maxLength constraints
function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = (val ?? fallback).trim() || fallback;
  return str.slice(0, maxLen);
}

function clampNum(val: number | undefined | null, min = 0, max = 100, fallback = 50): number {
  const n = typeof val === 'number' && !Number.isNaN(val) ? val : fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Ensures the authenticated user's profile document exists at /users/{uid}.
 */
export async function ensureUserProfile(user: User): Promise<StudentProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        name: data.name || user.displayName || 'Student',
        branch: data.branch || 'B.Tech AI & ML',
        year: data.year || '2nd Year',
        semester: '4th Semester',
        rollNo: '',
        category: 'Day Scholar',
        college: data.college || 'Engineering Institute',
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const initialProfile: StudentProfile = {
    name: clampStr(user.displayName, 120, 'Student'),
    branch: 'B.Tech AI & ML',
    year: '2nd Year',
    semester: '4th Semester',
    rollNo: '',
    category: 'Day Scholar',
    college: 'Engineering Institute',
  };

  try {
    await setDoc(userRef, {
      uid: user.uid,
      name: clampStr(initialProfile.name, 120, 'Student'),
      branch: clampStr(initialProfile.branch, 100, 'B.Tech AI & ML'),
      year: clampStr(initialProfile.year, 50, '2nd Year'),
      college: clampStr(initialProfile.college, 200, 'Engineering Institute'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return initialProfile;
}

export async function updateUserProfileInDb(
  uid: string,
  profile: StudentProfile
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    const existingCreatedAt = snap.exists() ? snap.data().createdAt : serverTimestamp();

    await setDoc(userRef, {
      uid,
      name: clampStr(profile.name, 120, 'Student'),
      branch: clampStr(profile.branch, 100, 'B.Tech AI & ML'),
      year: clampStr(profile.year, 50, '2nd Year'),
      college: clampStr(profile.college, 200, 'Engineering Institute'),
      createdAt: existingCreatedAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

function buildValidNoticePayload(uid: string, notice: Notice, createdAtVal: any) {
  const validCategories = [
    'Examination',
    'Assignment',
    'Fee',
    'Scholarship',
    'Placement',
    'Workshop / Event',
    'General',
  ];
  const validActionTypes = [
    'submit_form',
    'fee_payment',
    'assignment_submission',
    'event_registration',
    'read_acknowledge',
    'portal_action',
  ];
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  const validStatuses = ['active', 'completed', 'archived'];
  const validSources = ['text', 'pdf', 'image'];

  const sanitizedKeyPoints = Array.isArray(notice.keyPoints)
    ? notice.keyPoints
        .filter((k) => typeof k === 'string' && k.trim().length > 0)
        .slice(0, 10)
        .map((k) => k.slice(0, 300))
    : [];

  return {
    id: clampStr(notice.id, 128, `notice-${Date.now()}`),
    ownerId: uid,
    title: clampStr(notice.title, 300, 'Official Academic Notice'),
    rawContent: clampStr(notice.rawContent, 20000, 'College notice content'),
    category: validCategories.includes(notice.category) ? notice.category : 'General',
    targetAudience: clampStr(notice.targetAudience, 200, 'All Students'),
    targetBranch: clampStr(notice.targetBranch, 120, 'All Departments'),
    targetYear: clampStr(notice.targetYear, 80, 'All Years'),
    deadline: clampStr(notice.deadline, 40, '2026-08-18'),
    deadlineTime: clampStr(notice.deadlineTime, 40, '5:00 PM'),
    venue: clampStr(notice.venue, 200, 'College Campus'),
    requiredAction: clampStr(notice.requiredAction, 500, 'Review circular details'),
    actionType: validActionTypes.includes(notice.actionType)
      ? notice.actionType
      : 'portal_action',
    importance: clampNum(notice.importance, 0, 100, 85),
    urgency: clampNum(notice.urgency, 0, 100, 85),
    studentRelevance: clampNum(notice.studentRelevance, 0, 100, 90),
    priorityScore: clampNum(notice.priorityScore, 0, 100, 88),
    priorityLevel: validPriorities.includes(notice.priorityLevel)
      ? notice.priorityLevel
      : 'High',
    priorityReason: clampStr(
      notice.priorityReason,
      1000,
      'Calculated from deadline proximity and student profile alignment.'
    ),
    summary: clampStr(notice.summary, 1000, 'Official academic circular summary.'),
    keyPoints: sanitizedKeyPoints,
    consequencesOfMissing: clampStr(notice.consequencesOfMissing, 500, '').slice(0, 500),
    status: validStatuses.includes(notice.status) ? notice.status : 'active',
    source: validSources.includes(notice.source) ? notice.source : 'text',
    sourceFileName: clampStr(notice.sourceFileName, 255, 'Circular_Notice.pdf'),
    createdAt: createdAtVal,
    updatedAt: serverTimestamp(),
  };
}

export async function createNoticeInDb(uid: string, notice: Notice): Promise<void> {
  const path = `users/${uid}/notices/${notice.id}`;
  const noticeRef = doc(db, 'users', uid, 'notices', notice.id);
  try {
    await setDoc(noticeRef, buildValidNoticePayload(uid, notice, serverTimestamp()));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNoticeStatusInDb(
  uid: string,
  noticeId: string,
  newStatus: 'active' | 'completed'
): Promise<void> {
  const path = `users/${uid}/notices/${noticeId}`;
  const noticeRef = doc(db, 'users', uid, 'notices', noticeId);
  try {
    const snap = await getDoc(noticeRef);
    if (!snap.exists()) return;
    const data = snap.data();
    await setDoc(noticeRef, {
      ...data,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateNoticeInDb(uid: string, notice: Notice): Promise<void> {
  const path = `users/${uid}/notices/${notice.id}`;
  const noticeRef = doc(db, 'users', uid, 'notices', notice.id);
  try {
    const snap = await getDoc(noticeRef);
    const existingCreatedAt = snap.exists() ? snap.data().createdAt : serverTimestamp();
    await setDoc(noticeRef, buildValidNoticePayload(uid, notice, existingCreatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNoticeFromDb(uid: string, noticeId: string): Promise<void> {
  const path = `users/${uid}/notices/${noticeId}`;
  const noticeRef = doc(db, 'users', uid, 'notices', noticeId);
  try {
    await deleteDoc(noticeRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTaskInDb(uid: string, task: Task): Promise<void> {
  const path = `users/${uid}/tasks/${task.id}`;
  const taskRef = doc(db, 'users', uid, 'tasks', task.id);
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  const validCategories = [
    'Examination',
    'Assignment',
    'Fee',
    'Scholarship',
    'Placement',
    'Workshop / Event',
    'General',
  ];

  try {
    await setDoc(taskRef, {
      id: clampStr(task.id, 128, `task-${Date.now()}`),
      ownerId: uid,
      noticeId: clampStr(task.noticeId || '', 128, ''),
      title: clampStr(task.title, 300, 'Academic Task'),
      dueDate: clampStr(task.dueDate, 40, '2026-08-18'),
      priority: validPriorities.includes(task.priority) ? task.priority : 'High',
      category: validCategories.includes(task.category) ? task.category : 'General',
      completed: Boolean(task.completed),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTaskCompletedInDb(
  uid: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  const taskRef = doc(db, 'users', uid, 'tasks', taskId);
  try {
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const data = snap.data();
    await setDoc(taskRef, {
      ...data,
      completed: Boolean(completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTaskInDb(uid: string, task: Task): Promise<void> {
  const path = `users/${uid}/tasks/${task.id}`;
  const taskRef = doc(db, 'users', uid, 'tasks', task.id);
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  const validCategories = [
    'Examination',
    'Assignment',
    'Fee',
    'Scholarship',
    'Placement',
    'Workshop / Event',
    'General',
  ];
  try {
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const data = snap.data();
    await setDoc(taskRef, {
      ...data,
      title: clampStr(task.title, 300, 'Academic Task'),
      dueDate: clampStr(task.dueDate, 40, '2026-08-18'),
      priority: validPriorities.includes(task.priority) ? task.priority : 'High',
      category: validCategories.includes(task.category) ? task.category : 'General',
      completed: Boolean(task.completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTaskFromDb(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  const taskRef = doc(db, 'users', uid, 'tasks', taskId);
  try {
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserNotices(
  uid: string,
  onData: (notices: Notice[]) => void
): Unsubscribe {
  const path = `users/${uid}/notices`;
  const q = query(collection(db, 'users', uid, 'notices'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Notice[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          title: data.title,
          rawContent: data.rawContent,
          category: data.category,
          targetAudience: data.targetAudience,
          targetBranch: data.targetBranch,
          targetYear: data.targetYear,
          deadline: data.deadline,
          deadlineTime: data.deadlineTime,
          eventDate: data.category === 'Workshop / Event' ? data.deadline : null,
          eventTime: data.category === 'Workshop / Event' ? data.deadlineTime : null,
          venue: data.venue,
          requiredAction: data.requiredAction,
          actionType: data.actionType,
          portalUrl: 'https://aktu.ac.in',
          importance: data.importance,
          urgency: data.urgency,
          studentRelevance: data.studentRelevance,
          priorityScore: data.priorityScore,
          priorityLevel: data.priorityLevel,
          priorityReason: data.priorityReason,
          summary: data.summary,
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
          consequencesOfMissing: data.consequencesOfMissing || '',
          status: data.status,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          source: data.source || 'text',
          sourceFileName: data.sourceFileName || '',
        };
      });
      items.sort((a, b) => b.priorityScore - a.priorityScore);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToUserTasks(
  uid: string,
  onData: (tasks: Task[]) => void
): Unsubscribe {
  const path = `users/${uid}/tasks`;
  const q = query(collection(db, 'users', uid, 'tasks'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Task[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          noticeId: data.noticeId || undefined,
          title: data.title,
          dueDate: data.dueDate,
          priority: data.priority,
          category: data.category,
          completed: Boolean(data.completed),
          estimatedMinutes: 20,
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
