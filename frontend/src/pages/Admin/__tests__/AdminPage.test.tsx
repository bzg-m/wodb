import { describe, expect, it, vi } from 'vitest';

import type { Annotation, WODBSet } from '../../../../../common/model.js';
import loadAdminAnnotations from '../loadAdminAnnotations';

describe('loadAdminAnnotations', () => {
    it('aggregates pending and accepted annotations across sets', async () => {
        const fetchSets = vi.fn(async () => [{ id: 'set-1', title: 'Set One' } as WODBSet]);
        const fetchAllAnnotationsForSet = vi.fn(async (setId: string) => [
            { id: 'a1', setId, objectId: 'o1', text: 'Pending annotation', userId: 'userA', status: 'pending', visibility: 'group' } as Annotation,
            { id: 'a2', setId, objectId: 'o2', text: 'Accepted annotation', userId: 'userB', status: 'accepted', visibility: 'group' } as Annotation,
        ]);

        const { sets, pending, accepted } = await loadAdminAnnotations(fetchSets, fetchAllAnnotationsForSet);

        expect(sets).toHaveLength(1);
        expect(pending).toHaveLength(1);
        expect(pending[0].text).toBe('Pending annotation');
        expect(accepted).toHaveLength(1);
        expect(accepted[0].text).toBe('Accepted annotation');
        expect(fetchSets).toHaveBeenCalledOnce();
        expect(fetchAllAnnotationsForSet).toHaveBeenCalledWith('set-1');
    });
});
