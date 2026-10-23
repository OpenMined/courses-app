# Backlog

Known work on the Courses platform, oldest-risk first. This file is a cache: check the code and the Firebase console before trusting any "current state" here.

## Functions

- **Five deployed functions are still on Node 12**: `assignReview`, `resignReview`, `checkForUnreviewedSubmissions`, `completeCourse` and `sanity`. Node 12 is decommissioned, so they keep running but can't be redeployed until they move to Node 22. `sanity` needs its Sanity settings (`NX_SANITY_*`) moved to Firebase secrets/params first; the others need a test pass in the emulators.
- **Exported but never deployed**: `addUniqueNumberToUser`, `addUniqueNumberToAllUsers`, `calculateCompletedResignedReviews`, `initStatsCollection`, `calStatsOnWriteSubmissions`, `calStatsOnWriteReviews`, `calStatsOnWriteCourses`, `statsActiveUserIncrease`, `statsActiveUserDecrease`. Decide for each whether to deploy (after testing; the stats ones crash on an empty `stats` collection) or delete.
- **`nx deploy firebase-api` deploys everything** (`--only functions,firestore:rules,storage`), including the functions above and the rules files. Make it deploy by name, as in the README, before anyone uses it.
- **Two unused Firebase Extensions** (`auth-mailchimp-sync` on Node 10 with an invalid API key, `delete-user-data`). Confirm and uninstall; Firebase Extensions shut down in March 2027.

## Sign-up

- **Bot sign-ups.** Email/password sign-ups have no bot protection. Upgrade the web app's Firebase SDK (7.x) so Firebase Auth's reCAPTCHA protection can be turned on, starting in audit mode.

## Deploys

- **No working CI.** The workflows in `.github/workflows` target Node 12 and a dev project that no longer exists. Replace them with a build check on pull requests and a manually triggered deploy.
