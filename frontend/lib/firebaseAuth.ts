import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from './firebase';

// Development mode test numbers (configure these in Firebase Console)
const DEV_MODE = process.env.NODE_ENV === 'development';
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+919999999999': '123456',
  '+919876543210': '123456',
};

// Store the confirmation result globally
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA verifier
 * Call this once when the login page loads
 */
export const initializeRecaptcha = (containerId: string = 'recaptcha-container') => {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      },
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    throw error;
  }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Full phone number with country code (e.g., +919876543210)
 * @returns Promise that resolves when OTP is sent
 */
export const sendOTP = async (phoneNumber: string): Promise<void> => {
  try {
    // Ensure reCAPTCHA is initialized
    if (!recaptchaVerifier) {
      initializeRecaptcha();
    }

    if (!recaptchaVerifier) {
      throw new Error('Failed to initialize reCAPTCHA');
    }

    // Send OTP
    confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );

    console.log('OTP sent successfully');
  } catch (error: any) {
    console.error('Error sending OTP:', error);

    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later');
    } else if (error.code === 'auth/billing-not-enabled') {
      throw new Error('Phone authentication requires Firebase Blaze plan. Please upgrade your Firebase project or contact support.');
    } else {
      throw new Error(error.message || 'Failed to send OTP');
    }
  }
};

/**
 * Verify OTP code
 * @param code - 6-digit OTP code
 * @returns Firebase user credential
 */
export const verifyOTP = async (code: string) => {
  try {
    if (!confirmationResult) {
      throw new Error('Please request OTP first');
    }

    // Verify the OTP code
    const result = await confirmationResult.confirm(code);

    console.log('OTP verified successfully');
    return result;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);

    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP code');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('OTP code has expired. Please request a new one');
    } else {
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }
};

/**
 * Get Firebase ID token for backend authentication
 * @returns Firebase ID token
 */
export const getFirebaseToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    await auth.signOut();
    confirmationResult = null;
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Reset reCAPTCHA - useful when user changes phone number
 */
export const resetRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
};
