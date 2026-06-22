import React, { useEffect, useState } from 'react';
import { useUser } from 'reactfire';

import Loading from './Loading';

// After sign-in, Firebase can attach a Firestore listener before the freshly-issued ID
// token has been wired into Firestore's connection. The first authed read then races the
// token and the server returns `permission-denied` (e.g. the dashboard's
// users/{uid}/courses listener). reactfire caches that error for the query, so the app
// crashes through the Suspense/error boundary and only a full page reload recovers. This
// gate waits for the ID token to be available before rendering authed content, so the
// listener attaches with auth.
//
// Self-gating: with no logged-in user it renders children immediately (public pages need
// no token). We prime once per uid (module-scoped) so this only blocks the first authed
// render after a fresh load/login, not every in-app navigation. A full reload re-primes.
let primedUid = null;

const AuthReady = ({ children }) => {
  const user: firebase.User = useUser();
  const uid = user ? user.uid : null;
  const [ready, setReady] = useState(!uid || primedUid === uid);

  useEffect(() => {
    if (!uid) {
      // Logged out: forget the prime so a re-login (even same tab, same user,
      // no page reload) re-runs the gate and waits for the new token.
      primedUid = null;
      setReady(true);
      return;
    }
    if (primedUid === uid) {
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    user
      .getIdToken()
      .then(() => {
        primedUid = uid;
        if (active) setReady(true);
      })
      .catch(() => {
        // Don't block the UI if the token fetch itself fails; let the normal flow run.
        primedUid = uid;
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [uid, user]);

  if (!ready) return <Loading />;

  return <>{children}</>;
};

export default AuthReady;
