import mongoose, { Schema, Document, Model } from 'mongoose';
import type { PlanKey } from '@/lib/plans';

// Legacy plan keys kept so existing rows validate. New purchases use PlanKey.
type StoredPlan = PlanKey | 'monthly' | 'quarterly';

const PLAN_ENUM: StoredPlan[] = [
  'foundation-1m',
  'foundation-3m',
  'tradefloor-1m',
  'tradefloor-3m',
  'elite-59999',
  'elite-64999',
  'link1',
  'link2',
  'link3',
  'monthly',
  'quarterly',
];

export interface IUserDocument extends Document {
  email: string;
  mobile: string;
  discordId?: string;
  discordUsername?: string;
  discordAccessToken?: string;
  cashfreeSubscriptionId?: string;
  cashfreeOrderId?: string;
  subscriptionStatus: 'active' | 'expired';
  plan?: StoredPlan;
  /** One-time / paid-in-advance buyers — never expired or kicked. */
  lifetime: boolean;
  trialUsed: boolean;
  channelAdded: boolean;
  welcomeEmailSent: boolean;
  /**
   * Set once the cron has CONFIRMED with Discord that the paid role is gone.
   * Its presence drops the user out of the nightly reconciliation scan — without
   * it, every churned user is re-checked forever and the job rate-limits itself.
   * Cleared whenever access is re-granted.
   */
  accessRevokedAt?: Date | null;
  joinedAt?: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    discordId: { type: String, default: null },
    discordUsername: { type: String, default: null },
    discordAccessToken: { type: String, default: null },
    cashfreeSubscriptionId: { type: String, default: null },
    cashfreeOrderId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'expired'],
      default: 'expired',
    },
    plan: {
      type: String,
      enum: PLAN_ENUM,
      default: 'foundation-1m',
    },
    lifetime: { type: Boolean, default: false },
    trialUsed: { type: Boolean, default: false },
    channelAdded: { type: Boolean, default: false },
    welcomeEmailSent: { type: Boolean, default: false },
    accessRevokedAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobile: 1 });
UserSchema.index({ discordId: 1 });
UserSchema.index({ cashfreeSubscriptionId: 1 });
UserSchema.index({ cashfreeOrderId: 1 });
// Drives the cron's reconciliation scan.
UserSchema.index({ subscriptionStatus: 1, accessRevokedAt: 1 });

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
