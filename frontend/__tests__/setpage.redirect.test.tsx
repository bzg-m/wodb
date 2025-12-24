import { render, waitFor } from '@testing-library/preact';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ComponentChildren, h } from 'preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it, vi } from 'vitest';

import SetPage from '../src/pages/Set/index';
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

describe('SetPage redirect for anonymous users', () => {
    it('redirects to view page when no user', async () => {
        window.history.pushState({}, '', '/set/set-1');

        // Replace the global location object temporarily so we can intercept replace() calls
        const originalLocation = window.location;
        // @ts-expect-error assign for test
        window.location = { ...originalLocation, replace: vi.fn() } as unknown as Location;

        render(
            <LocationProvider>
                <UserProvider>
                    <SetPage />
                </UserProvider>
            </LocationProvider>
        );

        await waitFor(() => {
            // @ts-expect-error replace exists on the mocked location
            expect(window.location.replace).toHaveBeenCalledWith('/set/set-1/view');
        });

        // Restore original location
        // @ts-expect-error restore for test
        window.location = originalLocation;
    });
});
