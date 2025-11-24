import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';

// Mock preact-iso useLocation to provide the /set/set1 URL
vi.mock('preact-iso', () => ({ useLocation: () => ({ url: '/set/set1' }) }));

// Hoisted mocks for modules used by SetPage
const mocks = vi.hoisted(() => ({
    getSetById: vi.fn((id: string) => ({
        id: 'set1', title: 'Set 1', description: '', objects: [
            { id: 'o1', type: 'text', value: 'A' },
            { id: 'o2', type: 'text', value: 'B' },
            { id: 'o3', type: 'text', value: 'C' },
            { id: 'o4', type: 'text', value: 'D' },
        ]
    })),
    fetchUserAnnotationsForSet: vi.fn(async (userId: string, setId: string) => []),
    createOrUpdateAnnotation: vi.fn(async (a: any) => ({ id: 'n1', ...a })),
    removeAnnotation: vi.fn(async (id: string) => true),
    sendRequestReview: vi.fn(async (userId: string, setId: string) => []),
    fetchVisibleAnnotationsForUserInSet: vi.fn(async (userId: string, setId: string) => []),
}));

vi.mock('../dataStore', () => ({ getSetById: mocks.getSetById }));
vi.mock('../api', () => ({
    fetchUserAnnotationsForSet: mocks.fetchUserAnnotationsForSet,
    createOrUpdateAnnotation: mocks.createOrUpdateAnnotation,
    removeAnnotation: mocks.removeAnnotation,
    sendRequestReview: mocks.sendRequestReview,
    fetchVisibleAnnotationsForUserInSet: mocks.fetchVisibleAnnotationsForUserInSet,
}));

import { SetPage } from '../pages/Set/index';
import { UserProvider } from '../UserContext';

describe('SetPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // stub localStorage and set a normal user
        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => (k in store ? store[k] : null),
            setItem: (k: string, v: string) => (store[k] = String(v)),
            removeItem: (k: string) => delete store[k],
            clear: () => {
                for (const k in store) delete store[k];
            },
        } as any);
        localStorage.setItem('wodb_user', JSON.stringify({ id: 'u1', name: 'Alice', isAdmin: false }));
    });

    it('saves a draft annotation when Save Draft clicked', async () => {
        const { findByText, findByRole } = render(
            <UserProvider>
                <SetPage />
            </UserProvider>
        );

        // select the first object by clicking its button
        const objBtn = await findByRole('button', { name: 'A' });
        await userEvent.click(objBtn);

        // type into textarea
        const textarea = (await findByRole('textbox')) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'My note');

        const saveBtn = await findByText(/Save Draft/i);
        await userEvent.click(saveBtn);

        expect(mocks.createOrUpdateAnnotation).toHaveBeenCalled();
    });

    it('shows reflection toggle when user has accepted annotation', async () => {
        // make fetchUserAnnotationsForSet return an accepted annotation so hasAccepted is true
        mocks.fetchUserAnnotationsForSet.mockResolvedValueOnce([
            { id: 'a1', setId: 'set1', objectId: 'o1', userId: 'u1', text: 'accepted', status: 'accepted', visibility: 'group' },
        ]);

        const { findByText } = render(
            <UserProvider>
                <SetPage />
            </UserProvider>
        );

        const toggle = await findByText(/Enter Reflection View/i);
        expect(toggle).toBeTruthy();

        // clicking should call fetchVisibleAnnotationsForUserInSet because effect depends on reflectionMode
        await userEvent.click(toggle);
        expect(mocks.fetchVisibleAnnotationsForUserInSet).toHaveBeenCalledWith('u1', 'set1');
    });
});
