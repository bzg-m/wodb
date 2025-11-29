import type { WODBSet, Annotation, AnnotationVisibility } from './data';

const BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:4000';

async function req(path: string, opts: RequestInit = {}) {
    const url = `${BASE}${path}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
}

export async function fetchSets(): Promise<WODBSet[]> {
    const data = await req('/api/sets');
    return data.sets as WODBSet[];
}

export async function fetchSetById(id: string): Promise<WODBSet | undefined> {
    const data = await req(`/api/sets/${encodeURIComponent(id)}`);
    return data.set as WODBSet | undefined;
}

export async function fetchUserAnnotationsForSet(userId: string, setId: string): Promise<Annotation[]> {
    const data = await req(`/api/sets/${encodeURIComponent(setId)}/annotations?userId=${encodeURIComponent(userId)}`);
    return data.annotations as Annotation[];
}

export async function createOrUpdateAnnotation(a: Omit<Annotation, 'id'> & { id?: string }): Promise<Annotation> {
    const body = JSON.stringify(a);
    const data = await req('/api/annotations', { method: 'POST', body });
    return data.annotation as Annotation;
}

export async function removeAnnotation(annotationId: string): Promise<boolean> {
    await req(`/api/annotations/${encodeURIComponent(annotationId)}`, { method: 'DELETE' });
    return true;
}

export async function sendRequestReview(userId: string, setId: string): Promise<any> {
    const body = JSON.stringify({ userId });
    const data = await req(`/api/sets/${encodeURIComponent(setId)}/request-review`, { method: 'POST', body });
    return data;
}

export async function fetchVisibleAnnotationsForUserInSet(userId: string, setId: string): Promise<Annotation[]> {
    const data = await req(`/api/sets/${encodeURIComponent(setId)}/visible?userId=${encodeURIComponent(userId)}`);
    return data.annotations as Annotation[];
}

export async function fetchAnnotationsForSet(setId: string): Promise<Annotation[]> {
    const data = await req(`/api/sets/${encodeURIComponent(setId)}/annotations`);
    return data.annotations as Annotation[];
}

export async function updateAnnotationVisibility(annotationId: string, visibility: AnnotationVisibility) {
    const body = JSON.stringify({ visibility });
    const data = await req(`/api/annotations/${encodeURIComponent(annotationId)}/visibility`, { method: 'POST', body });
    return data.annotation as Annotation;
}

export async function updateAnnotationStatus(annotationId: string, status: string) {
    const body = JSON.stringify({ status });
    const data = await req(`/api/annotations/${encodeURIComponent(annotationId)}/status`, { method: 'POST', body });
    return data.annotation as Annotation;
}

export default {
    fetchSets,
    fetchSetById,
    fetchUserAnnotationsForSet,
    createOrUpdateAnnotation,
    removeAnnotation,
    sendRequestReview,
    fetchVisibleAnnotationsForUserInSet,
    updateAnnotationVisibility,
    updateAnnotationStatus,
};
