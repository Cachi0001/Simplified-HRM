// Safe formatting utilities to handle null/undefined values

export const safeToLocaleString = (
  value: number | null | undefined, 
  locale: string = 'en-NG', 
  options?: Intl.NumberFormatOptions
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return value.toLocaleString(locale, options);
};

export const safeDateFormat = (
  dateValue: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateValue) {
    return 'Unknown date';
  }
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-NG', options);
  } catch (error) {
    return 'Invalid date';
  }
};

export const safeString = (value: string | null | undefined, fallback: string = ''): string => {
  return value || fallback;
};

export const safeNumber = (value: number | null | undefined, fallback: number = 0): number => {
  return value ?? fallback;
};

export const formatCurrency = (
  amount: number | null | undefined, 
  currency: string = '₦',
  locale: string = 'en-NG'
): string => {
  const safeAmount = safeNumber(amount, 0);
  return `${currency}${safeToLocaleString(safeAmount, locale, { minimumFractionDigits: 2 })}`;
};

export const calculateDaysBetween = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number => {
  if (!startDate || !endDate) {
    return 0;
  }
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
};