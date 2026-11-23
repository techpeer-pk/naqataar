# emulator/

Read-only snapshots of the QuFree backend rules, used **only** by the local
Firebase Emulator (`npm run emulator`).

| File | Source |
|---|---|
| `firestore.rules` | `K:\QuFree\app_OLD\firestore.rules` |
| `storage.rules` | `K:\QuFree\app_OLD\storage.rules` |
| `database.rules.json` | `K:\QuFree\app_OLD\database.rules.json` |

- Snapshot taken: 2026-11-23 (app_OLD commit `07f79c2`, adds the DOTS token-queue rules, not deployed yet).
- **Do not edit here** to change real security. Edit in app_OLD and deploy from there.
- Refresh the snapshot with `npm run sync:rules` after app_OLD's rules change.
- Every deploy from this repo is blocked by `scripts/block-deploy.mjs`.
