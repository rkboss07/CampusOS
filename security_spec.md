# Security Specification — CampusOS Per-User Firestore Rules

## 1. Data Invariants
1. **Strict Per-User Isolation**: Every document in `/users/{userId}`, `/users/{userId}/notices/{noticeId}`, and `/users/{userId}/tasks/{taskId}` belongs exclusively to `userId == request.auth.uid` with `request.auth.token.email_verified == true`.
2. **Master Gate Relational Integrity**: Subcollection documents (`notices` and `tasks`) can only be read or written if the parent `/users/{userId}` document exists and its `uid` matches `request.auth.uid`.
3. **Immutable Identity & Creation Timestamps**: `uid`, `id`, `ownerId`, and `createdAt` are immutable across all updates; `createdAt` and `updatedAt` must equal `request.time`.
4. **Strict Key & Size Enforcement**: Every entity enforces `hasAll` and `hasOnly` key checks, bounded string/array lengths, and regex ID validation (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating `/users/user_1` with `auth == null`.
2. **Unverified Email Write**: Creating `/users/user_1` where `auth.token.email_verified == false`.
3. **Identity Spoofing on User Profile**: Authenticated `user_1` creating `/users/user_2` or setting `uid: "user_2"`.
4. **Shadow Field Injection on Profile**: Authenticated `user_1` creating `/users/user_1` with an extra field `isAdmin: true`.
5. **Cross-User Notice Read/List**: Authenticated `user_2` attempting to read or list `/users/user_1/notices`.
6. **Orphaned Notice Write (Master Gate Bypass)**: Authenticated `user_1` creating `/users/user_1/notices/notice_1` when `/users/user_1` does not exist.
7. **ID Poisoning Attack**: Creating a notice with an invalid or >128 char ID containing special characters (`notice$bad!`).
8. **Value Poisoning / Oversized String**: Creating a notice where `title` exceeds 300 characters or `rawContent` exceeds 20,000 characters.
9. **Unbounded Array Attack**: Creating a notice where `keyPoints` has more than 10 elements or non-string first element.
10. **Client Timestamp Forgery**: Creating or updating a notice or task with a forged past/future `createdAt` or `updatedAt` (`!= request.time`).
11. **Immutable Field Mutation**: Updating `ownerId` or `createdAt` on an existing notice or task.
12. **Unauthorized Update Key Mutation**: Updating a task with fields outside the allowed action keyset `['completed', 'title', 'dueDate', 'priority', 'updatedAt']`.
