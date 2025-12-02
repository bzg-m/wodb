// Lightweight Firebase client initialization helper.
// This file avoids throwing when Firebase config is absent (e.g. in tests)
// and exposes a single helper `getIdToken()` which returns the current
// user's ID token or `null` when not signed in or not configured.

type NullableString = string | null;

let initialized = false;
let _getIdToken: () => Promise<NullableString> = async () => null;

// Only attempt to initialize Firebase if the build provides the required
// Vite env vars. This avoids requiring the `firebase` package in test
// environments where authentication is not needed.
const hasFirebaseConfig = Boolean((import.meta as any).env?.VITE_FIREBASE_API_KEY);

if (hasFirebaseConfig) {
    // Lazy dynamic import so tests that don't install firebase won't fail.
    (async () => {
        try {
            const firebaseApp = await import('firebase/app');
            const firebaseAuth = await import('firebase/auth');
            const { initializeApp } = firebaseApp;
            const { getAuth, onIdTokenChanged } = firebaseAuth;

            const config = {
                apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
                authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
                // other optional fields can be included as needed
            };

            initializeApp(config);
            const auth = getAuth();

            // Provide a real token getter using the SDK's currentUser.
            _getIdToken = async () => {
                const user = auth.currentUser;
                if (!user) return null;
                try {
                    return await user.getIdToken();
                } catch (err) {
                    return null;
                }
            };

            // Keep auth state warm (optional): update token getter when user changes.
            onIdTokenChanged(auth, (user) => {
                // no-op; currentUser will reflect state for _getIdToken
            });

            initialized = true;
            // eslint-disable-next-line no-console
            console.log('Firebase client initialized');
        } catch (err: any) {
            // If firebase package is not installed or initialization fails,
            // keep the no-op token getter so tests don't break.
            // eslint-disable-next-line no-console
            console.warn('Firebase client not initialized:', err?.message || err);
            _getIdToken = async () => null;
            initialized = false;
        }
    })();
}

export async function getIdToken(): Promise<NullableString> {
    return _getIdToken();
}

export function isFirebaseConfigured(): boolean {
    return hasFirebaseConfig && initialized;
}

export default { getIdToken, isFirebaseConfigured };
