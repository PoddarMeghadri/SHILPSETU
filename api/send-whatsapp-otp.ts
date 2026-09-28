import type { Request, Response } from 'express';

const META_TOKEN = process.env.META_WHATSAPP_TOKEN;
const PHONE_ID = process.env.META_PHONE_NUMBER_ID || '1273759089163100';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, otpCode, artisanName } = req.body;
  if (!phone || !otpCode) {
    return res.status(400).json({ error: 'Phone number and 6-digit OTP code are required.' });
  }

  // Clean phone number (strip '+', remove leading zero, ensure 91 prefix for Indian numbers)
  let recipient = String(phone).replace(/\D/g, '');
  if (recipient.startsWith('0') && recipient.length === 11) {
    recipient = recipient.slice(1);
  }
  if (recipient.length === 10) {
    recipient = `91${recipient}`;
  }

  const safeName = (String(artisanName || 'Artisan')).trim() || 'Artisan';
  const safeOtp = String(otpCode).trim();

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: 'shilpsetu_otp',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: safeName },
              { type: 'text', text: safeOtp },
            ],
          },
        ],
      },
    };

    const activeToken = META_TOKEN && !META_TOKEN.startsWith('<') ? META_TOKEN : null;
    if (!activeToken) {
      console.warn('[WhatsApp Dispatcher]: META_WHATSAPP_TOKEN is not configured. Cascading to next tier.');
      return res.status(400).json({
        success: false,
        hasWhatsApp: false,
        error: 'WhatsApp service is not configured. Cascading to next tier.',
      });
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const metaData: any = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      console.error('[WhatsApp Cloud API Error]:', JSON.stringify(metaData?.error || metaData));

      // Error code 131026: Message undeliverable / Number not on WhatsApp
      const isNotOnWhatsApp =
        metaData.error?.code === 131026 ||
        metaData.error?.error_data?.details?.includes('not a valid WhatsApp user');

      // Error code 131030: Recipient phone number not in allowed list (Test/Sandbox mode)
      const isNotAllowedTestNumber = metaData.error?.code === 131030;

      return res.status(400).json({
        success: false,
        hasWhatsApp: !isNotOnWhatsApp,
        isSandboxRestricted: isNotAllowedTestNumber,
        errorCode: metaData.error?.code,
        error: metaData.error?.message || 'Meta Cloud API dispatch failed',
      });
    }

    console.log(`[WhatsApp Cloud API Success]: Dispatched shilpsetu_otp to ${recipient}, messageId: ${metaData.messages?.[0]?.id}`);

    return res.status(200).json({
      success: true,
      hasWhatsApp: true,
      recipient,
      messageId: metaData.messages?.[0]?.id,
    });
  } catch (error: any) {
    console.error('[WhatsApp Cloud API Exception]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
