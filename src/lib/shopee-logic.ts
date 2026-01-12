import { safeRound } from './utils'
import prisma from './prisma'
import { ShopType } from '@prisma/client'

/**
 * Shopee Fee Formula 2024-2026 for Electronics
 */

export interface FeeBreakdown {
    paymentFee: number // 5%
    fixedFee: number // 4% (Non-Mall)
    serviceFee: number // Freeship Xtra, etc.
    shopeeTotalFees: number
    netProfit: number
    billableWeight: number
}

export interface ShopeeSettings {
    // Legacy support
    paymentFeePercent: number
    fixedFeePercent: number
    serviceFeePercent: number
    serviceFeeMaxCap: number
    volumetricDivisor: number

    // FY2026 Constants
    ratePayment: number        // 0.0491
    rateTax: number            // 0.015
    rateFixedLaptop: number    // 0.0147
    rateFixedAppliance: number // 0.0687
    rateFixedAccessory: number // 0.0884
    rateVoucherXtra: number    // 0.04
    capVoucherXtra: number     // 50000
    feeInfrastructure: number  // 3000
    capServiceFee: number      // 53000
}

export type CategoryType = 'LAPTOP_PHONE' | 'APPLIANCE' | 'ACCESSORY'

export interface FY2026FeeBreakdown {
    paymentFee: number       // 4.91% of (P + S)
    fixedFee: number         // Category-based %
    taxDeduction: number     // 1.5%
    voucherXtraFee: number   // 4% capped at 50k
    infrastructureFee: number // Fixed 3k
    serviceFee: number       // Freeship/Video
    totalFees: number
    netProfit: number
    finalPrice: number
}

export const calculateShopeeFees = (
    sellingPrice: number,
    costPrice: number,
    weight: number, // Actual weight in grams
    length: number, // cm
    width: number,  // cm
    height: number, // cm
    settings: ShopeeSettings
): FeeBreakdown => {
    if (sellingPrice <= 0) {
        return {
            paymentFee: 0,
            fixedFee: 0,
            serviceFee: 0,
            shopeeTotalFees: 0,
            netProfit: -costPrice,
            billableWeight: weight,
        }
    }

    // 1. Payment Fee
    const paymentFee = sellingPrice * settings.paymentFeePercent

    // 2. Fixed Fee
    const fixedFee = sellingPrice * settings.fixedFeePercent

    // 3. Service Fee
    const serviceFee = Math.min(
        sellingPrice * settings.serviceFeePercent,
        settings.serviceFeeMaxCap
    )

    // 4. Dimensional Weight
    const volumetricWeight = (length * width * height) / settings.volumetricDivisor
    const billableWeight = Math.max(weight, volumetricWeight)

    const shopeeTotalFees = paymentFee + fixedFee + serviceFee
    const netProfit = sellingPrice - (costPrice + shopeeTotalFees)

    return {
        paymentFee,
        fixedFee,
        serviceFee,
        shopeeTotalFees,
        netProfit,
        billableWeight,
    }
}

export const calculateSuggestedPrice = (
    costPrice: number,
    targetMarginPercent: number,
    settings: ShopeeSettings
): number => {
    // Prevent division by zero or negative logic if margins are unrealistic
    const targetNetProfit = costPrice * (targetMarginPercent / 100)
    const baseRequirement = costPrice + targetNetProfit

    // Step A: Assume Service Fee hits the CAP
    const totalFixedDeductions = baseRequirement + settings.serviceFeeMaxCap
    const variableFeePercentA = settings.paymentFeePercent + settings.fixedFeePercent

    if (variableFeePercentA >= 1) return 0 // Impossible scenario

    const suggestedPriceA = totalFixedDeductions / (1 - variableFeePercentA)

    // Step B: Verify if this price actually triggers the Cap
    const potentialServiceFee = suggestedPriceA * settings.serviceFeePercent

    if (potentialServiceFee > settings.serviceFeeMaxCap) {
        // Yes, it hits the cap, so assumption A was correct.
        return Math.ceil(suggestedPriceA / 1000) * 1000 // Round up to nearest 1000
    } else {
        // No, it doesn't hit the cap. We must use the full percentage formula.
        const totalFeePercentB = variableFeePercentA + settings.serviceFeePercent

        if (totalFeePercentB >= 1) return 0 // Impossible

        const suggestedPriceB = baseRequirement / (1 - totalFeePercentB)
        return Math.ceil(suggestedPriceB / 1000) * 1000 // Round up to nearest 1000
    }
}

