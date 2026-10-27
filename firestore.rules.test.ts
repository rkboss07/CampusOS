/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 */

export const dirtyDozenTestCases = [
  {
    id: 1,
    name: 'Reject unauthenticated profile creation',
    path: '/users/user_1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Reject unverified email profile creation',
    path: '/users/user_1',
    auth: { uid: 'user_1', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Reject cross-user profile creation (identity spoofing)',
    path: '/users/user_2',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Reject shadow field injection (isAdmin: true)',
    path: '/users/user_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Reject cross-user notice read/list',
    path: '/users/user_1/notices/notice_1',
    auth: { uid: 'user_2', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Reject orphaned notice write when parent user profile is missing',
    path: '/users/user_1/notices/notice_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Reject ID poisoning on noticeId',
    path: '/users/user_1/notices/invalid$id!',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Reject oversized title string (>300 chars)',
    path: '/users/user_1/notices/notice_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Reject unbounded keyPoints array (>10 items)',
    path: '/users/user_1/notices/notice_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Reject forged client timestamps (createdAt != request.time)',
    path: '/users/user_1/notices/notice_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Reject mutation of immutable ownerId or createdAt',
    path: '/users/user_1/tasks/task_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Reject task update with non-allowlisted fields',
    path: '/users/user_1/tasks/task_1',
    auth: { uid: 'user_1', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
