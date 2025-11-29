import { describe, it, expect, beforeEach } from 'vitest';
import * as ds from '../src/dataStore.js';
import { annotations } from '../src/data.js';

describe('dataStore visibility helpers', () => {
    beforeEach(() => {
        annotations.length = 0;
        annotations.push(
            {
                id: 'a1',
                setId: 'set1',
                objectId: 'o1',
                userId: 'u1',
                text: 'one',
                status: 'accepted',
                visibility: 'group',
            },
            {
                id: 'a2',
                setId: 'set1',
                objectId: 'o2',
                userId: 'u2',
                text: 'two',
                status: 'accepted',
                visibility: 'public',
            },
            {
                id: 'a3',
                setId: 'set1',
                objectId: 'o3',
                userId: 'u1',
                text: 'three',
                status: 'draft',
                visibility: 'private',
            }
        );
    });

    it('returns public and group annotations appropriately for user who has accepted', () => {
        const visForU1 = ds.getVisibleAnnotationsForUserInSet('u1', 'set1');
        const ids = visForU1.map((a) => a.id).sort();
        expect(ids).toEqual(['a1', 'a2', 'a3'].sort());
    });

    it('returns only public and own annotations for user without accepted', () => {
        const visForU2 = ds.getVisibleAnnotationsForUserInSet('u2', 'set1');
        const ids = visForU2.map((a) => a.id).sort();
        expect(ids).toEqual(['a1', 'a2'].sort());
    });
});
