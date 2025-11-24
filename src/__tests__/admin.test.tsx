import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { UserProvider } from '../UserContext';

// Mock the API used by AdminPage
const mocks = vi.hoisted(() => {
    return {
        fetchSets: vi.fn(async () => [{ id: 'set1', title: 'Set 1', description: '', objects: [] }]),
        fetchAnnotationsForSet: vi.fn(async (setId: string) => [
            { id: 'p1', setId: 'set1', objectId: 'o1', userId: 'u1', text: 'pending annotation', status: 'pending', visibility: 'private' },
        ]),
        updateAnnotationStatus: vi.fn(async (id: string, status: string) => ({ id, status })),
        updateAnnotationVisibility: vi.fn(async (id: string, visibility: string) => ({ id, visibility }))
    }
});

vi.mock('../api', () => ({
    fetchSets: mocks.fetchSets,
    fetchAnnotationsForSet: mocks.fetchAnnotationsForSet,
    updateAnnotationStatus: mocks.updateAnnotationStatus,
    updateAnnotationVisibility: mocks.updateAnnotationVisibility,
}));

import { AdminPage } from '../pages/Admin/index';

describe('AdminPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // stub localStorage for UserProvider
        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => (k in store ? store[k] : null),
            setItem: (k: string, v: string) => (store[k] = String(v)),
            removeItem: (k: string) => delete store[k],
            clear: () => {
                for (const k in store) delete store[k];
            },
        } as any);
        // set admin user
        localStorage.setItem('wodb_user', JSON.stringify({ id: 'admin', name: 'Admin', isAdmin: true }));
    });

    it('renders pending annotation and calls accept on click', async () => {
        const { findByText } = render(
            <UserProvider>
                <AdminPage />
            </UserProvider>
        );

        // Wait for the pending row to appear
        const acceptBtn = await findByText(/Accept/i);
        expect(acceptBtn).toBeTruthy();

        await userEvent.click(acceptBtn);
        expect(mocks.updateAnnotationStatus).toHaveBeenCalledWith('p1', 'accepted');
    });

    it('calls makePublic flow on Make Public click', async () => {
        const { findByText } = render(
            <UserProvider>
                <AdminPage />
            </UserProvider>
        );
        const makePublicBtn = await findByText(/Make Public/i);
        expect(makePublicBtn).toBeTruthy();

        await userEvent.click(makePublicBtn);
        // makePublic should accept then promote visibility
        expect(mocks.updateAnnotationStatus).toHaveBeenCalledWith('p1', 'accepted');
        expect(mocks.updateAnnotationVisibility).toHaveBeenCalledWith('p1', 'public');
    });
});
