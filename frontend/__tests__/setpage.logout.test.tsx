import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import type { ComponentChildren } from 'preact';
import { describe, expect, it, vi } from 'vitest';

// Mock the UserContext with a provider we can control in-test. The provider
// exposes a logout button we can click to simulate sign-out.
vi.mock('../src/UserContext', async () => {
    const preact = await import('preact');
    const hooks = await import('preact/hooks');
    const { createContext } = preact;
    const { useState, useContext } = hooks;

    const UserContext = createContext(undefined);

    function UserProvider({ children }: { children: ComponentChildren }) {
        const [user, setUser] = useState({ uid: 'u1', email: 'user@example.com' });
        const logout = async () => setUser(null);
        const value = { user, loading: false, loginWithEmailLink: async () => { }, logout };
        return (
            <UserContext.Provider value={value}>
                {children}
                <button data-testid="test-logout" onClick={() => void logout()}>logout</button>
            </UserContext.Provider>
        );
    }

    function useUser() {
        const ctx = useContext(UserContext);
        if (!ctx) throw new Error('useUser must be used within UserProvider');
        return ctx;
    }

    return { UserProvider, useUser };
});

// Mock API functions used by SetPage so we can assert behavior deterministically.
vi.mock('../src/api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchSetById: async (id: string) => ({
        id: 'set-1',
        title: 'Test Set',
        description: 'desc',
        objects: [
            { id: 'o1', type: 'text', value: 'Obj 1' },
            { id: 'o2', type: 'text', value: 'Obj 2' },
        ],
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchUserAnnotationsForSet: async (setId: string) => [
        { id: 'a1', objectId: 'o1', text: 'one', userId: 'u1', status: 'accepted', setId: 'set-1', visibility: 'private' },
    ],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchVisibleAnnotationsForUserInSet: async (setId: string) => [
        { id: 'v1', objectId: 'o1', text: 'public one', userId: 'other', status: 'accepted', setId: 'set-1', visibility: 'public' },
    ],
    createOrUpdateAnnotation: async () => ({}),
    removeAnnotation: async () => ({}),
    sendRequestReview: async () => ({}),
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import { LocationProvider } from 'preact-iso';

import SetPage from '../src/pages/Set/index';
import { UserProvider } from '../src/UserContext';

describe('SetPage logout behavior', () => {
    it('clears user annotations and exits reflection view on logout', async () => {
        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <SetPage />
                </UserProvider>
            </LocationProvider>
        );

        // Wait for the set to render (table present)
        await waitFor(() => {
            expect(container.querySelector('table')).toBeTruthy();
        });

        // Trigger logout via the hidden test button we added in our mock provider
        const logoutBtn = screen.getByTestId('test-logout');
        fireEvent.click(logoutBtn);

        // After logout, assert reflection section is not present and user text removed
        await waitFor(() => {
            expect(container.textContent).not.toContain('Reflection — visible annotations');
        });
        // The table should show 'No annotations' for objects when logged out
        expect(container.textContent).toContain('No annotations');
    });
});
