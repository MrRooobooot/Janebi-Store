/**
 * All inline keyboards (pure builders).
 * Split out of server/bot/bale.ts (body moved verbatim).
 */
import { InlineKeyboard } from 'grammy';

export function makeMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📦 مدیریت کالاها', 'm:sec_prod')
    .text('🛍 سفارشات فروشگاه', 'm:sec_ord')
    .row()
    .text('🏷 کدهای تخفیف', 'm:sec_coup')
    .text('💬 نظرات و پیام‌ها', 'm:sec_msg')
    .row()
    .text('👥 مشتریان و VIP', 'm:sec_user')
    .text('⚙️ تنظیمات سایت', 'm:sec_set')
    .row()
    .text('📊 آمار و هشدارهای انبار', 'm:stat')
    .text('❓ راهنما', 'm:help');
}

export function makeProductsSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ثبت کالای جدید', 'm:new')
    .row()
    .text('📋 لیست تمام کالاها', 'm:p:0')
    .text('🔍 جستجوی کالا', 'm:srch')
    .row()
    .text('📸 آپلود مستقیم عکس', 'm:upl_img')
    .text('📁 انتخاب بر اساس دسته', 'm:cat_pick:0')
    .row()
    .text('⚠️ کالاهای رو به اتمام', 'm:alert')
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeOrdersSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🛍 همه سفارش‌ها', 'm:o:0')
    .text('⏳ در انتظار پرداخت', 'm:of:pending_payment:0')
    .row()
    .text('🔄 در حال پردازش', 'm:of:processing:0')
    .text('🚚 ارسال شده‌ها', 'm:of:shipped:0')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeCouponsSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 فهرست کوپن‌ها', 'm:cp_list:0')
    .text('➕ ساخت کد تخفیف', 'm:cp_new')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeMessagesSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⭐ مدیریت نظرات کاربران', 'm:rv_list:0')
    .row()
    .text('📩 پیام‌های فرم تماس با ما', 'm:cm_list:0')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeUsersSectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔍 استعلام مشتری با شماره تلفن', 'm:usr_srch')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeSettingsSectionKeyboard(barEnabled: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(barEnabled ? '📢 نوار اعلان: [روشن ✅]' : '📢 نوار اعلان: [خاموش ❌]', 'st:bar_tog')
    .row()
    .text('✏️ تغییر متن نوار اعلان', 'st:bar_txt')
    .row()
    .text('🚚 تنظیم سقف ارسال رایگان', 'st:ship_th')
    .row()
    .text('🏷 بنر باشگاه مشتریان', 'st:vip')
    .row()
    .text('🏠 بازگشت به منوی اصلی', 'm:menu');
}

export function makeVipBannerKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ برچسب', 'st:vipf:badge')
    .text('✏️ عنوان', 'st:vipf:title')
    .row()
    .text('✏️ زیرعنوان', 'st:vipf:subtitle')
    .row()
    .text('✏️ کد تخفیف', 'st:vipf:coupon')
    .row()
    .text('⬅️ بازگشت به تنظیمات', 'm:sec_set')
    .text('🏠 منوی اصلی', 'm:menu');
}

export function makeCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('❌ انصراف و بازگشت', 'm:cancel');
}

