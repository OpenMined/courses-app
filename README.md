# OpenMined Courses

This repository powers [OpenMined Courses](https://courses.openmined.org), our platform for free privacy-preserving AI courses. It's an [Nx](https://nx.dev) monorepo containing the Courses web app along with its Firebase backend and Sanity CMS. Below are basic instructions for getting it running on your machine.

## Support

If you're looking for support about the courses, please go the [Courses Discussion Board](https://github.com/OpenMined/courses/discussions). If you've found a bug, or have a suggestion for an improvement to the Courses site, or any of our websites, [please file an issue here](https://github.com/OpenMined/courses-app/issues).

## Contributing

We are currently only accepting bug fixes from our community at the moment. If you're interested in working on these sites regularly as part of a team, please DM **@Patrick Cason** on Slack with your resume and qualifications.

### Local Setup

0. Make sure that you have [Node](https://nodejs.org/), [NPM](https://www.npmjs.com/), and [Yarn](https://yarnpkg.com/) installed on your machine.

1. [Install NX](https://nx.dev), our monorepo management framework.

2. From this point forward, you will run **all** commands in the root folder. Start by running `yarn install` to install all dependencies.

3. Run one of the below commands, depending on what you're trying to do... note that the third word in the command corresponds to the app in question. For instance, `yarn start courses` will run the `courses` app, located at `apps/courses`.

#### Courses

The OpenMined Courses website where we host our educational material. The site is a [React.js](https://reactjs.org) web application, running on a [Firebase](https://firebase.google.com) backend, [Jest](https://jestjs.io/) for testing, [Cypress](https://www.cypress.io/) for end-to-end testing, and using [Sanity.io](https://sanity.io) as the content management system (CMS).

- `yarn start courses` - Runs the courses site with hot reloading for development purposes.

- `yarn lint courses` - Runs the linter for the courses site

- `yarn test courses` - Runs the test suite for the courses site

- `yarn build courses` - Builds the courses site

- `yarn build courses --prod` - Builds a production version of the courses site

- `yarn analyze courses` - Analyzes the file sizes and distribution of a built version of the courses site

#### Courses E2E Testing

The OpenMined Courses website uses Cypress for end-to-end-testing. You have access to the following commands:

- `yarn e2e courses-e2e` - Runs all the end-to-end tests for the Courses website

- `yarn lint courses-e2e` - Runs the linter for the courses end-to-end app

#### Firebase API

Firebase is the primary backend for all of OpenMined's websites. If you want to test any functions or security rules before pushing them live, [you may do so using the emulator suite](https://firebase.google.com/docs/emulator-suite).

- `yarn test firebase-api` - Runs all the tests for the our Firebase backend

Cloud Functions run on Node 22. The webpack 4 toolchain needs the legacy OpenSSL provider on modern Node:

```sh
NODE_OPTIONS=--openssl-legacy-provider yarn build firebase-api --prod
```

To run the functions locally, start the emulators against a `demo-` project ID, which Firebase never connects to real resources. Functions that send email read `RESEND_API_KEY`; locally, put a placeholder in a `.secret.local` file at the repo root (it is gitignored):

```sh
printf 'RESEND_API_KEY=re_placeholder\nTURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA\n' > .secret.local
npx firebase-tools@13 emulators:start --project demo-courses --only auth,functions,firestore
```

The web app only talks to the emulators when `window.Cypress` is set; otherwise `yarn start courses` connects to the **real** Firebase project. Set that flag (Cypress does it for you) before testing anything that writes data.

#### Sign-up

Email/password accounts are created by the `createAccount` callable function, not in the browser. The sign-up form shows a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) check, and `createAccount` verifies its token server-side before creating the account and its `users` document. Client-side sign-up is switched off in Firebase Auth (Settings → User actions), so the public API can't be used to create accounts directly.

- `NX_TURNSTILE_SITE_KEY` (public) is in `.env`; `.local.env` uses Cloudflare's always-pass test key.
- `TURNSTILE_SECRET_KEY` is a Firebase secret. For local testing, Cloudflare's test secrets are `1x0000000000000000000000000000000AA` (always passes) and `2x0000000000000000000000000000000AA` (always fails).

#### Email

Course emails (welcome, course started, project reviewed, account deleted) are sent through [Resend](https://resend.com) from `no-reply@openmined.org`, with replies going to `info@openmined.org`. The API key is a Firebase secret, set once per project with `firebase functions:secrets:set RESEND_API_KEY`.

Welcome, course-started and goodbye emails only go to addresses we know are real: verified ones, or ones that came from GitHub or Google sign-in. Unverified password sign-ups get Firebase's own verification email instead. This keeps bot sign-ups from bouncing mail and hurting openmined.org's sender reputation. Skipped emails are logged.

#### Deploying functions

Deploy functions **by name**. The codebase exports some functions that are not deployed in production, and a bare `firebase deploy --only functions` would create them. The functions currently deployed from this repo with the Node 22 runtime are:

```sh
npx firebase-tools@13 deploy --project production \
  --only functions:createAccount,functions:sendWelcomeEmail,functions:sendByeEmail,functions:startCourse,functions:receiveReview
```

See [BACKLOG.md](BACKLOG.md) for the rest of the functions and other known issues.

#### Sanity CMS

Sanity is the primary CMS for all of OpenMined's websites. You must have a user account to change any actual values, however, if you want to run it on your machine, you have access to the following commands:

- `yarn start sanity-api` - Runs the Sanity CMS with hot reloading for development purposes.

- `yarn lint sanity-api` - Runs the linter for the Sanity CMS

- `yarn test sanity-api` - Runs the test suite for the Sanity CMS

- `yarn build sanity-api` - Builds the Sanity CMS

- `yarn build sanity-api --prod` - Builds a production version of the Sanity CMS

- `yarn analyze sanity-api` - Analyzes the file sizes and distribution of a built version of the Sanity CMS
