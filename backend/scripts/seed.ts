#!/usr/bin/env node
import { connectDB, disconnectDB } from '../src/db.js';
import WODBSetModel from '../src/models/wodbSet.js';
import AnnotationModel from '../src/models/annotation.js';
import type { WODBSet, Annotation } from '../src/data.js';
import { wodbSets, annotations as sampleAnnotations } from '../src/data.js';

async function seed() {
    await connectDB();
    try {
        console.log('Seeding WODB sets...');
        // ensure sets exist (upsert)
        for (const s of wodbSets as WODBSet[]) {
            // cast objects safely to the schema shape
            const payload = {
                _id: s.id,
                title: s.title,
                description: s.description,
                objects: s.objects,
            } as Partial<WODBSet> & { _id: string };
            await WODBSetModel.updateOne({ _id: s.id }, payload, { upsert: true }).exec();
        }

        console.log('Clearing annotations...');
        await AnnotationModel.deleteMany({}).exec();

        if (Array.isArray(sampleAnnotations) && sampleAnnotations.length) {
            console.log('Seeding annotations...');
            for (const a of sampleAnnotations as Annotation[]) {
                const doc: Partial<Annotation> = {
                    setId: a.setId,
                    userId: a.userId,
                    objectId: a.objectId,
                    text: a.text,
                    status: a.status,
                    visibility: a.visibility,
                    // TODO: support seeding `createdAt` / `updatedAt` in the future if needed.
                };
                await AnnotationModel.create(doc);
            }
        }

        console.log('Seeding complete');
    } catch (err) {
        console.error('Seed error', err);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
