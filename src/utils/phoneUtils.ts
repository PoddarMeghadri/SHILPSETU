export const formatToE164 = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');

  // If already prefixed with India country code 91 and 10 digits
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  // Standard 10-digit Indian mobile number
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (phone.trim().startsWith('+')) {
    return phone.trim();
  }

  return `+91${cleaned}`;
};

export const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '******';
  return `+91 ******${cleaned.slice(-4)}`;
};

export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
};
