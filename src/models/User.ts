import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  mobile: string;
  discordId?: string;
  discordUsername?: string;
  discordAccessToken?: string;
  cashfreeSubscriptionId?: string;
  subscriptionStatus: 'none' | 'trial' | 'active' | 'cancelled' | 'expired';
  trialUsed: boolean;
  channelAdded: boolean;
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
    subscriptionStatus: {
      type: String,
      enum: ['none', 'trial', 'active', 'cancelled', 'expired'],
      default: 'none',
    },
    trialUsed: { type: Boolean, default: false },
    channelAdded: { type: Boolean, default: false },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobile: 1 });
UserSchema.index({ discordId: 1 });

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
