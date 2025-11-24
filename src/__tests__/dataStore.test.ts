import { describe, it, expect, beforeEach } from 'vitest';
import * as ds from '../dataStore';
import { annotations } from '../data';

describe('dataStore visibility helpers', () => {
    beforeEach(() => {
        // reset annotations array to known state
        annotations.length = 0;
        annotations.push(
            // user u1 has an accepted annotation in set1
            {
                id: 'a1',
                setId: 'set1',
                objectId: 'o1',
                userId: 'u1',
                text: 'one',
                status: 'accepted',
                visibility: 'group',
            },
            // user u2 has a public annotation
            {
                id: 'a2',
                setId: 'set1',
                objectId: 'o2',
                userId: 'u2',
                text: 'two',
                status: 'accepted',
                visibility: 'public',
            },
            // draft annotation for u1
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
        // u2 should see group a1 (group-visible accepted) and public a2
        expect(ids).toEqual(['a1', 'a2'].sort());
    });
});
