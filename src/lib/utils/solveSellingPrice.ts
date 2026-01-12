/**
 * Smart Pricing Engine - Reverse Price Calculator
 * Solves for the required selling price given a profit target.
 * 
 * IMPORTANT: Uses iterative refinement to handle fee caps (service fee, voucher fee).
 */

export type PricingMode = 'FIXED_AMOUNT' | 'ROI_PERCENT' | 'MARGIN_PERCENT';

export interface SolverInput {
    mode: PricingMode;
    targetValue: number;      // T = Target (VND for FIXED_AMOUNT, % for others)
    cogs: number;             // C = Cost of Goods Sold
    totalFeeRate: number;     // R = Total percentage fees (decimal, e.g., 0.125 for 12.5%)
    fixedAmountFees: number;  // K = Fixed VND fees (if any)
    // Fee cap configuration
    feeConfig?: {
        paymentFeeRate: number;
        serviceFeeRate: number;
        serviceFeeMax: number;
        voucherFeeRate: number;
        voucherFeeMax: number;
        categoryFeeRate: number;
    };
}

export interface SolverResult {
    success: boolean;
    price: number | null;
    error?: string;
}

/**
 * Calculates actual fees with caps applied
 */
function calculateActualFees(price: number, config: SolverInput['feeConfig'], shopVoucher: number = 0): number {
    if (!config) return 0;

    const feeBase = Math.max(0, price - shopVoucher);

    // Category/Fixed Fee (no cap)
    const categoryFee = feeBase * config.categoryFeeRate;

    // Payment Fee (no cap)
    const paymentFee = feeBase * config.paymentFeeRate;

    // Service Fee (capped)
    const serviceFee = Math.min(feeBase * config.serviceFeeRate, config.serviceFeeMax);

    // Voucher Fee (capped)
    const voucherFee = Math.min(feeBase * config.voucherFeeRate, config.voucherFeeMax);

    return categoryFee + paymentFee + serviceFee + voucherFee;
}

/**
 * Solves for the required selling price based on pricing strategy.
 * Uses iterative refinement when fee config with caps is provided.
 * 
 * Formulas (without caps):
 * - FIXED_AMOUNT:   Price = (T + C + K) / (1 - R)
 * - ROI_PERCENT:    Price = (C * (1 + T/100) + K) / (1 - R)
 * - MARGIN_PERCENT: Price = (C + K) / (1 - R - T/100)
 */
