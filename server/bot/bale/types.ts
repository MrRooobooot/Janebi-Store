/**
 * Bot config + wizard/session draft types.
 * Split out of server/bot/bale.ts (body moved verbatim).
 */

export interface BaleBotConfig {
  token: string;
  adminChatIds: number[];
}

export interface WizardDraft {
  step:
    | 'title'
    | 'category'
    | 'price'
    | 'stock'
    | 'brand'
    | 'warranty'
    | 'description'
    | 'photo'
    | 'confirm';
  title?: string;
  category?: string;
  price?: number;
  stock?: number;
  brand?: string;
  warranty?: string;
  description?: string;
  photoUrl?: string;
  catPage: number;
}

export interface CouponDraft {
  step: 'code' | 'percent' | 'minTotal' | 'confirm';
  code?: string;
  percent?: number;
  minTotal?: number;
}

export interface UserSession {
  mode:
    | 'idle'
    | 'wizard'
    | 'edit_price'
    | 'edit_discount'
    | 'edit_stock'
    | 'edit_photo'
    | 'search'
    | 'search_user'
    | 'coupon_wizard'
    | 'edit_announcement'
    | 'edit_free_shipping'
    | 'edit_vip_field'
    | 'assign_photo'
    | 'await_upload';
  wizard?: WizardDraft;
  couponWizard?: CouponDraft;
  editingProductId?: number;
  editingVipKey?: 'vipBadge' | 'vipTitle' | 'vipSubtitle' | 'vipCouponCode';
  uploadedPhotoUrl?: string;
  lastActive: number;
}
