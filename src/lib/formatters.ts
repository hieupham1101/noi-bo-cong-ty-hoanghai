export const formatCurrencyVND = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '0';
    }
    // Using vi-VN locale which uses dots for thousands separator and commas for decimals
    // Enforcing 0 fraction digits to avoid "1.392,8"
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
};

export const parseNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;

    // Remove non-numeric characters except for possible decimal separator if needed
    // But standard input type="number" usually handles dot/comma based on locale, 
    // however raw value from react-hook-form might be string.
    const cleanValue = value.replace(/,/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
};
