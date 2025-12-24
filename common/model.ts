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

// Labels for object positions within a set (top-left, top-right, bottom-left, bottom-right)
export const LABELS = ['A', 'B', 'C', 'D'];

export function labelForIndex(idx: number): string {
    return LABELS[idx] ?? String(idx + 1);
}

export function labelForObjectId(set: WODBSet | null, objId: string | null): string | null {
    if (!set || !objId) return objId;
    const idx = set.objects.findIndex((o) => o.id === objId);
    return idx >= 0 ? labelForIndex(idx) : objId;
}
