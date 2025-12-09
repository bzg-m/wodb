// Lightweight Firebase client initialization helper.
// This file avoids throwing when Firebase config is absent (e.g. in tests)
// and exposes a stable client surface. When Firebase is not configured
// a noop client is returned so callers can remain simple.

import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
    connectAuthEmulator,
    getAuth,
    GoogleAuthProvider,
    isSignInWithEmailLink,
    onAuthStateChanged,
    onIdTokenChanged,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signInWithPopup,
    signOut,
    type User,
} from 'firebase/auth';

type NullableString = string | null;

interface FirebaseClient {
    getIdToken(): Promise<NullableString>;
    isConfigured(): boolean;
    sendSignInLink(email: string): Promise<void>;
    isSignInLink(url: string): boolean;
    completeSignInWithEmailLink(email: string, url: string): Promise<boolean>;
    signOut(): Promise<void>;
    onAuthStateChanged(cb: (user: any) => void): () => void;
    // Sign in with Google (federated) — returns true on success.
    signInWithGoogle(): Promise<boolean>;
}

const noopClient: FirebaseClient = {
    getIdToken: async () => null,
    isConfigured: () => false,
    sendSignInLink: async () => undefined,
    isSignInLink: () => false,
    completeSignInWithEmailLink: async () => false,
    signOut: async () => undefined,
    onAuthStateChanged: () => () => { },
    signInWithGoogle: async () => false,
};

let client: FirebaseClient = noopClient;
let initialized = false;
const rawEnv = (import.meta as any).env || {};
const hasFirebaseConfig = Boolean(rawEnv?.VITE_FIREBASE_API_KEY);

let initPromise: Promise<void> | null = null;
if (hasFirebaseConfig) {
    initPromise = (async () => {
        try {
            const config: FirebaseOptions = {
                apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
                authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
            };

            initializeApp(config);
            const auth = getAuth();

            // Connect to the Firebase Auth emulator in development if requested.
            // Set VITE_FIREBASE_AUTH_EMULATOR_HOST to host:port (e.g. "localhost:9099").
            const emulatorHost = (import.meta as any).env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
            if (emulatorHost) {
                try {
                    const hostWithProto = emulatorHost.startsWith('http') ? emulatorHost : `http://${emulatorHost}`;
                    connectAuthEmulator(auth, hostWithProto);
                } catch (err) {
                    // ignore emulator connection failures in client init
                }
            }

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
                    } catch (err: unknown) {
                        return false;
                    }
                },
                signOut: async () => {
                    await signOut(auth);
                },
                signInWithGoogle: async () => {
                    try {
                        const provider = new GoogleAuthProvider();
                        if (typeof signInWithPopup === 'function') {
                            await signInWithPopup(auth, provider);
                            return true;
                        }
                        throw new Error('No sign-in method available');
                    } catch (err: unknown) {
                        // Don't expose internal errors to callers; just
                        // indicate failure.
                        return false;
                    }
                },
                onAuthStateChanged: (cb: (user: User | null) => void) => {
                    const unsub = onAuthStateChanged(auth, cb as any);
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

// Federated Google sign-in helper
export async function signInWithGoogle(): Promise<boolean> {
    await awaitInitIfNeeded();
    try {
        return await client.signInWithGoogle();
    } catch (err) {
        return false;
    }
}

export function isFirebaseConfigured(): boolean {
    return hasFirebaseConfig && initialized;
}

// Returns true when Firebase config values are present (even if initialization
// is still in progress).
export function isFirebasePresent(): boolean {
    return hasFirebaseConfig;
}

export default { getIdToken, isFirebaseConfigured, signInWithGoogle };

// Email link helpers
export async function sendSignInLink(email: string): Promise<void> {
    await awaitInitIfNeeded();
    return client.sendSignInLink(email);
}

export async function isSignInLink(url: string): Promise<boolean> {
    // Wait for initialization so the real client (not the noop) can
    // determine whether the URL is an email sign-in link.
    await awaitInitIfNeeded();
    try {
        return client.isSignInLink(url);
    } catch (err) {
        return false;
    }
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
