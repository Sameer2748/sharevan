import axios from 'axios';
import { env } from '../config/env';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP email via Brevo (free 300 emails/day, no domain verification needed!)
 * Sign up: https://app.brevo.com/account/register
 * Get API key: https://app.brevo.com/settings/keys/api
 */
export const sendOTPEmail = async (to: string, otp: string): Promise<EmailResult> => {
  try {
    // Use Brevo for reliable email delivery (no domain verification required!)
    const BREVO_API_KEY = env.BREVO_API_KEY || process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f6f8ff;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #0F58FF 0%, #469BFF 100%);
            padding: 40px 20px;
          }
          .content {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            color: #0F58FF;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
          }
          .message {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.5;
          }
          .otp-box {
            background: #f6f8ff;
            border: 2px dashed #0F58FF;
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
          }
          .otp-label {
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .otp-code {
            font-size: 42px;
            font-weight: 700;
            color: #0F58FF;
            letter-spacing: 8px;
            margin: 0;
          }
          .validity {
            font-size: 14px;
            color: #999;
            margin-top: 24px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
          }
          .security-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin-top: 20px;
            text-align: left;
            font-size: 13px;
            color: #856404;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="logo">sharevan</div>
            <h1 class="title">Email Verification</h1>
            <p class="message">
              We received a request to verify your email address for ShareVan.
              Use the verification code below to complete your login:
            </p>

            <div class="otp-box">
              <div class="otp-label">Verification Code</div>
              <p class="otp-code">${otp}</p>
            </div>

            <p class="validity">
              This code is valid for <strong>5 minutes</strong> only.
            </p>

            <div class="security-note">
              <strong>Security Note:</strong> Never share this code with anyone.
              ShareVan will never ask for your verification code via phone, email, or any other medium.
            </div>

            <div class="footer">
              If you didn't request this code, please ignore this email or contact support if you have concerns.
              <br><br>
              <strong>ShareVan</strong> - Your Logistics Partner
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📧 Sending email via Brevo to:', to);

    // Brevo FREE requires using a verified sender email
    // Use the email from env or fallback to a default
    const senderEmail = env.SES_FROM_EMAIL || 'mrao27488@gmail.com';

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'ShareVan', email: senderEmail },
        to: [{ email: to }],
        subject: 'Your ShareVan Verification Code',
        htmlContent: htmlBody,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Email sent successfully via Brevo:', response.data);

    return {
      success: true,
      messageId: response.data.messageId,
    };
  } catch (error: any) {
    console.error('❌ Failed to send email via Brevo:');
    console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error message:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to send email',
    };
  }
};
