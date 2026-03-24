export interface IUser {
  _id?: string;
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

export interface IPayment {
  _id?: string;
  userId: string;
  cashfreeSubscriptionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  paidAt?: Date;
  cfPaymentId?: string;
  createdAt: Date;
}

export interface IAuditLog {
  _id?: string;
  userId?: string;
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

export interface SubscribeRequest {
  email: string;
  mobile: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}
