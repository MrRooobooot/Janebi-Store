import { Router } from 'express';
import { db } from '../db/index.js';
import { contactMessages } from '../db/schema.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'نام، ایمیل و پیام الزامی است' });
  }

  const newMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : null,
    subject: subject ? subject.trim() : null,
    message: message.trim(),
    status: 'unread',
    createdAt: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  };

  try {
    await db.insert(contactMessages).values(newMessage);
    res.status(200).json({ 
      success: true,
      message: 'پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت.' 
    });
  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({ error: 'خطای سرور در ثبت پیام' });
  }
});

router.post('/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'آدرس ایمیل وارد شده نامعتبر است' });
  }

  try {
    const { newsletterSubscribers } = await import('../db/schema.js');
    await db.insert(newsletterSubscribers).values({
      email: email.trim().toLowerCase(),
      subscribedAt: new Date().toISOString()
    }).onConflictDoNothing();

    res.status(200).json({ 
      success: true, 
      message: 'عضویت شما در خبرنامه با موفقیت ثبت شد.' 
    });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ error: 'خطای سرور در ثبت عضویت خبرنامه' });
  }
});

export default router;