/**
 * Calculate the break-even price (minimum price to avoid losses)
 * Handles the service fee cap correctly using iterative approach
 */
export const calculateBreakEvenPrice = (
    costPrice: number,
    settings: ShopeeSettings,
    useFreeship: boolean = true
): number => {
    if (costPrice <= 0) return 0

    // Calculate total fee percentage without service fee
    const baseFeePercent = settings.paymentFeePercent + settings.fixedFeePercent
    const serviceFeePercent = useFreeship ? settings.serviceFeePercent : 0
    const serviceFeeMaxCap = useFreeship ? settings.serviceFeeMaxCap : 0

    // First, try assuming service fee doesn't hit the cap
    // breakEven = costPrice / (1 - totalFeePercent)
    const totalFeePercentNoCap = baseFeePercent + serviceFeePercent

    if (totalFeePercentNoCap >= 1) return 0 // Invalid scenario

    const breakEvenNoCap = costPrice / (1 - totalFeePercentNoCap)

    // Check if service fee would exceed the cap at this price
    const serviceFeeAtNoCap = breakEvenNoCap * serviceFeePercent

    if (serviceFeeAtNoCap <= serviceFeeMaxCap || !useFreeship) {
        // Service fee doesn't hit cap, our calculation is correct
        return Math.ceil(breakEvenNoCap)
    }

    // Service fee hits the cap - need different formula
    // breakEven = (costPrice + serviceFeeMaxCap) / (1 - baseFeePercent)
    if (baseFeePercent >= 1) return 0 // Invalid scenario

    const breakEvenWithCap = (costPrice + serviceFeeMaxCap) / (1 - baseFeePercent)
    return Math.ceil(breakEvenWithCap)
}

/**
 * Get a psychological price suggestion
 * Suggests prices ending in 90,000 or 990,000
 */
export const getPsychologicalPrice = (price: number): number[] => {
    if (price <= 0) return []

    const suggestions: number[] = []

    // Round to nearest X90,000 (for prices like 190,000, 290,000, etc.)
    const nearestNinety = Math.round(price / 100000) * 100000 - 10000
    if (nearestNinety > 0 && Math.abs(nearestNinety - price) <= 50000) {
        suggestions.push(nearestNinety)
    }

    // Round to nearest X99,000 (for prices like 199,000, 299,000, etc.)
    const nearestNinetyNine = Math.round(price / 100000) * 100000 - 1000
    if (nearestNinetyNine > 0 && Math.abs(nearestNinetyNine - price) <= 50000) {
        suggestions.push(nearestNinetyNine)
    }

    // For larger prices, suggest X90,000 or X990,000
    if (price >= 500000) {
        const nearestMillion = Math.round(price / 1000000) * 1000000 - 10000
        if (nearestMillion > 0 && Math.abs(nearestMillion - price) <= 100000) {
            suggestions.push(nearestMillion)
        }
    }

    // Remove duplicates and sort by closeness to original price
    return [...new Set(suggestions)]
        .filter(s => s > 0)
        .sort((a, b) => Math.abs(a - price) - Math.abs(b - price))
        .slice(0, 2)
}

/**
 * FY2026 Reverse Pricing Calculation
 * Formula: P = (C + M + Rate_Pay*S + F_const) / (1 - (Rate_Pay + Rate_Fixed + Rate_Tax))
 */
