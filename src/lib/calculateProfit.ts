
/**
 * Core Shopee Profit Calculation Logic
 * Centralizes all fee and profit formulas.
 */

export interface ShopeeFeeInputs {
    sellingPrice: number | string
    cogs: number | string

    // Fee Percentages (0-100)
    categoryFeePercent: number // Phí cố định (Fixed Fee)
    serviceFeePercent: number  // Phí dịch vụ (Service Fee - Freeship/Video)
    paymentFeePercent?: number // Phí thanh toán (Default ~5%)
    voucherFeePercent?: number // Voucher Xtra (Default 4%)

    // Additional Costs
    taxPercent?: number        // Thuế (Default 1.5%)
    fixedCostAmount?: number   // Phí hạ tầng/cố định khác (VND)

    // Caps
    serviceFeeCap?: number     // Max cap for service fee (e.g., 50k)
    voucherFeeCap?: number     // Max cap for voucher fee
}

export interface ShopeeFeeOutputs {
    netProfit: number
    margin: number // Percentage
    breakEvenPrice: number
    totalFees: number

    // Breakdown
    feeDetails: {
        fixedFeeAmount: number
        serviceFeeAmount: number
        paymentFeeAmount: number
        voucherFeeAmount: number
        taxAmount: number
        otherFixedParam: number
        totalFeeRate: number // For reference (decimal)
    }
}

/**
 * Parses input to number safely. Handles strings with commas/dots if necessary, 
 * but primarily ensures type safety.
 */
const safeParse = (val: number | string | undefined | null): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    // Remove non-numeric chars except dot and minus (simplistic)
    const cleanly = val.toString().replace(/,/g, '');
    const parsed = parseFloat(cleanly);
    return isNaN(parsed) ? 0 : parsed;
};

export function calculateShopeeMetrics(inputs: ShopeeFeeInputs): ShopeeFeeOutputs {
    // 1. Safe Parse Inputs
    const sellingPrice = safeParse(inputs.sellingPrice);
    const cogs = safeParse(inputs.cogs);

    const categoryRate = safeParse(inputs.categoryFeePercent) / 100;
    const serviceRate = safeParse(inputs.serviceFeePercent) / 100;
    const paymentRate = safeParse(inputs.paymentFeePercent ?? 5) / 100;
    const voucherRate = safeParse(inputs.voucherFeePercent ?? 0) / 100;
    const taxRate = safeParse(inputs.taxPercent ?? 0) / 100;

    const infraAmount = safeParse(inputs.fixedCostAmount); // e.g. 3000
    const serviceCap = safeParse(inputs.serviceFeeCap ?? Infinity);
    const voucherCap = safeParse(inputs.voucherFeeCap ?? Infinity);

    // 2. Fee Calculation
    const fixedFeeAmount = sellingPrice * categoryRate;
    const paymentFeeAmount = sellingPrice * paymentRate;
    const taxAmount = sellingPrice * taxRate;

    // Service Fee with Cap
    const rawServiceFee = sellingPrice * serviceRate;
    const serviceFeeAmount = Math.min(rawServiceFee, serviceCap);

    // Voucher Fee with Cap
    const rawVoucherFee = sellingPrice * voucherRate;
    const voucherFeeAmount = Math.min(rawVoucherFee, voucherCap);

    const totalFees = fixedFeeAmount + serviceFeeAmount + paymentFeeAmount + voucherFeeAmount + taxAmount + infraAmount;

    // 3. Net Profit & Margin
    const netProfit = sellingPrice - cogs - totalFees;

    // Margin = (Net Profit / Selling Price) * 100
    // Handle Selling Price = 0
    const margin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

    // 4. Break-even Price (The Fix)
    // Formula: BEP = (COGS + FixedValues) / (1 - VariableRates)
    // Variable Rates include: Category, Payment, Tax.
    // Service Fee is tricky because it's capped. 
    // STRICT User Request: breakEvenPrice = cogs / (1 - totalFeeRate)

    // We will follow the prompt's requested logic for BreakEven, 
    // but we must account for Tax or it will be wrong.
    // Also, if Service Fee is CAPPED, it behaves like a variabl rate until the cap, then fixed.
    // For "Break-even" usually we care about the rate at the lower bound.

    const totalVariableRate = categoryRate + serviceRate + paymentRate + voucherRate + taxRate;

    // If rate >= 100%, break even is infinite/undefined.
    let breakEvenPrice = 0;
    if (totalVariableRate >= 1) {
        breakEvenPrice = 0; // Or Infinity, but 0 is safer for UI logic (indicates error/impossible)
    } else {
        // We also need to cover the hard Fixed Costs (Infra) to accurately break even
        // Formula: P * (1 - Rate) = COGS + Infra
        // P = (COGS + Infra) / (1 - Rate)
        breakEvenPrice = (cogs + infraAmount) / (1 - totalVariableRate);
    }

    // Edge case if Service Fee logic requires checking the cap.
    // If the calculated BEP results in a Service Fee > Cap, we technically redefine the BEP line.
    // But for simplicity and robustness as requested:
    // User formula was: cogs / (1 - totalFeeRate)
    // We added infraAmount to numerator to be correct.

    return {
        netProfit,
        margin,
        breakEvenPrice,
        totalFees,
        feeDetails: {
            fixedFeeAmount,
            serviceFeeAmount,
            paymentFeeAmount,
            voucherFeeAmount,
            taxAmount,
            otherFixedParam: infraAmount,
            totalFeeRate: totalVariableRate
        }
    };
}