export function solveSellingPrice(input: SolverInput): SolverResult {
    const { mode, targetValue, cogs, totalFeeRate, fixedAmountFees, feeConfig } = input;

    // STRICT SAFETY CHECK: Only fallback if undefined/null/NaN.
    // ZERO (0) IS VALID AND MUST BE PRESERVED.
    const cleanTarget = (targetValue === undefined || targetValue === null || isNaN(targetValue)) ? 0 : targetValue;

    // DEBUG: Log solver inputs
    console.log('🔧 solveSellingPrice running with:', {
        originalTarget: targetValue,
        cleanTarget,
        cogs,
        mode,
        totalFeeRate,
        fixedAmountFees,
        hasFeeConfig: !!feeConfig
    });

    // Validate inputs - note: targetValue = 0 is valid (break-even)
    if (cogs < 0) {
        return { success: false, price: null, error: 'Giá vốn không hợp lệ' };
    }

    const R = totalFeeRate;
    const K = fixedAmountFees;
    const C = cogs;
    const T = cleanTarget;

    // Calculate required profit based on mode
    let requiredProfit: number;
    switch (mode) {
        case 'FIXED_AMOUNT':
            requiredProfit = T; // Target is exact VND amount
            break;
        case 'ROI_PERCENT':
            requiredProfit = C * (T / 100); // Target is % of COGS
            break;
        case 'MARGIN_PERCENT':
            // For margin, we'll handle differently in the iteration
            requiredProfit = 0; // Placeholder
            break;
        default:
            return { success: false, price: null, error: 'Chế độ không hợp lệ' };
    }

    // If no fee config with caps provided, use simple linear formula
    if (!feeConfig) {
        let price: number;

        switch (mode) {
            case 'FIXED_AMOUNT': {
                const denominator = 1 - R;
                if (denominator <= 0) {
                    return { success: false, price: null, error: 'Tổng phí vượt quá 100%' };
                }
                price = (T + C + K) / denominator;
                break;
            }
            case 'ROI_PERCENT': {
                const denominator = 1 - R;
                if (denominator <= 0) {
                    return { success: false, price: null, error: 'Tổng phí vượt quá 100%' };
                }
                price = (C * (1 + T / 100) + K) / denominator;
                break;
            }
            case 'MARGIN_PERCENT': {
                const denominator = 1 - R - T / 100;
                if (denominator <= 0) {
                    return { success: false, price: null, error: `Biên lợi nhuận ${T}% không khả thi` };
                }
                price = (C + K) / denominator;
                break;
            }
            default:
                return { success: false, price: null, error: 'Chế độ không hợp lệ' };
        }

        const roundedPrice = Math.round(price);
        if (roundedPrice < 0) {
            return { success: false, price: null, error: 'Không thể đạt mục tiêu' };
        }
        return { success: true, price: roundedPrice };
    }

    // === ITERATIVE SOLVER WITH FEE CAPS ===
    // Start with an initial estimate using the linear formula
    let price: number;
    const denominator = 1 - R;

    if (mode === 'MARGIN_PERCENT') {
        const margDenom = 1 - R - T / 100;
        if (margDenom <= 0) {
            return { success: false, price: null, error: `Biên lợi nhuận ${T}% không khả thi` };
        }
        price = (C + K) / margDenom;
    } else {
        if (denominator <= 0) {
            return { success: false, price: null, error: 'Tổng phí vượt quá 100%' };
        }
        price = (C + requiredProfit + K) / denominator;
    }

    // Iterate to refine
    const MAX_ITERATIONS = 20;
    const TOLERANCE = 100; // VND tolerance

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const actualFees = calculateActualFees(price, feeConfig, K);

        let targetPrice: number;
        if (mode === 'MARGIN_PERCENT') {
            // For margin: Profit = Price * (T/100)
            // Price - COGS - Fees = Price * (T/100)
            // Price * (1 - T/100) = COGS + Fees
            // Price = (COGS + Fees) / (1 - T/100)
            const margDenom = 1 - T / 100;
            if (margDenom <= 0) {
                return { success: false, price: null, error: `Biên lợi nhuận ${T}% không khả thi` };
            }
            targetPrice = (C + actualFees + K) / margDenom;
        } else {
            // For FIXED_AMOUNT and ROI_PERCENT:
            // Price = COGS + RequiredProfit + Fees + ShopVoucher
            targetPrice = C + requiredProfit + actualFees + K;
        }

        const diff = Math.abs(targetPrice - price);
        console.log(`🔧 Iteration ${i + 1}: price=${Math.round(price)}, targetPrice=${Math.round(targetPrice)}, diff=${Math.round(diff)}`);

        if (diff < TOLERANCE) {
            // Converged
            const roundedPrice = Math.round(targetPrice);
            console.log('🔧 Solver converged to:', roundedPrice);
            if (roundedPrice < 0) {
                return { success: false, price: null, error: 'Không thể đạt mục tiêu' };
            }
            return { success: true, price: roundedPrice };
        }

        price = targetPrice;
    }

    // Return best estimate even if not fully converged
    const roundedPrice = Math.round(price);
    console.log('🔧 Solver max iterations reached, returning:', roundedPrice);
    if (roundedPrice < 0) {
        return { success: false, price: null, error: 'Không thể đạt mục tiêu' };
    }
    return { success: true, price: roundedPrice };
}

/**
 * Helper to get the Vietnamese label for each pricing mode
 */
export function getPricingModeLabel(mode: PricingMode): string {
    switch (mode) {
        case 'FIXED_AMOUNT':
            return 'VNĐ';
        case 'ROI_PERCENT':
            return '% ROI';
        case 'MARGIN_PERCENT':
            return '% Margin';
        default:
            return '';
    }
}

/**
 * Helper to get the tooltip explanation for each mode
 */
export function getPricingModeTooltip(mode: PricingMode): string {
    switch (mode) {
        case 'FIXED_AMOUNT':
            return 'Lợi nhuận cố định (VNĐ)';
        case 'ROI_PERCENT':
            return '% Lãi trên Vốn (Lợi nhuận / Giá vốn)';
        case 'MARGIN_PERCENT':
            return '% Lãi trên Doanh thu (Lợi nhuận / Giá bán)';
        default:
            return '';
    }
}
