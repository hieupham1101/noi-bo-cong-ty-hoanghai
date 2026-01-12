import { SystemConfig } from '@prisma/client';

export interface CalculationInput {
    sellingPrice: number;
    cogs: number;
    isMall: boolean;
    hasFreeshipXtra: boolean;
    hasVoucherXtra: boolean;
    fixedFeePercent: number; // Added dynamic fee
    config: SystemConfig;
    shopVoucher?: number;
}

export interface CalculationResult {
    revenue: number;
    fixedFee: number;
    paymentFee: number;
    serviceFee: number;
    voucherFee: number;
    totalFees: number;
    netProfit: number;
    roi: number;
}

/**
 * Calculates Shopee profit and fees based on system configuration.
 * Rounds monetary values to the nearest integer.
 */
export function calculateProfit(input: CalculationInput): CalculationResult {
    const { sellingPrice, cogs, hasFreeshipXtra, hasVoucherXtra, fixedFeePercent, config, shopVoucher = 0 } = input;

    const revenue = sellingPrice;

    // Fee Base: Shopee calculates fees on (Price - SellerVoucher)
    const feeBase = Math.max(0, sellingPrice - shopVoucher);

    // Fixed Fee: Use dynamic percent passed from component
    const fixedFee = Math.round(feeBase * fixedFeePercent);

    // Payment Fee
    const paymentFee = Math.round(feeBase * config.paymentFeePercent);

    // Service Fee: Only if FreeShip Xtra is active
    let serviceFee = 0;
    if (hasFreeshipXtra) {
        const calculatedServiceFee = feeBase * config.serviceFeePercent;
        serviceFee = Math.round(Math.min(calculatedServiceFee, config.maxServiceFee));
    }

    // Voucher Xtra Fee: Default 4% capped at 50,000 (Constants for now as missing in DB)
    let voucherFee = 0;
    if (hasVoucherXtra) {
        // constants hardcoded based on known Shopee policies 2024/2026
        // Ideally should be in SystemConfig
        const VOUCHER_RATE = 0.04;
        const VOUCHER_CAP = 50000;
        const calculatedVoucherFee = feeBase * VOUCHER_RATE;
        voucherFee = Math.round(Math.min(calculatedVoucherFee, VOUCHER_CAP));
    }

    const totalFees = fixedFee + paymentFee + serviceFee + voucherFee;

    // Net Profit = Revenue (Selling Price) - COGS - ShopVoucher - Fees
    // OR: Net Payout = (SellingPrice - ShopVoucher - Fees). Net Profit = Net Payout - COGS.
    const netProfit = revenue - shopVoucher - cogs - totalFees;

    // ROI Calculation (Net Profit / COGS)
    const roi = cogs > 0 ? (netProfit / cogs) * 100 : 0;

    return {
        revenue,
        fixedFee,
        paymentFee,
        serviceFee,
        voucherFee,
        totalFees,
        netProfit,
        roi: parseFloat(roi.toFixed(2)), // Keep 2 decimal places for percentage
    };
}
