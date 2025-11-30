import mongoose, { Schema, Document, Model } from 'mongoose';
import type { WODBObject as WODBObjectType } from '../data.js';

export type IWODBObject = WODBObjectType;

export interface IWODBSet extends Document<string> {
    // we store set ids as strings in `_id` to preserve frontend ids
    _id: string;
    id?: string; // populated by toJSON transform
    title?: string;
    description?: string;
    objects?: IWODBObject[];
}

const WODBObjectSchema = new Schema(
    {
        id: String,
        type: String,
        value: String,
    },
    { _id: false }
);

const WODBSetSchema = new Schema(
    {
        _id: String,
        title: String,
        description: String,
        objects: [WODBObjectSchema],
    },
    { timestamps: false }
);

WODBSetSchema.set('toJSON', {
    transform(_doc: unknown, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    },
});

export const WODBSetModel: Model<IWODBSet> = (mongoose.models.WODBSet as Model<IWODBSet>) || mongoose.model<IWODBSet>('WODBSet', WODBSetSchema);
export default WODBSetModel;