export const calculateSuggestedPriceFY2026 = (
    costPrice: number,
    targetMargin: number,
    estimatedShippingFee: number,
    categoryType: CategoryType,
    useVoucherXtra: boolean,
    useFreeshipXtra: boolean,
    customFixedFee: number | null,
    settings: ShopeeSettings
): FY2026FeeBreakdown => {
    // Defaults for missing settings (FY2026)
    const ratePayment = settings.ratePayment ?? 0.0491
    const rateTax = settings.rateTax ?? 0.015
    const rateFixedLaptop = settings.rateFixedLaptop ?? 0.0147
    const rateFixedAppliance = settings.rateFixedAppliance ?? 0.0687
    const rateFixedAccessory = settings.rateFixedAccessory ?? 0.0884
    const rateVoucherXtra = settings.rateVoucherXtra ?? 0.04
    const capVoucherXtra = settings.capVoucherXtra ?? 50000
    const feeInfrastructure = settings.feeInfrastructure ?? 3000
    const capServiceFee = settings.capServiceFee ?? 53000
    const serviceRate = settings.serviceFeePercent ?? 0.06

    // 1. Determine Fixed Fee Rate
    let rateFixed = rateFixedAccessory
    if (customFixedFee !== null && customFixedFee !== undefined) {
        rateFixed = customFixedFee / 100 // Convert percentage to decimal
    } else {
        if (categoryType === 'LAPTOP_PHONE') rateFixed = rateFixedLaptop
        if (categoryType === 'APPLIANCE') rateFixed = rateFixedAppliance
    }

    // 2. Constants
    // (Constants already defined above with defaults)
    const infraFee = feeInfrastructure

    // Service Fee (Simplification: Treat as essentially fixed deduction if maxed, or rate if not)
    // The user says "Service Fee is CAPPED at 53,000". This usually implies a rate (e.g. 5-6%) capped at 53k.
    // However, reverse calculating a capped component is tricky (is it below or above cap?).
    // Given the cap (53k) is relatively low for electronics, we can check 2 scenarios:
    // A: Service Fee = Cap (Price is High) -> Most likely for electronics
    // B: Service Fee = Rate * Price (Price is Low)

    // Let's assume typical Freeship Xtra rate is ~6% (Legacy serviceFeePercent) or use the user's implicit rate.
    // For now, let's use the legacy serviceFeePercent as the rate for this new Service Fee component.
    const serviceCap = capServiceFee
    // If Freeship is OFF, fee is 0.
    const effectiveServiceRate = useFreeshipXtra ? serviceRate : 0
    const effectiveServiceCap = useFreeshipXtra ? serviceCap : 0

    // 3. Solve for P
    const denominatorBase = 1 - (ratePayment + rateFixed + rateTax)

    // Option A: Price is HIGH (Voucher Xtra capped at 50k AND Service Fee capped at 53k)
    const fConstA = (useVoucherXtra ? capVoucherXtra : 0) + infraFee + effectiveServiceCap
    const numeratorA = costPrice + targetMargin + (ratePayment * estimatedShippingFee) + fConstA

    const priceA = numeratorA / denominatorBase

    // Option B: Price is LOW (Voucher Xtra is 4% AND Service Fee is Rate%)
    // Denominator_B = D - Rate_VoucherXtra - Rate_Service
    const fConstB = infraFee
    const denominatorB = denominatorBase - (useVoucherXtra ? rateVoucherXtra : 0) - effectiveServiceRate
    const numeratorB = costPrice + targetMargin + (ratePayment * estimatedShippingFee) + fConstB

    const priceB = numeratorB / denominatorB

    // Option C: Mixed (Voucher Capped, Service Rate) or (Voucher Rate, Service Capped)
    // usually priceA and priceB cover extremes. 
    // Let's check consistency.

    let finalPrice = 0

    // Check Price A consistency: Does P_A trigger both caps?
    const isVoucherCappedA = (priceA * rateVoucherXtra) >= capVoucherXtra
    const isServiceCappedA = (priceA * serviceRate) >= serviceCap

    if (isVoucherCappedA && isServiceCappedA) {
        finalPrice = priceA
    } else {
        // Fallback to max or checking B
        const isVoucherCappedB = (priceB * rateVoucherXtra) >= capVoucherXtra
        const isServiceCappedB = (priceB * serviceRate) >= serviceCap

        if (!isVoucherCappedB && !isServiceCappedB) {
            finalPrice = priceB
        } else {
            // Intermediate cases (e.g. Service capped but Voucher not)
            // Case C: Service Capped, Voucher Rate
            const fConstC = infraFee + effectiveServiceCap
            const denominatorC = denominatorBase - (useVoucherXtra ? rateVoucherXtra : 0)
            const numeratorC = costPrice + targetMargin + (ratePayment * estimatedShippingFee) + fConstC
            const priceC = numeratorC / denominatorC

            // Check consistency
            if ((priceC * serviceRate >= serviceCap) && (priceC * rateVoucherXtra < capVoucherXtra)) {
                finalPrice = priceC
            } else {
                // Case D: Service Rate, Voucher Capped
                const fConstD = (useVoucherXtra ? capVoucherXtra : 0) + infraFee
                const denominatorD = denominatorBase - effectiveServiceRate
                const numeratorD = costPrice + targetMargin + (ratePayment * estimatedShippingFee) + fConstD
                const priceD = numeratorD / denominatorD

                finalPrice = priceD
            }
        }
    }

    // Round to nearest 1000
    finalPrice = Math.ceil(finalPrice / 1000) * 1000

    return calculateFY2026Fees(finalPrice, costPrice, estimatedShippingFee, categoryType, useVoucherXtra, useFreeshipXtra, customFixedFee, settings)
}

