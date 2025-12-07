import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

// Mock the UserContext with a provider we can control in-test. The provider
// exposes a logout button we can click to simulate sign-out.
vi.mock('../src/UserContext', async () => {
    const preact = await import('preact');
    const hooks = await import('preact/hooks');
    const { createContext, h } = preact;
    const { useState, useContext } = hooks;

    const UserContext = createContext(undefined as any);

    function UserProvider({ children }: any) {
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

    return { UserProvider, useUser } as any;
});

// Mock API functions used by SetPage so we can assert behavior deterministically.
vi.mock('../src/api', () => ({
    fetchSetById: async (_id: string) => ({
        id: 'set-1',
        title: 'Test Set',
        description: 'desc',
        objects: [
            { id: 'o1', type: 'text', value: 'Obj 1' },
            { id: 'o2', type: 'text', value: 'Obj 2' },
        ],
    }),
    fetchUserAnnotationsForSet: async (_setId: string) => [
        { id: 'a1', objectId: 'o1', text: 'one', userId: 'u1', status: 'accepted', setId: 'set-1', visibility: 'private' },
    ],
    fetchVisibleAnnotationsForUserInSet: async (_setId: string) => [
        { id: 'v1', objectId: 'o1', text: 'public one', userId: 'other', status: 'accepted', setId: 'set-1', visibility: 'public' },
    ],
    createOrUpdateAnnotation: async () => ({}),
    removeAnnotation: async () => ({}),
    sendRequestReview: async () => ({}),
}));

import { h } from 'preact';
import { UserProvider } from '../src/UserContext';
import SetPage from '../src/pages/Set/index';
import { LocationProvider } from 'preact-iso';

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
