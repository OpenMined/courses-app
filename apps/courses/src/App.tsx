import React, { useState, useLayoutEffect } from 'react';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import {
  preloadAuth,
  preloadFirestore,
  preloadFunctions,
  useFirebaseApp,
} from 'reactfire';

import Routes from './routes';

import Loading from './components/Loading';

import { SuspenseWithPerf } from 'reactfire';

const history = createBrowserHistory();

// NOTE: Firestore offline persistence (`enablePersistence`) is intentionally NOT enabled.
// In Safari/WebKit its IndexedDB initialization intermittently never settles, and because
// Firestore queues every read behind persistence init, the app hung forever on the
// app-wide Suspense loader (the long-standing "infinite loading after login" bug — verified
// 2026-06-19: `enablePersistence` START with no resolve/reject, zero Listen/channel requests
// on the wire; disabling it makes reads resolve in ~270ms). `experimentalForceOwningTab` did
// not cure it. The app reads live from the network and does not rely on offline caching.

const preloadSDKs = (firebaseApp) => {
  Promise.all([
    preloadAuth({
      firebaseApp,
      setup: (auth) => {
        auth().useEmulator('http://localhost:5500/');
      },
    }),
    preloadFunctions({
      firebaseApp,
      setup: (functions) => {
        functions().useFunctionsEmulator('http://localhost:5501');
      },
    }),
    preloadFirestore({
      firebaseApp,
      setup: (firestore) => {
        const initalizedStore = firestore();
        initalizedStore.settings({
          host: 'localhost:5502',
          ssl: false,
          experimentalForceLongPolling: true,
        });
      },
    }),
    // TODO: Create a bucket for dev purposes only
    //
    // preloadStorage({
    //   firebaseApp,
    //   setup: (storage) => {
    //     storage('gs://put-a-bucket-here');
    //   },
    // }),
  ]);
};

// Real browsers (non-Cypress): force Firestore to use long-polling instead of the default
// streaming WebChannel. This is a Safari/WebChannel compatibility safety measure and is the
// transport configuration validated working in Safari (2026-06-19). It is NOT the fix for
// the infinite-loading bug — that was offline persistence (see note above).
const preloadProdFirestore = (firebaseApp) =>
  preloadFirestore({
    firebaseApp,
    setup: (firestore) => {
      firestore().settings({ experimentalForceLongPolling: true });
    },
  });

const App = () => {
  const [action, setAction] = useState(history.action);
  const [location, setLocation] = useState(history.location);

  useLayoutEffect(() => {
    history.listen(({ location, action }) => {
      setLocation(location);
      setAction(action);
    });
  }, []);

  const firebaseApp = useFirebaseApp();

  // @ts-ignore
  if (window.Cypress) {
    preloadSDKs(firebaseApp);
  } else {
    preloadProdFirestore(firebaseApp);
  }

  return (
    <Router action={action} location={location} navigator={history}>
      <SuspenseWithPerf fallback={<Loading />} traceId={location.pathname}>
        <Routes />
      </SuspenseWithPerf>
    </Router>
  );
};

export default App;
