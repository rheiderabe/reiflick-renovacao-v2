export function normalizePhoneNumber(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeBrazilianMobilePhone(phone) {
  let digits = normalizePhoneNumber(phone);

  if (!digits) return digits;

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.startsWith("55") && digits.length === 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const localNumber = digits.slice(4);

    if (localNumber.length === 8 && /^[6-9]/.test(localNumber)) {
      digits = `${ddi}${ddd}9${localNumber}`;
    }
  }

  return digits;
}

export function resolvePhoneForMultchats(phone) {
  return normalizeBrazilianMobilePhone(phone);
}
