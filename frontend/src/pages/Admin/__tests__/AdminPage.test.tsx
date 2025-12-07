import { describe, it, expect, vi } from 'vitest';
import loadAdminAnnotations from '../loadAdminAnnotations';

describe('loadAdminAnnotations', () => {
    it('aggregates pending and accepted annotations across sets', async () => {
        const fetchSets = vi.fn(async () => [{ id: 'set-1', title: 'Set One' }]);
        const fetchAllAnnotationsForSet = vi.fn(async (setId: string) => [
            { id: 'a1', setId, objectId: 'o1', text: 'Pending annotation', userId: 'userA', status: 'pending', visibility: 'group' },
            { id: 'a2', setId, objectId: 'o2', text: 'Accepted annotation', userId: 'userB', status: 'accepted', visibility: 'group' },
        ]);

        const { sets, pending, accepted } = await loadAdminAnnotations(fetchSets as any, fetchAllAnnotationsForSet as any);

        expect(sets).toHaveLength(1);
        expect(pending).toHaveLength(1);
        expect(pending[0].text).toBe('Pending annotation');
        expect(accepted).toHaveLength(1);
        expect(accepted[0].text).toBe('Accepted annotation');
        expect(fetchSets).toHaveBeenCalledOnce();
        expect(fetchAllAnnotationsForSet).toHaveBeenCalledWith('set-1');
    });
});
