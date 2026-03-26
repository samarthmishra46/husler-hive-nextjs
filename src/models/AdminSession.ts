import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminSession extends Document {
  hashedToken: string;
  expiresAt: Date;
}

const AdminSessionSchema = new Schema<IAdminSession>(
  {
    hashedToken: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index: auto-delete when expired
  },
  { timestamps: true }
);

export default mongoose.models.AdminSession ||
  mongoose.model<IAdminSession>('AdminSession', AdminSessionSchema);
