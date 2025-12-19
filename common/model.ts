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
