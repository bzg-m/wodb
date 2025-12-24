import { fireEvent, render, waitFor } from '@testing-library/preact';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ComponentChildren, h } from 'preact';
import { LocationProvider } from 'preact-iso';
import { describe, expect, it, vi } from 'vitest';

import SetPage from '../src/pages/Set/index';
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchSetById: async (id: string) => ({
        id: 'set-1',
        title: 'Test Set',
        description: 'desc',
        objects: [
            { id: 'o1', type: 'text', value: 'Obj 1' },
            { id: 'o2', type: 'text', value: 'Obj 2' },
            { id: 'o3', type: 'text', value: 'Obj 3' },
            { id: 'o4', type: 'text', value: 'Obj 4' },
        ],
    }),
    fetchUserAnnotationsForSet: async () => [],
    fetchVisibleAnnotationsForUserInSet: async () => [],
    fetchUserNames: async () => ({}),
    createOrUpdateAnnotation: async () => ({}),
    removeAnnotation: async () => ({}),
    sendRequestReview: async () => ({}),
}));

describe('SetPage keyboard navigation', () => {
    it('updates selection when navigating with arrow keys and focus changes', async () => {
        const { container } = render(
            <LocationProvider>
                <UserProvider>
                    <SetPage />
                </UserProvider>
            </LocationProvider>
        );

        // Wait until the grid items render
        await waitFor(() => {
            const items = container.querySelectorAll('[data-grid-item]');
            expect(items.length).toBeGreaterThanOrEqual(4);
        });

        const items = Array.from(container.querySelectorAll<HTMLElement>('[data-grid-item]'));

        // Focus the first item — this should set selection to o1 via onFocus
        items[0].focus();
        await waitFor(() => {
            expect(container.textContent).toContain('New annotation for A');
        });

        // Press ArrowRight to move to o2
        fireEvent.keyDown(items[0], { key: 'ArrowRight' });
        await waitFor(() => {
            expect(container.textContent).toContain('New annotation for B');
        });

        // Press ArrowDown from o2 (index 1) -> should move to index 3 (o4)
        fireEvent.keyDown(items[1], { key: 'ArrowDown' });
        await waitFor(() => {
            expect(container.textContent).toContain('New annotation for D');
        });

        // Simulate tabbing by focusing the next element programmatically — focus should update selection
        items[2].focus();
        await waitFor(() => {
            expect(container.textContent).toContain('New annotation for C');
        });
    });
});

describe('SetPage', () => {
    it('renders not found when no set', async () => {
        // Override the mocked API for this test to simulate missing set
        // Import the module and replace the implementation for fetchSetById.
        const api = await import('../src/api');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        api.fetchSetById = async (_: string) => undefined;

        const { findByText } = render(
            <LocationProvider>
                <UserProvider>
                    <SetPage />
                </UserProvider>
            </LocationProvider>
        );
        const el = await findByText(/Set not found/);
        expect(el).toBeTruthy();
    });
});