export function makeCategoriesKeyboard(cats: string[], page: number, prefix: string = 'c:cat:'): InlineKeyboard {
  const pageSize = 6;
  const totalPages = Math.ceil(cats.length / pageSize) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = cats.slice(curPage * pageSize, (curPage + 1) * pageSize);

  const kb = new InlineKeyboard();
  for (let i = 0; i < slice.length; i += 2) {
    const idx1 = curPage * pageSize + i;
    kb.text(slice[i], `${prefix}${idx1}`);
    if (i + 1 < slice.length) {
      const idx2 = curPage * pageSize + i + 1;
      kb.text(slice[i + 1], `${prefix}${idx2}`);
    }
    kb.row();
  }

  const navPrefix = prefix === 'c:cat:' ? 'c:pg:' : 'cpk:pg:';
  const navRow: { text: string; data: string }[] = [];
  if (curPage > 0) {
    navRow.push({ text: '⬅️ صفحه قبل', data: `${navPrefix}${curPage - 1}` });
  }
  if (curPage < totalPages - 1) {
    navRow.push({ text: 'صفحه بعد ➡️', data: `${navPrefix}${curPage + 1}` });
  }

  if (navRow.length > 0) {
    for (const b of navRow) kb.text(b.text, b.data);
    kb.row();
  }

  kb.text('❌ انصراف', 'm:cancel');
  return kb;
}

export function makeStockQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('۵ عدد', 'w:stk:5')
    .text('۱۰ عدد', 'w:stk:10')
    .text('۲۰ عدد', 'w:stk:20')
    .text('۵۰ عدد', 'w:stk:50')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeBrandQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('متفرقه', 'w:brd:متفرقه')
    .text('سامسونگ', 'w:brd:سامسونگ')
    .text('اپل', 'w:brd:اپل')
    .row()
    .text('شیائومی', 'w:brd:شیائومی')
    .text('انکر', 'w:brd:انکر')
    .text('باسئوس', 'w:brd:باسئوس')
    .row()
    .text('⏩ رد شدن (متفرقه)', 'w:skip:brand')
    .text('❌ انصراف', 'm:cancel');
}

export function makeWarrantyQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('اصالت و سلامت فیزیکی', 'w:war:اصالت و سلامت فیزیکی')
    .row()
    .text('گارانتی ۱۸ ماهه شرکتی', 'w:war:گارانتی ۱۸ ماهه شرکتی')
    .row()
    .text('بدون گارانتی', 'w:war:بدون گارانتی')
    .text('⏩ رد شدن', 'w:skip:warranty')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeDescriptionQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('⏩ رد شدن (بدون توضیحات)', 'w:skip:desc')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makePhotoQuickKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📷 تصویر پیش‌فرض (رد شدن)', 'w:skip:photo')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeConfirmWizardKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید و انتشار در سایت', 'w:ok')
    .row()
    .text('❌ انصراف', 'm:cancel');
}

export function makeProductDetailKeyboard(productId: number, stock: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ۱', `p:s:${productId}:1`)
    .text('➕ ۵', `p:s:${productId}:5`)
    .text('➖ ۱', `p:s:${productId}:-1`)
    .text('📦 تنظیم دقیق', `p:stk:${productId}`)
    .row()
    .text('💰 تغییر قیمت', `p:prc:${productId}`)
    .text('🏷 تنظیم تخفیف', `p:dsc:${productId}`)
    .row()
    .text('📸 تغییر / آپلود عکس', `p:pho:${productId}`)
    .text('🔗 لینک محصول در وب', `p:web:${productId}`)
    .row()
    .text('🗑 حذف کالا', `p:del:${productId}`)
    .text('⬅️ لیست کالاها', 'm:p:0')
    .row()
    .text('🏠 منوی اصلی', 'm:menu');
}

export function makeProductDeleteConfirmKeyboard(productId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚠️ بله، کالا حذف شود', `p:dely:${productId}`)
    .text('❌ انصراف', `p:v:${productId}`);
}

export function makeOrderDetailKeyboard(orderId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 در حال پردازش', `o:s:${orderId}:processing`)
    .text('🚚 ارسال شد', `o:s:${orderId}:shipped`)
    .text('✅ تحویل شد', `o:s:${orderId}:delivered`)
    .row()
    .text('🔴 لغو سفارش', `o:s:${orderId}:cancelled`)
    .row()
    .text('⬅️ بازگشت به سفارش‌ها', 'm:o:0')
    .text('🏠 منوی اصلی', 'm:menu');
}

// -------------------------------------------------------------
