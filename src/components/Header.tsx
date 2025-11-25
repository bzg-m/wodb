import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useUser } from '../UserContext';

export function Header() {
	const { url } = useLocation();
	const { user, loading, loginWithEmailLink, logout } = useUser();
	const [email, setEmail] = useState('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		if (!email) return;
		await loginWithEmailLink(email);
		setEmail('');
	}

	return (
		<header>
			<nav>
				<a href="/" class={url == '/' ? 'active' : ''}>
					Home
				</a>
				{user && user.isAdmin && (
					<a href="/admin" class={url == '/admin' ? 'active' : ''}>
						Admin
					</a>
				)}
			</nav>

			<div class="auth">
				{loading ? (
					<span>Loading...</span>
				) : user ? (
					<div class="user">
						<span>{user.name}</span>
						<button onClick={() => logout()}>Log out</button>
					</div>
				) : (
					<form onSubmit={handleLogin} class="login-form">
						<input
							type="email"
							placeholder="you@example.com"
							value={email}
							onInput={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
						/>
						<button type="submit">Sign in</button>
					</form>
				)}
			</div>
		</header>
	);
}
