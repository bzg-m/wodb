import { render, waitFor } from '@testing-library/preact';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ComponentChildren, h } from 'preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it, vi } from 'vitest';

import AdminPage from '../src/pages/Admin/index';
import { UserProvider } from '../src/UserContext';

vi.mock('../src/UserContext', async () => {
    const preact = await import('preact');
    const hooks = await import('preact/hooks');
    const { createContext } = preact;
    const { useState, useContext } = hooks;

    const UserContext = createContext(undefined);

    function UserProvider({ children }: { children: ComponentChildren }) {
        const [user] = useState({ uid: 'admin', email: 'admin@example.com', isAdmin: true });
        const value = { user, loading: false, loginWithEmailLink: async () => { }, logout: async () => { } };
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
    fetchSets: async () => [
        {
            id: 's1',
            title: 'Set One',
            description: 'desc',
            objects: [
                { id: 'o1', type: 'text', value: 'Obj 1' },
                { id: 'o2', type: 'text', value: 'Obj 2' },
                { id: 'o3', type: 'text', value: 'Obj 3' },
                { id: 'o4', type: 'text', value: 'Obj 4' },
            ],
        },
    ],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchAllAnnotationsForSet: async (setId: string) => [
        // pending
        { id: 'a1', setId: 's1', objectId: 'o1', userId: 'u2', text: 'Pending annotation', status: 'pending', visibility: 'private' },
        // accepted
        { id: 'a2', setId: 's1', objectId: 'o2', userId: 'u3', text: 'Accepted annotation', status: 'accepted', visibility: 'group' },
    ],
    fetchUserNames: async (ids: string[]) => {
        const res: Record<string, { name?: string | null }> = {};
        for (const id of ids) {
            if (id === 'u2') res[id] = { name: 'User Two' };
            if (id === 'u3') res[id] = { name: 'User Three' };
        }
        return res;
    },
    updateAnnotationStatus: async () => ({}),
    updateAnnotationVisibility: async () => ({}),
}));

describe('AdminPage (labels + object ids)', () => {
    it('renders pending and accepted annotations with labels and user names', async () => {
        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <AdminPage />
                </UserProvider>
            </LocationProvider>
        );

        await waitFor(() => {
            // pending row should show label A (o1) and user name
            expect(container.textContent).toContain('A (o1)');
            expect(container.textContent).toContain('User Two (u2)');
            // accepted row should show label B (o2) and user name
            expect(container.textContent).toContain('B (o2)');
            expect(container.textContent).toContain('User Three (u3)');
        });
    });
});
