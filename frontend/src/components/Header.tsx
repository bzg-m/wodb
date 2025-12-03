import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useUser } from '../UserContext';

export function Header() {
    const { url } = useLocation();
    const { user, loading, loginWithEmailLink, logout } = useUser();
    const [email, setEmail] = useState('');
    const [sentMessage, setSentMessage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function handleLogin(e: Event) {
        e.preventDefault();
        if (!email) return;
        try {
            setSending(true);
            await loginWithEmailLink(email);
            setSentMessage('Check your email — sign-in link sent.');
            setEmail('');
        } catch (err) {
            setSentMessage('Failed to send sign-in link.');
        } finally {
            setSending(false);
            setTimeout(() => setSentMessage(null), 8000);
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
                    <form onSubmit={handleLogin} class="login-form">
                        <input type="email" placeholder="you@example.com" value={email} onInput={(e: Event) => setEmail((e.target as HTMLInputElement).value)} />
                        <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Sign in'}</button>
                        {sentMessage && <div class="text-sm text-green-600 mt-1">{sentMessage}</div>}
                    </form>
                )}
            </div>
        </header>
    );
}
