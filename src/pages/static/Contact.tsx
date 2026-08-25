import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { motion } from 'motion/react';

export default function Contact() {
  const { addToast } = useToast();
  const settings = useStoreSettings();
  const [formData, setFormData] = useState({ name: '', contactInfo: '', subject: '', message: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactInfo || !formData.message) {
      addToast('لطفاً تمامی فیلدهای ضروری را تکمیل کنید.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.contactInfo,
          phone: formData.contactInfo,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال پیام');
      }

      addToast('پیام شما با موفقیت ثبت شد! کارشناسان ما به زودی با شما تماس خواهند گرفت.', 'success');
      setFormData({ name: '', contactInfo: '', subject: '', message: '' });
    } catch (err: any) {
      addToast(err.message || 'خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-10"
    >
      {/* Title */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold px-3 py-1 rounded-full mb-3">
            <Sparkles className="h-3.5 w-3.5" /> پشتیبانی همه‌روزه
          </span>
          <h1 className="text-3xl font-black mb-2 tracking-tight">تماس با جانبی آرنا</h1>
          <p className="text-gray-400 text-sm max-w-xl">
            سوال، پیشنهاد یا نیازمند راهنمایی پیش از خرید هستید؟ مشتاقانه آماده شنیدن صدای شما هستیم.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex items-start gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">آدرس فروشگاه</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {settings.address}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">تلفن پشتیبانی</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed dir-ltr text-right">
                {settings.phone}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">خط ویژه سفارشات تلفنی</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex items-start gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">پست الکترونیک</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 dir-ltr text-right">
                {settings.email}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">ساعات کاری</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {settings.supportHours}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">ارسال پیام مستقیم به پشتیبانی</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">نام و نام خانوادگی *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="مثلاً: علی محمدی"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">شماره تماس یا ایمیل *</label>
                <input 
                  type="text" 
                  dir="ltr"
                  value={formData.contactInfo} 
                  onChange={e => setFormData({...formData, contactInfo: e.target.value})} 
                  placeholder="09123456789"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono text-left text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">موضوع پیام</label>
              <input 
                type="text" 
                value={formData.subject} 
                onChange={e => setFormData({...formData, subject: e.target.value})} 
                placeholder="مثلاً: پیگیری سفارش، مشاوره خرید..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">متن پیام *</label>
              <textarea 
                rows={5} 
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})} 
                placeholder="توضیحات خود را بنویسید..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors" 
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold py-3 px-8 rounded-xl shadow-md shadow-orange-500/20 transition-all duration-300 active:scale-98 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {isSubmitting ? 'در حال ارسال...' : 'ارسال پیام'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
