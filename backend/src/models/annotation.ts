import mongoose, { Document, Schema } from 'mongoose';

export type AnnotationStatus = 'draft' | 'pending' | 'accepted' | 'rejected';
export type AnnotationVisibility = 'private' | 'group' | 'public';

export interface IAnnotation extends Document {
  id?: string;
  setId: string;
  userId: string;
  objectId: string;
  text?: string;
  status: AnnotationStatus;
  visibility: AnnotationVisibility;
  createdAt?: Date;
  updatedAt?: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    // store canonical fields; we rely on MongoDB ObjectId for the document id
    setId: { type: String, required: true },
    userId: { type: String, required: true },
    objectId: { type: String, required: true },
    text: { type: String },
    status: { type: String, enum: ['draft', 'pending', 'accepted', 'rejected'], default: 'draft' },
    visibility: { type: String, enum: ['private', 'group', 'public'], default: 'private' },
  },
  { timestamps: true }
);

AnnotationSchema.set('toJSON', {
  transform(_doc, ret: any) {
    // always expose `id` as the string form of _id
    if (ret._id) ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
  },
});

const AnnotationModel = mongoose.models.Annotation || mongoose.model<IAnnotation>('Annotation', AnnotationSchema);
export default AnnotationModel;
