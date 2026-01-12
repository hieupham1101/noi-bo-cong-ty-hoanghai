'use server'

import prisma from '@/lib/prisma'
import { calculateShopeeFee, FeeRateNotFoundError } from '@/lib/shopee-logic'

/**
 * Fetch all categories from the database
 */
export async function getCategories() {
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            slug: true,
            feeRates: {
                select: {
                    shopType: true,
                    percentage: true
                }
            }
        }
    })
    return categories
}

export interface CalculateFeeResult {
    success: true
    data: {
        originalPrice: number
        feeRate: number
        feeAmount: number
        finalReceivedAmount: number
    }
}

export interface CalculateFeeError {
    success: false
    error: string
}

/**
 * Server action wrapper for calculateShopeeFee
 */
export async function calculateFee(
    price: number,
    categorySlug: string,
    isShopMall: boolean
): Promise<CalculateFeeResult | CalculateFeeError> {
    try {
        // Validate inputs
        if (!price || price <= 0) {
            return { success: false, error: 'Vui lòng nhập giá bán hợp lệ' }
        }
        if (!categorySlug) {
            return { success: false, error: 'Vui lòng chọn danh mục' }
        }

        const result = await calculateShopeeFee(price, categorySlug, isShopMall)

        return {
            success: true,
            data: result
        }
    } catch (error) {
        if (error instanceof FeeRateNotFoundError) {
            return {
                success: false,
                error: `Chưa cấu hình phí cho danh mục này. Vui lòng liên hệ Admin.`
            }
        }
        console.error('Calculate fee error:', error)
        return { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }
    }
}
