#!/usr/bin/env node
import type { WODBSet } from '../../common/model.js';
import { connectDB, disconnectDB } from '../src/db.js';
import AnnotationModel from '../src/models/annotation.js';
import WODBSetModel from '../src/models/wodbSet.js';

async function seed() {
    await connectDB();
    try {
        console.log('Seeding WODB sets...');
        // ensure sets exist (upsert)
        const wodbSets: WODBSet[] = [
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
        // No sample annotations by default. Add any seed annotations here
        // if you want to populate the DB with example user annotations.

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
