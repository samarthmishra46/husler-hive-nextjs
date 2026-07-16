import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentKind = 'auth' | 'charge';

export interface IPaymentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  cashfreeSubscriptionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  /**
   * 'auth'   — the one-off upfront authorization charge that starts a subscription.
   * 'charge' — a recurring charge, or a one-time order.
   *
   * Cashfree announces a paid authorization through two different events
   * (SUBSCRIPTION_AUTH_STATUS and SUBSCRIPTION_STATUS_CHANGED→ACTIVE), either of
   * which may arrive first, both, or only one. There is exactly one auth per
   * subscription, so (cashfreeSubscriptionId, kind:'auth') is unique-indexed below
   * and written by upsert — that's what makes recording it idempotent no matter
   * which events show up.
   */
  kind: PaymentKind;
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
    kind: {
      type: String,
      enum: ['auth', 'charge'],
      default: 'charge',
    },
    paidAt: { type: Date, default: null },
    cfPaymentId: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ cashfreeSubscriptionId: 1 });
// Exactly one authorization payment per subscription. Partial so it only constrains
// auth rows — recurring charges legitimately repeat against the same subscription.
PaymentSchema.index(
  { cashfreeSubscriptionId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: 'auth' } }
);

const Payment: Model<IPaymentDocument> =
  mongoose.models.Payment || mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

export default Payment;
