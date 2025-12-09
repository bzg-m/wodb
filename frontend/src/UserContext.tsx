import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import {
    getIdToken,
    isFirebasePresent,
    signInWithGoogle,
    sendSignInLink,
    isSignInLink,
    completeSignInWithEmailLink,
    firebaseSignOut,
    onFirebaseAuthStateChanged,
} from './firebase';

type User = { uid: string; name?: string | null; email?: string | null; isAdmin?: boolean } | null;

interface UserContextValue {
    user: User;
    loading: boolean;
    loginWithEmailLink(email: string): Promise<void>;
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

        const unsub = onFirebaseAuthStateChanged(async (u: any) => {
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
                        .then((ir: any) => !!(ir && ir.claims && ir.claims.isAdmin))
                        .catch(() => false);
                }
                setUser({ uid: u.uid, name: u.displayName || null, email: u.email || null, isAdmin });
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        // Handle email-link sign-in flow on mount
        (async () => {
            try {
                const url = window.location.href;
                if (await isSignInLink(url)) {
                    const storedEmail = localStorage.getItem('wodb:emailForSignIn');
                    if (storedEmail) {
                        const ok = await completeSignInWithEmailLink(storedEmail, url);
                        if (ok) {
                            localStorage.removeItem('wodb:emailForSignIn');
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    }
                }
            } catch (err) {
                // ignore
            }
        })();

        // Safety: if the auth callback never fires, avoid leaving the UI
        // stuck in loading state indefinitely by clearing after 5s.
        const safety = setTimeout(() => setLoading(false), 5000);

        return () => {
            clearTimeout(safety);
            unsub();
        };
    }, []);

    async function loginWithEmailLink(email: string) {
        await sendSignInLink(email);
        localStorage.setItem('wodb:emailForSignIn', email);
    }

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

    const value: UserContextValue = { user, loading, loginWithEmailLink, loginWithGoogle, logout };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserProvider;
