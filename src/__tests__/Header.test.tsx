import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { Header } from '../components/Header';
import { UserProvider } from '../UserContext';

describe('Header', () => {
    beforeEach(() => {
        // Provide a simple localStorage mock for the test environment
        const store: Record<string, string> = {};
        const mock = {
            getItem: (k: string) => (k in store ? store[k] : null),
            setItem: (k: string, v: string) => (store[k] = String(v)),
            removeItem: (k: string) => delete store[k],
            clear: () => {
                for (const k in store) delete store[k];
            },
        };
        // ensure global/local storage is stubbed
        vi.stubGlobal('localStorage', mock as unknown);
    });

    it('shows login form when not signed in', () => {
        const { container } = render(
            <UserProvider>
                <Header />
            </UserProvider>
        );
        expect(container.querySelector('.login-form')).toBeTruthy();
        expect(screen.getByPlaceholderText(/you@example.com/i)).toBeTruthy();
    });

    it('shows admin link for admin user', async () => {
        localStorage.setItem('wodb_user', JSON.stringify({ id: 'admin', name: 'Admin', isAdmin: true }));
        const { findByRole } = render(
            <UserProvider>
                <Header />
            </UserProvider>
        );
        // admin link should be present
        const adminLink = await findByRole('link', { name: /admin/i });
        expect(adminLink).toBeTruthy();
    });
});
