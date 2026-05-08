# Security Specification for MasteryQuiz

## Data Invariants
- A user document can only be created by the user themselves.
- Progress configurations must belong to the user.
- Question states must belong to the user.
- `box` must be 1, 2, or 3.
- `wrongCount` must be non-negative.
- `userId` path variables must match `request.auth.uid`.

## The "Dirty Dozen" Payloads

1. Attempt to create a user profile for a different UID.
2. Attempt to update `email` of another user.
3. Attempt to set `box` to 4 (invalid value).
4. Attempt to set `wrongCount` to -1.
5. Attempt to overwrite `inputText` of another user's progress.
6. Attempt to update a question state with a 1MB string in `id`.
7. Attempt to create a question state without a `box` field.
8. Attempt to read another user's progress.
9. Attempt to list all users' configurations.
10. Attempt to update `activeSetId` with a non-number.
11. Attempt to bypass `email_verified` check (if strictly required).
12. Attempt to delete a user's configuration as a different user.

## The Test Runner (Plan)
We will implement `firestore.rules` and verify it with basic logic gates.
