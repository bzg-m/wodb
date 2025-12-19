import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

import { useUser } from '../UserContext';

export function Header() {
    const { url } = useLocation();
    const { user, loading, loginWithGoogle, logout } = useUser();
    const [googleSigning, setGoogleSigning] = useState(false);
    async function handleGoogleSignIn() {
        try {
            setGoogleSigning(true);
            await loginWithGoogle();
        } finally {
            setGoogleSigning(false);
        }
    }

    return (
        <header>
            <nav>
                <a href="/" class={url == '/' ? 'active' : ''}>Home</a>
                {user && user.isAdmin && <a href="/admin" class={url == '/admin' ? 'active' : ''}>Admin</a>}
            </nav>
            <div class="auth">
                {loading ? (
                    <span>Loading...</span>
                ) : user ? (
                    <div class="user">
                        <span>{user.name || user.email || user.uid}</span>
                        <button onClick={() => logout()}>Log out</button>
                    </div>
                ) : (
                    <div class="login-form">
                        <button type="button" class="ml-2" onClick={() => handleGoogleSignIn()} disabled={googleSigning}>{googleSigning ? 'Signing in…' : 'Sign in with Google'}</button>
                    </div>
                )}
            </div>
        </header>
    );
}
