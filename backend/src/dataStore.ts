import type { WODBSet, Annotation, AnnotationStatus, AnnotationVisibility } from './data.js';
import WODBSetModel from './models/wodbSet.js';
import AnnotationModel from './models/annotation.js';
import mongoose from 'mongoose';

export async function getSets(): Promise<WODBSet[]> {
    const docs = await WODBSetModel.find().exec();
    return docs.map((d: any) => d.toJSON() as WODBSet);
}

export async function getSetById(setId: string): Promise<WODBSet | undefined> {
    const doc = await WODBSetModel.findById(setId).exec();
    return doc ? (doc.toJSON() as WODBSet) : undefined;
}

export async function getAnnotationsForSet(setId: string): Promise<Annotation[]> {
    const docs = await AnnotationModel.find({ setId }).exec();
    return docs.map((d: any) => d.toJSON() as Annotation);
}

export async function getUserAnnotationsForSet(userId: string, setId: string): Promise<Annotation[]> {
    const docs = await AnnotationModel.find({ setId, userId }).exec();
    return docs.map((d: any) => d.toJSON() as Annotation);
}

export async function getUserAnnotationForObject(userId: string, setId: string, objectId: string): Promise<Annotation | undefined> {
    const doc = await AnnotationModel.findOne({ userId, setId, objectId }).exec();
    return doc ? (doc.toJSON() as Annotation) : undefined;
}

export async function saveAnnotation(a: Omit<Annotation, 'id'> & { id?: string }): Promise<Annotation> {
    // If caller provided an id that looks like an ObjectId, treat as update.
    if (a.id && mongoose.isValidObjectId(a.id)) {
        const id = a.id;
        const values = { ...a } as any;
        delete values.id;
        const updated = await AnnotationModel.findByIdAndUpdate(id, values, { new: true }).exec();
        if (updated) return (updated.toJSON() as Annotation);
        // if not found, create new (without preserving caller id)
    }
    const created = await AnnotationModel.create({
        setId: a.setId,
        userId: a.userId,
        objectId: a.objectId,
        text: a.text,
        status: a.status,
        visibility: a.visibility,
    });
    return (created.toJSON() as Annotation);
}

export async function deleteAnnotation(annotationId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(annotationId)) return false;
    const res = await AnnotationModel.findByIdAndDelete(annotationId).exec();
    return !!res;
}

export async function getAnnotationById(annotationId: string): Promise<Annotation | undefined> {
    if (!mongoose.isValidObjectId(annotationId)) return undefined;
    const doc = await AnnotationModel.findById(annotationId).exec();
    return doc ? (doc.toJSON() as Annotation) : undefined;
}

export async function requestReviewForUserInSet(userId: string, setId: string): Promise<Annotation[]> {
    await AnnotationModel.updateMany({ userId, setId, status: 'draft' }, { $set: { status: 'pending' } }).exec();
    const changed = await AnnotationModel.find({ userId, setId, status: 'pending' }).exec();
    return changed.map((d: any) => d.toJSON() as Annotation);
}

export async function setAnnotationStatus(annotationId: string, status: AnnotationStatus): Promise<Annotation | undefined> {
    if (!mongoose.isValidObjectId(annotationId)) return undefined;
    const doc = await AnnotationModel.findByIdAndUpdate(annotationId, { $set: { status } }, { new: true }).exec();
    return doc ? (doc.toJSON() as Annotation) : undefined;
}

export async function setAnnotationVisibility(annotationId: string, visibility: AnnotationVisibility): Promise<Annotation | undefined> {
    if (!mongoose.isValidObjectId(annotationId)) return undefined;
    const doc = await AnnotationModel.findByIdAndUpdate(annotationId, { $set: { visibility } }, { new: true }).exec();
    return doc ? (doc.toJSON() as Annotation) : undefined;
}

export async function getVisibleAnnotationsForUserInSet(userId: string, setId: string): Promise<Annotation[]> {
    const allDocs = await AnnotationModel.find({ setId }).exec();
    const all = allDocs.map((d: any) => d.toJSON() as Annotation);
    const userHasAccepted = all.some((a) => a.userId === userId && a.status === 'accepted');
    return all.filter((a) => {
        if (a.userId === userId) return true;
        if (a.visibility === 'public') return true;
        if (a.visibility === 'group' && userHasAccepted) return true;
        return false;
    });
}
