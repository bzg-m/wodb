import { render, waitFor } from '@testing-library/preact';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ComponentChildren, h } from 'preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it, vi } from 'vitest';

import ViewPage from '../src/pages/Set/View';
import { UserProvider } from '../src/UserContext';

// Mock UserContext to simulate an anonymous (not signed-in) user.
vi.mock('../src/UserContext', async () => {
    const preact = await import('preact');
    const hooks = await import('preact/hooks');
    const { createContext } = preact;
    const { useState, useContext } = hooks;

    const UserContext = createContext(undefined);

    function UserProvider({ children }: { children: ComponentChildren }) {
        const [user] = useState(null);
        const value = { user, loading: false };
        return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
    }

    function useUser() {
        const ctx = useContext(UserContext);
        if (!ctx) throw new Error('useUser must be used within UserProvider');
        return ctx;
    }

    return { UserProvider, useUser };
});

vi.mock('../src/api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchSetById: async (_: string) => ({
        id: 'set-1',
        title: 'Test Set',
        description: 'desc',
        objects: [{ id: 'o1', type: 'text', value: 'Obj 1' }],
    }),
    fetchUserAnnotationsForSet: async () => [],
    fetchVisibleAnnotationsForUserInSet: async () => [],
}));

describe('ViewPage (anonymous)', () => {
    it('shows login prompt and does not show visible annotations', async () => {
        // Ensure the location contains a set id used by the components
        window.history.pushState({}, '', '/set/set-1');

        const { findByText, queryByText } = render(
            <LocationProvider>
                <UserProvider>
                    <ViewPage />
                </UserProvider>
            </LocationProvider>
        );

        await findByText(/Log in to make annotations or view others' visible annotations/);

        await waitFor(() => {
            expect(queryByText(/Visible annotations/)).toBeNull();
        });
    });
});
