# Courses — contributor guidelines

How to build in this repo, for humans and AI tools alike. `README.md` covers how to run and deploy it; this file covers the conventions. `BACKLOG.md` holds known open work.

## This repo is public

Never commit credentials, keys, `.secret.*` files, internal hostnames or customer data. Server secrets live in Firebase (`firebase functions:secrets:set`), not in `.env` files. The `.env` files only hold the web app's public Firebase config.

## Changes

- Branch from `master` and open a pull request. Nothing reaches production without a reviewed PR and the owner's go-ahead to deploy.
- Keep each PR to one purpose. Note in its description what you tested and how.
- No AI attribution in commits or PRs.

## Cloud Functions

- Functions run on Node 22, 1st gen, in `europe-west1`. Keep function names, regions and triggers stable: renaming a function creates a new one and leaves the old one running.
- Deploy functions **by name**, never with a bare `--only functions` (see README).
- Test in the emulators against a `demo-` project ID before deploying. Never point local tools at the production project to test.
- A function that uses a secret declares it in `runWith({ secrets })`.

## Sign-up

- New email/password accounts are created only by the `createAccount` function, after a server-side Turnstile check. Don't create accounts from the browser: client-side sign-up is switched off in Firebase Auth.
- Validation in `apps/firebase-api/src/app/signup.ts` mirrors the form's rules; change both together.

## Email

- All email goes through `sendEmail` in `apps/firebase-api/src/app/email.ts` (Resend, from `no-reply@openmined.org`, Reply-To `info@openmined.org`).
- Email triggered by account activity goes through `sendEmailIfTrusted`, so unverified addresses never receive it.
- Don't add another sending service; extend `email.ts`.
