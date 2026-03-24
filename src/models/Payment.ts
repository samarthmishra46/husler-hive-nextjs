import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  cashfreeSubscriptionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  paidAt?: Date;
  cfPaymentId?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashfreeSubscriptionId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },
    cfPaymentId: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ cashfreeSubscriptionId: 1 });

const Payment: Model<IPaymentDocument> =
  mongoose.models.Payment || mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

export default Payment;
