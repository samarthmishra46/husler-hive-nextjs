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
  subscriptionStatus: 'none' | 'trial' | 'active' | 'expired';
  plan?: StoredPlan;
  /** One-time / paid-in-advance buyers — never expired or kicked. */
  lifetime: boolean;
  trialUsed: boolean;
  channelAdded: boolean;
  welcomeEmailSent: boolean;
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
      enum: ['none', 'trial', 'active', 'expired'],
      default: 'none',
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

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
