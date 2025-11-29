export type ObjectType = 'number' | 'equation' | 'graph' | 'shape' | 'text' | 'image';

export interface WODBObject {
    id: string;
    type: ObjectType;
    value: string; // Could be LaTeX, text, or image URL
}

export interface WODBSet {
    id: string;
    title: string;
    description?: string;
    objects: WODBObject[]; // Always length 4
}

export type AnnotationStatus = 'draft' | 'pending' | 'accepted' | 'rejected';
export type AnnotationVisibility = 'private' | 'group' | 'public';

export interface Annotation {
    id: string;
    setId: string;
    objectId: string;
    userId: string;
    text: string;
    status: AnnotationStatus;
    visibility: AnnotationVisibility;
}

// Hardcoded sample data
export const users: { id: string; name: string; isAdmin: boolean }[] = [
    { id: 'u1', name: 'Alice', isAdmin: false },
    { id: 'u2', name: 'Bob', isAdmin: false },
    { id: 'admin', name: 'Admin', isAdmin: true },
];

export const wodbSets: WODBSet[] = [
    {
        id: 'set1',
        title: 'Numbers',
        description: 'Which number does not belong?',
        objects: [
            { id: 'o1', type: 'number', value: '0' },
            { id: 'o2', type: 'number', value: '-3' },
            { id: 'o3', type: 'number', value: '4' },
            { id: 'o4', type: 'number', value: '6.0' },
        ],
    },
    {
        id: 'set2',
        title: 'Shapes',
        description: 'Which shape does not belong?',
        objects: [
            { id: 'o5', type: 'shape', value: 'square' },
            { id: 'o6', type: 'shape', value: 'circle' },
            { id: 'o7', type: 'shape', value: 'cube' },
            { id: 'o8', type: 'shape', value: 'star' },
        ],
    },
];

export let annotations: Annotation[] = [];
