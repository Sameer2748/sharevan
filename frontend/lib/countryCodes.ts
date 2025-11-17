export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', minLength: 10, maxLength: 10 },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', minLength: 10, maxLength: 10 },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', minLength: 10, maxLength: 10 },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', minLength: 10, maxLength: 10 },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', minLength: 9, maxLength: 9 },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', minLength: 9, maxLength: 9 },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', minLength: 9, maxLength: 9 },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', minLength: 10, maxLength: 10 },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', minLength: 10, maxLength: 10 },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰', minLength: 9, maxLength: 9 },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵', minLength: 10, maxLength: 10 },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', minLength: 8, maxLength: 8 },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', minLength: 9, maxLength: 10 },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', minLength: 9, maxLength: 12 },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', minLength: 9, maxLength: 9 },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', minLength: 10, maxLength: 10 },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', minLength: 9, maxLength: 10 },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳', minLength: 11, maxLength: 11 },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', minLength: 10, maxLength: 10 },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', minLength: 9, maxLength: 10 },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', minLength: 10, maxLength: 11 },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', minLength: 9, maxLength: 9 },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', minLength: 9, maxLength: 10 },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', minLength: 9, maxLength: 9 },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', minLength: 10, maxLength: 11 },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', minLength: 10, maxLength: 10 },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', minLength: 9, maxLength: 9 },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', minLength: 10, maxLength: 10 },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', minLength: 9, maxLength: 9 },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬', minLength: 10, maxLength: 10 },
];

export const getCountryByDialCode = (dialCode: string): CountryCode | undefined => {
  return COUNTRY_CODES.find(country => country.dialCode === dialCode);
};

export const getCountryByCode = (code: string): CountryCode | undefined => {
  return COUNTRY_CODES.find(country => country.code === code);
};

export const validatePhoneNumber = (phone: string, dialCode: string): { valid: boolean; message: string } => {
  const country = getCountryByDialCode(dialCode);

  if (!country) {
    return { valid: false, message: 'Invalid country code' };
  }

  const phoneLength = phone.length;

  if (phoneLength < country.minLength) {
    return {
      valid: false,
      message: `Phone number must be at least ${country.minLength} digits for ${country.name}`
    };
  }

  if (phoneLength > country.maxLength) {
    return {
      valid: false,
      message: `Phone number must be at most ${country.maxLength} digits for ${country.name}`
    };
  }

  return { valid: true, message: 'Valid phone number' };
};
