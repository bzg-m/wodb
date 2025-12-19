import { render, waitFor } from '@testing-library/preact';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ComponentChildren, h } from 'preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it, vi } from 'vitest';

import ViewPage from '../src/pages/Set/View';
import { UserProvider } from '../src/UserContext';

// Mock UserContext with a simple provider exposing a logged-in user.
vi.mock('../src/UserContext', async () => {
    const preact = await import('preact');
    const hooks = await import('preact/hooks');
    const { createContext } = preact;
    const { useState, useContext } = hooks;

    const UserContext = createContext(undefined);

    function UserProvider({ children }: { children: ComponentChildren }) {
        const [user] = useState({ uid: 'u1', email: 'user@example.com' });
        const value = { user, loading: false, logout: async () => { } };
        return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
    }

    function useUser() {
        const ctx = useContext(UserContext);
        if (!ctx) throw new Error('useUser must be used within UserProvider');
        return ctx;
    }

    return { UserProvider, useUser };
});

describe('ViewPage', () => {
    it('shows message when user has no accepted annotation', async () => {
        vi.mock('../src/api', () => ({
            fetchSetById: async (_: string) => ({
                id: 'set-1',
                title: 'Test Set',
                description: 'desc',
                objects: [
                    { id: 'o1', type: 'text', value: 'Obj 1' },
                    { id: 'o2', type: 'text', value: 'Obj 2' },
                ],
            }),
            fetchUserAnnotationsForSet: async () => [],
            fetchVisibleAnnotationsForUserInSet: async () => [],
        }));

        const { findByText, container } = render(
            <LocationProvider>
                <UserProvider>
                    <ViewPage />
                </UserProvider>
            </LocationProvider>
        );

        await waitFor(() => {
            const items = container.querySelectorAll('[data-grid-item]');
            expect(items.length).toBeGreaterThanOrEqual(1);
        });

        const el = await findByText(/You do not have an accepted annotation for this set/);
        expect(el).toBeTruthy();
    });

    it('shows visible annotations when user has accepted annotation', async () => {
        vi.mock('../src/api', () => ({
            fetchSetById: async (_: string) => ({
                id: 'set-1',
                title: 'Test Set',
                description: 'desc',
                objects: [{ id: 'o1', type: 'text', value: 'Obj 1' }],
            }),
            fetchUserAnnotationsForSet: async () => [
                { id: 'a1', setId: 'set-1', objectId: 'o1', userId: 'u1', text: 'mine', status: 'accepted', visibility: 'private' },
            ],
            fetchVisibleAnnotationsForUserInSet: async () => [
                { id: 'v1', setId: 'set-1', objectId: 'o1', userId: 'u2', text: 'Nice annotation', status: 'accepted', visibility: 'public' },
            ],
        }));

        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <ViewPage />
                </UserProvider>
            </LocationProvider>
        );

        await waitFor(() => {
            expect(container.textContent).toContain('Visible annotations');
            expect(container.textContent).toContain('Nice annotation');
        });
    });
});
