// Lightweight Firebase client initialization helper.
// This file avoids throwing when Firebase config is absent (e.g. in tests)
// and exposes a stable client surface. When Firebase is not configured
// a noop client is returned so callers can remain simple.

type NullableString = string | null;

interface FirebaseClient {
    getIdToken(): Promise<NullableString>;
    isConfigured(): boolean;
    sendSignInLink(email: string): Promise<void>;
    isSignInLink(url: string): boolean;
    completeSignInWithEmailLink(email: string, url: string): Promise<boolean>;
    signOut(): Promise<void>;
    onAuthStateChanged(cb: (user: any) => void): () => void;
}

const noopClient: FirebaseClient = {
    getIdToken: async () => null,
    isConfigured: () => false,
    sendSignInLink: async () => undefined,
    isSignInLink: () => false,
    completeSignInWithEmailLink: async () => false,
    signOut: async () => undefined,
    onAuthStateChanged: () => () => { },
};

let client: FirebaseClient = noopClient;
let initialized = false;
const rawEnv = (import.meta as any).env || {};
const hasFirebaseConfig = Boolean(rawEnv?.VITE_FIREBASE_API_KEY);

let initPromise: Promise<void> | null = null;
if (hasFirebaseConfig) {
    initPromise = (async () => {
        try {
            const firebaseApp = await import('firebase/app');
            const firebaseAuth = await import('firebase/auth');
            const { initializeApp } = firebaseApp;
            const { getAuth, onIdTokenChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, onAuthStateChanged } = firebaseAuth as any;

            const config = {
                apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
                authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
            } as any;

            initializeApp(config);
            const auth = getAuth();

            const realClient: FirebaseClient = {
                getIdToken: async () => {
                    const user = auth.currentUser;
                    if (!user) return null;
                    try {
                        return await user.getIdToken();
                    } catch (err) {
                        return null;
                    }
                },
                isConfigured: () => true,
                sendSignInLink: async (email: string) => {
                    const actionCodeSettings = {
                        url: (import.meta as any).env.VITE_FIREBASE_EMAIL_SIGNIN_REDIRECT || window.location.href,
                        handleCodeInApp: true,
                    } as any;
                    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
                },
                isSignInLink: (url: string) => isSignInWithEmailLink(auth, url),
                completeSignInWithEmailLink: async (email: string, url: string) => {
                    try {
                        await signInWithEmailLink(auth, email, url);
                        return true;
                    } catch (err) {
                        return false;
                    }
                },
                signOut: async () => {
                    await signOut(auth);
                },
                onAuthStateChanged: (cb: (user: any) => void) => {
                    const unsub = onAuthStateChanged(getAuth(), cb as any);
                    return unsub as any;
                },
            };

            // Keep auth state warm (optional)
            onIdTokenChanged(auth, () => { });

            client = realClient;
            initialized = true;
            // eslint-disable-next-line no-console
            console.log('Firebase client initialized');
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.warn('Firebase client not initialized:', err?.message || err);
            client = noopClient;
            initialized = false;
        }
    })();
}

async function awaitInitIfNeeded() {
    if (initPromise) {
        try {
            await initPromise;
        } catch (err) {
            // ignore; initPromise logs failures
        }
    }
}

export async function getIdToken(): Promise<NullableString> {
    await awaitInitIfNeeded();
    return client.getIdToken();
}

export function isFirebaseConfigured(): boolean {
    return hasFirebaseConfig && initialized;
}

export default { getIdToken, isFirebaseConfigured };

// Email link helpers
export async function sendSignInLink(email: string): Promise<void> {
    await awaitInitIfNeeded();
    return client.sendSignInLink(email);
}

export function isSignInLink(url: string): boolean {
    // safe to call without awaiting init because this just inspects the URL
    return client.isSignInLink(url);
}

export async function completeSignInWithEmailLink(email: string, url: string): Promise<boolean> {
    await awaitInitIfNeeded();
    return client.completeSignInWithEmailLink(email, url);
}

export async function firebaseSignOut(): Promise<void> {
    await awaitInitIfNeeded();
    return client.signOut();
}

export function onFirebaseAuthStateChanged(cb: (user: any) => void) {
    // If the client isn't initialized yet, wait but still return an unsubscribe no-op immediately.
    const unsubRef = { fn: () => { } } as { fn: () => void };
    (async () => {
        await awaitInitIfNeeded();
        const unsub = client.onAuthStateChanged(cb);
        unsubRef.fn = unsub;
    })();
    return () => unsubRef.fn();
}
