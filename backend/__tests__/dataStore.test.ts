import { describe, it, expect, beforeEach, vi } from 'vitest';
import { annotations } from '../src/data.js';

// Mock the AnnotationModel used by dataStore so tests operate on the in-memory
// `annotations` array instead of requiring a MongoDB connection.
vi.mock('../src/models/annotation.js', () => {
    return {
        default: {
            find: (filter: any) => ({ exec: async () => annotations.filter((a: any) => a.setId === filter.setId).map((a: any) => ({ toJSON: () => a })) }),
            findOne: (filter: any) => ({
                exec: async () => {
                    const found = annotations.find((a: any) => Object.keys(filter).every((k) => (filter as any)[k] === (a as any)[k]));
                    return found ? { toJSON: () => found } : null;
                }
            }),
            // findById and findByIdAndUpdate / create are not used by these tests
        },
    };
});

import * as ds from '../src/dataStore.js';

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

    it('returns public and group annotations appropriately for user who has accepted', async () => {
        const visForU1 = await ds.getVisibleAnnotationsForUserInSet('u1', 'set1');
        const ids = visForU1.map((a) => a.id).sort();
        expect(ids).toEqual(['a1', 'a2', 'a3'].sort());
    });

    it('returns only public and own annotations for user without accepted', async () => {
        const visForU2 = await ds.getVisibleAnnotationsForUserInSet('u2', 'set1');
        const ids = visForU2.map((a) => a.id).sort();
        expect(ids).toEqual(['a1', 'a2'].sort());
    });
});
