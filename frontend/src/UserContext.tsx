import type { IdTokenResult, User as FirebaseUser } from 'firebase/auth';
import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

import {
    firebaseSignOut,
    getIdToken,
    isFirebasePresent,
    onFirebaseAuthStateChanged,
    signInWithGoogle,
} from './firebase';

type User = { uid: string; name?: string | null; email?: string | null; isAdmin?: boolean };

interface UserContextValue {
    user: User | null;
    loading: boolean;
    loginWithGoogle(): Promise<boolean>;
    logout(): Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function useUser(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within a UserProvider');
    return ctx;
}

export function UserProvider({ children }: { children: ComponentChildren }) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If there is no firebase config at all, stop early. If config is
        // present but initialization hasn't completed yet we still register
        // the auth listener — `onFirebaseAuthStateChanged` waits for init and
        // will subscribe when ready. This avoids a race where the component
        // mounts before Firebase finishes initializing and never re-subscribes.
        if (!isFirebasePresent()) {
            setLoading(false);
            return;
        }

        const unsub = onFirebaseAuthStateChanged(async (u: FirebaseUser) => {
            if (!u) {
                setUser(null);
                setLoading(false);
                return;
            }
            try {
                // Prefer fetching the token from the `u` object provided by
                // the auth callback. In some race conditions `auth.currentUser`
                // may not yet be populated even though `u` is present; calling
                // `u.getIdToken()` is more reliable here. Fall back to the
                // exported `getIdToken()` when `u` doesn't expose the method.
                if (typeof u.getIdToken === 'function') {
                    try {
                        await u.getIdToken(); // warm token, ignore value
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (e) {
                        // ignore token fetch failures here; downstream checks
                        // will handle missing tokens.
                    }
                } else {
                    await getIdToken(); // warm token, ignore value here
                }
                // Try to read token claims to determine admin status. Use
                // `getIdTokenResult` on the Firebase user if available. We use
                // promise `.catch()` here so failures are swallowed without a
                // nested try/catch block.
                let isAdmin = false;
                if (typeof u.getIdTokenResult === 'function') {
                    isAdmin = await u
                        .getIdTokenResult(true)
                        .then((ir: IdTokenResult) => !!(ir && ir.claims && ir.claims.isAdmin))
                        .catch(() => false);
                }
                setUser({ uid: u.uid, name: u.displayName || null, email: u.email || null, isAdmin });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        });


        // Safety: if the auth callback never fires, avoid leaving the UI
        // stuck in loading state indefinitely by clearing after 5s.
        const safety = setTimeout(() => setLoading(false), 5000);

        return () => {
            clearTimeout(safety);
            unsub();
        };
    }, []);

    async function loginWithGoogle() {
        // Show a transient loading state while the popup/redirect is active.
        setLoading(true);
        try {
            const ok = await signInWithGoogle();
            return ok;
        } finally {
            // Actual sign-in will be reflected via the auth state listener.
            setLoading(false);
        }
    }

    async function logout() {
        await firebaseSignOut();
        setUser(null);
        // Ensure we don't remain in a loading state after an explicit logout.
        setLoading(false);
    }

    const value: UserContextValue = { user, loading, loginWithGoogle, logout };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserProvider;
