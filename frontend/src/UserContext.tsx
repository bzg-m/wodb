import { createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';

export interface AuthUser {
    id: string;
    name: string;
    isAdmin: boolean;
    // In a real Firebase setup we'd include more metadata (email, uid, token, etc.)
}

interface UserContextValue {
    user: AuthUser | null;
    loading: boolean;
    loginWithEmailLink: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// Simple mapping helper to pick a stub user based on email contents.
function pickStubUserFromEmail(email: string): AuthUser {
    const lc = email.toLowerCase();
    if (lc.includes('admin')) return { id: 'admin', name: 'Admin', isAdmin: true };
    if (lc.includes('bob')) return { id: 'u2', name: 'Bob', isAdmin: false };
    // default to Alice
    return { id: 'u1', name: 'Alice', isAdmin: false };
}

export function UserProvider(props: { children: preact.ComponentChildren }): preact.JSX.Element {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Persist the logged-in user id in localStorage so the stub persists across reloads.
    useEffect(() => {
        const raw = localStorage.getItem('wodb_user');
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as AuthUser;
                setUser(parsed);
            } catch (e) {
                localStorage.removeItem('wodb_user');
            }
        }
        setLoading(false);
    }, []);

    async function loginWithEmailLink(email: string) {
        // Stubbed: in production we'd trigger Firebase email link flow and wait for confirmation.
        setLoading(true);
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 300));
        const stub = pickStubUserFromEmail(email);
        setUser(stub);
        localStorage.setItem('wodb_user', JSON.stringify(stub));
        setLoading(false);
    }

    async function logout() {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 150));
        setUser(null);
        localStorage.removeItem('wodb_user');
        setLoading(false);
    }

    const value: UserContextValue = { user, loading, loginWithEmailLink, logout };
    return <UserContext.Provider value={value}>{props.children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within a UserProvider');
    return ctx;
}