export const calculateFY2026Fees = (
    sellingPrice: number,
    costPrice: number,
    estimatedShippingFee: number,
    categoryType: CategoryType,
    useVoucherXtra: boolean,
    useFreeshipXtra: boolean,
    customFixedFee: number | null,
    settings: ShopeeSettings
): FY2026FeeBreakdown => {
    // Ensure inputs are valid numbers
    const validSellingPrice = Number.isFinite(sellingPrice) ? sellingPrice : 0
    const validCostPrice = Number.isFinite(costPrice) ? costPrice : 0
    const validShipping = Number.isFinite(estimatedShippingFee) ? estimatedShippingFee : 0

    // Defaults for missing settings (FY2026) -> Safe guards against undefined settings
    const ratePayment = settings?.ratePayment ?? 0.0491
    const rateTax = settings?.rateTax ?? 0.015
    const rateFixedLaptop = settings?.rateFixedLaptop ?? 0.0147
    const rateFixedAppliance = settings?.rateFixedAppliance ?? 0.0687
    const rateFixedAccessory = settings?.rateFixedAccessory ?? 0.0884
    const rateVoucherXtra = settings?.rateVoucherXtra ?? 0.04
    const capVoucherXtra = settings?.capVoucherXtra ?? 50000
    const feeInfrastructure = settings?.feeInfrastructure ?? 3000
    const capServiceFee = settings?.capServiceFee ?? 53000

    // 1. Determine Fixed Fee Rate
    let rateFixed = rateFixedAccessory
    if (customFixedFee !== null && customFixedFee !== undefined && Number.isFinite(customFixedFee)) {
        rateFixed = customFixedFee / 100
    } else {
        if (categoryType === 'LAPTOP_PHONE') rateFixed = rateFixedLaptop
        if (categoryType === 'APPLIANCE') rateFixed = rateFixedAppliance
    }

    // 2. Calculate Components (Round each to integer to match billing logic)
    const paymentFee = safeRound((validSellingPrice + validShipping) * ratePayment)
    const fixedFee = safeRound(validSellingPrice * rateFixed)
    const taxDeduction = safeRound(validSellingPrice * rateTax)
    const infrastructureFee = feeInfrastructure // Fixed integer already

    let voucherXtraFee = 0
    if (useVoucherXtra) {
        const calculated = validSellingPrice * rateVoucherXtra
        // Cap is integer
        voucherXtraFee = Math.min(safeRound(calculated), capVoucherXtra)
    }

    let serviceFee = 0
    if (useFreeshipXtra) {
        // Use legacy serviceFeePercent (usually 6% or similar) but with new Cap
        const serviceRate = settings.serviceFeePercent ?? 0.06
        const calculatedService = validSellingPrice * serviceRate
        serviceFee = Math.min(safeRound(calculatedService), capServiceFee)
    }

    // 3. Summation (Integer Math)
    const totalFees = paymentFee + fixedFee + taxDeduction + voucherXtraFee + infrastructureFee + serviceFee
    const netProfit = validSellingPrice - validCostPrice - totalFees

    return {
        paymentFee,
        fixedFee,
        taxDeduction,
        voucherXtraFee,
        infrastructureFee,
        serviceFee,
        totalFees,
        netProfit,
        finalPrice: validSellingPrice
    }
}

