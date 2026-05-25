import { mongoose } from '../config/mongo';

const supplementaryMaterialSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, index: true },
    fromPage: { type: Number, required: true, min: 1 },
    toPage: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, maxlength: 300 },
    content: { type: String, required: true }, // markdown
    authorId: { type: String, required: true },
  },
  { timestamps: true },
);

supplementaryMaterialSchema.index({ bookId: 1, fromPage: 1, toPage: 1 });

export interface SupplementaryMaterialDoc {
  _id: mongoose.Types.ObjectId;
  bookId: string;
  fromPage: number;
  toPage: number;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SupplementaryMaterial = mongoose.model<SupplementaryMaterialDoc>(
  'SupplementaryMaterial',
  supplementaryMaterialSchema,
);

export function serializeMaterial(doc: SupplementaryMaterialDoc) {
  return {
    id: doc._id.toString(),
    bookId: doc.bookId,
    fromPage: doc.fromPage,
    toPage: doc.toPage,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
