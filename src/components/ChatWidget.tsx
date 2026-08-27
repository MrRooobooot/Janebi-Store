import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, Sparkles, User, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEES } from '../lib/constants';
import { useStoreSettings } from '../hooks/useStoreSettings';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

const QUICK_QUESTIONS = [
  'پیگیری وضعیت سفارش',
  'شرایط ارسال رایگان',
  'کد تخفیف‌های فعال',
  'ضمانت بازگشت کالا',
  'ساعات کاری پشتیبانی'
];

export default function ChatWidget() {
  const location = useLocation();
  const settings = useStoreSettings();
  const isProductDetail = location.pathname.startsWith('/product/');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'msg-1', 
      text: 'سلام! من دستیار هوشمند پشتیبانی جانبی آرنا هستم. چطور می‌توانم کمکتان کنم؟', 
      isUser: false, 
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const generateBotResponse = (userText: string) => {
    const text = userText.trim().toLowerCase();
    
    if (/ord[- ]?\d+/i.test(text)) {
      return 'کد سفارش شما دریافت شد! برای مشاهده وضعیت لحظه‌ای سفارش، به بخش «سفارش‌های من» در پروفایل خود مراجعه کنید.';
    }
    if (text.includes('سفارش') || text.includes('پیگیری') || text.includes('کد پیگیری')) {
      return 'برای پیگیری سفارش می‌توانید به صفحه «سفارش‌های من» در پروفایل خود مراجعه کنید یا کد پیگیری سفارش (مثلاً ORD-123456) را برای من بفرستید.';
    }
    if (text.includes('ارسال') || text.includes('پست') || text.includes('رایگان')) {
      return `سفارش‌های بالای ${FREE_SHIPPING_THRESHOLD.toLocaleString('fa-IR')} تومان کاملاً رایگان ارسال می‌شوند! برای سفارش‌های کمتر، هزینه پست پیشتاز ${SHIPPING_FEES.express.toLocaleString('fa-IR')} و پست سفارشی ${SHIPPING_FEES.standard.toLocaleString('fa-IR')} تومان است.`;
    }
    if (text.includes('تخفیف') || text.includes('کوپن') || text.includes('کد تخفیف')) {
      return 'برای مشاهده کد تخفیف‌های فعال، کد خود را در مرحله پرداخت وارد کنید — کدهای نامعتبر به‌طور خودکار رد می‌شوند. برای اطلاع از کوپن‌های اختصاصی، عضو خبرنامه شوید.';
    }
    if (text.includes('بازگشت') || text.includes('مرجوع') || text.includes('گارانتی')) {
      return 'تمامی محصولات جانبی آرنا دارای ۷ روز مهلت تست و ضمانت اصالت کالا هستند. در صورت وجود هرگونه مشکل فنی می‌توانید کالا را مرجوع کنید.';
    }
    if (text.includes('ساعت') || text.includes('تماس') || text.includes('پشتیبانی')) {
      return `پشتیبانی ما ${settings.supportHours} پاسخگوی شماست (تلفن: ${settings.phone}).`;
    }
    
    return 'پیام شما دریافت شد. کارشناسان پشتیبانی ما هم‌اکنون پیام شما را بررسی می‌کنند. آیا سوال دیگری درباره مشخصات محصولات یا ثبت سفارش دارید؟';
  };

  const handleSend = (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: messageText,
      isUser: true,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botReplyText = generateBotResponse(messageText);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        text: botReplyText,
        isUser: false,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className={`fixed ${isProductDetail ? 'bottom-[148px] sm:bottom-6' : 'bottom-20 sm:bottom-6'} right-6 z-50 print:hidden flex flex-col items-end transition-all duration-300`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[92vw] sm:w-96 h-[32rem] flex flex-col overflow-hidden mb-4 transition-colors"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    پشتیبانی هوشمند
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h3>
                  <p className="text-[11px] text-white/80">پاسخگویی آنلاین و فوری</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50/80 dark:bg-gray-950/60">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.isUser 
                      ? 'bg-orange-600 text-white self-end rounded-br-none shadow-sm' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-none shadow-sm'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className={`text-[9px] mt-1 text-left ${msg.isUser ? 'text-orange-200' : 'text-gray-400'}`}>
                    {msg.time}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 p-3 rounded-2xl self-start rounded-bl-none flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="p-2 bg-gray-100/60 dark:bg-gray-800/40 border-t border-gray-200/60 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-700 rounded-full transition-colors shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سوال خود را بنویسید..." 
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-transparent focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-colors"
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-orange-600 to-amber-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(234,88,12,0.35)] transition-all relative group"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
        </motion.button>
      )}
    </div>
  );
}