// ============================
// SHOPEE FEE CALCULATION SERVICE
// ============================

/**
 * Input type for calculateShopeeFee function
 */
export interface CalculateShopeeFeeInput {
    price: number
    categorySlug: string
    isShopMall: boolean
}

/**
 * Output type for calculateShopeeFee function
 */
export interface CalculateShopeeFeeResult {
    originalPrice: number      // The input price
    feeRate: number            // Fee percentage from DB (e.g., 5.5 for 5.5%)
    feeAmount: number          // Calculated fee amount (rounded to integer)
    finalReceivedAmount: number // Price minus fee (what seller receives)
}

/**
 * Custom error class for fee rate not found scenarios
 */
export class FeeRateNotFoundError extends Error {
    constructor(categorySlug: string, shopType: string) {
        super(`Fee rate not configured for category "${categorySlug}" and shop type "${shopType}"`)
        this.name = 'FeeRateNotFoundError'
    }
}

/**
 * Calculate Shopee fee based on price, category, and shop type
 * 
 * @param price - The selling price
 * @param categorySlug - The category slug to look up fee rate
 * @param isShopMall - Whether the shop is a Mall shop (true) or Normal shop (false)
 * @returns Promise<CalculateShopeeFeeResult> - Calculated fee details
 * @throws FeeRateNotFoundError if no fee configuration exists for the category/shop type
 */
export async function calculateShopeeFee(
    price: number,
    categorySlug: string,
    isShopMall: boolean
): Promise<CalculateShopeeFeeResult> {
    // 1. Determine ShopType
    const shopType: ShopType = isShopMall ? ShopType.MALL : ShopType.NORMAL

    // 2. Query the FeeRate model based on categorySlug and shopType
    const feeRate = await prisma.feeRate.findFirst({
        where: {
            category: {
                slug: categorySlug
            },
            shopType: shopType
        },
        include: {
            category: true
        }
    })

    // 3. Error handling: throw if no fee configuration found
    if (!feeRate) {
        throw new FeeRateNotFoundError(categorySlug, shopType)
    }

    // 4. Calculate fee amount
    // Formula: Fee Amount = Price * (Percentage / 100)
    const feeAmount = safeRound(price * (feeRate.percentage / 100))

    // Calculate final received amount (what seller gets after fee deduction)
    const finalReceivedAmount = safeRound(price - feeAmount)

    // 5. Return the result object with strong typing
    return {
        originalPrice: price,
        feeRate: feeRate.percentage,
        feeAmount: feeAmount,
        finalReceivedAmount: finalReceivedAmount
    }
}
