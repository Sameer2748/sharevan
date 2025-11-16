import { env } from '../config/env';

/**
 * SMS Service - Supports multiple providers
 * Providers: console (development), twilio, msg91
 */

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS using configured provider
 */
export const sendSMS = async (to: string, message: string): Promise<SMSResult> => {
  const provider = env.SMS_PROVIDER.toLowerCase();

  switch (provider) {
    case 'twilio':
      return sendViaTwilio(to, message);

    case 'msg91':
      return sendViaMsg91(to, message);

    case 'console':
    default:
      return sendViaConsole(to, message);
  }
};

/**
 * Console SMS (Development only)
 * Just logs to console instead of sending actual SMS
 */
const sendViaConsole = async (to: string, message: string): Promise<SMSResult> => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SMS (Console Mode - Development Only)');
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    success: true,
    messageId: `console-${Date.now()}`,
  };
};

/**
 * Send SMS via Twilio
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
const sendViaTwilio = async (to: string, message: string): Promise<SMSResult> => {
  try {
    // Check if Twilio credentials are configured
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      console.error('⚠️ Twilio credentials not configured. Falling back to console mode.');
      return sendViaConsole(to, message);
    }

    // Import Twilio SDK
    const twilio = require('twilio');
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    // Format phone number - ensure it starts with +
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    const formattedFrom = env.TWILIO_PHONE_NUMBER.startsWith('+')
      ? env.TWILIO_PHONE_NUMBER
      : `+${env.TWILIO_PHONE_NUMBER}`;

    console.log(`📱 Sending SMS via Twilio to ${formattedTo}...`);

    const result = await client.messages.create({
      body: message,
      to: formattedTo,
      from: formattedFrom,
    });

    console.log(`✅ SMS sent successfully! SID: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('❌ Twilio SMS error:', error.message);

    // If Twilio fails, log the error and fall back to console mode for development
    console.log('⚠️ Falling back to console mode due to Twilio error');
    return sendViaConsole(to, message);
  }
};

/**
 * Send SMS via MSG91
 * Popular in India, requires MSG91 API key
 */
const sendViaMsg91 = async (to: string, message: string): Promise<SMSResult> => {
  try {
    // Implementation for MSG91
    // Requires: MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_ROUTE

    console.log('⚠️ MSG91 integration not yet implemented. Falling back to console.');
    return sendViaConsole(to, message);
  } catch (error: any) {
    console.error('MSG91 SMS error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS via MSG91',
    };
  }
};

/**
 * Send bulk SMS (for notifications, marketing, etc.)
 */
export const sendBulkSMS = async (
  recipients: string[],
  message: string
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
};

export default {
  sendSMS,
  sendBulkSMS,
};
