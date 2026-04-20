export type SubscriptionPlanId = 'free' | 'pro' | 'team';

export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trialing';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: ApiErrorPayload;
  meta?: ApiMeta;
}
