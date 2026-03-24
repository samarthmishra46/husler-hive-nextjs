import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLogDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  action:
    | 'subscribed'
    | 'trial_started'
    | 'payment_success'
    | 'payment_failed'
    | 'joined_channel'
    | 'left_channel'
    | 'kicked';
  details?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, default: null },
    action: {
      type: String,
      enum: [
        'subscribed',
        'trial_started',
        'payment_success',
        'payment_failed',
        'joined_channel',
        'left_channel',
        'kicked',
      ],
      required: true,
    },
    details: { type: String, default: null },
  },
  { timestamps: true }
);

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

export default AuditLog;
