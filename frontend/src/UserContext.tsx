import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import {
    getIdToken,
    isFirebaseConfigured,
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
        if (!isFirebaseConfigured()) {
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
                await getIdToken(); // warm token, ignore value here
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
                if (isSignInLink(url)) {
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

        return () => unsub();
    }, []);

    async function loginWithEmailLink(email: string) {
        await sendSignInLink(email);
        localStorage.setItem('wodb:emailForSignIn', email);
    }

    async function logout() {
        await firebaseSignOut();
        setUser(null);
    }

    const value: UserContextValue = { user, loading, loginWithEmailLink, logout };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserProvider;
