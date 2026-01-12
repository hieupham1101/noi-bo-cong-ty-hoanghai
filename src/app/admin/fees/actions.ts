'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ShopType } from '@prisma/client'

export interface CategoryWithRates {
    id: string
    name: string
    slug: string
    normalRate: number | null
    normalRateId: string | null
    mallRate: number | null
    mallRateId: string | null
    updatedAt: Date | null
}

/**
 * Fetch all categories with their fee rates (NORMAL & MALL)
 */
export async function getFeeRates(): Promise<CategoryWithRates[]> {
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
            feeRates: true
        }
    })

    return categories.map(category => {
        const normalRate = category.feeRates.find(r => r.shopType === 'NORMAL')
        const mallRate = category.feeRates.find(r => r.shopType === 'MALL')

        const latestUpdate = category.feeRates
            .map(r => r.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null

        return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            normalRate: normalRate?.percentage ?? null,
            normalRateId: normalRate?.id ?? null,
            mallRate: mallRate?.percentage ?? null,
            mallRateId: mallRate?.id ?? null,
            updatedAt: latestUpdate
        }
    })
}

export interface UpdateFeeRateResult {
    success: boolean
    error?: string
}

/**
 * Update or create a fee rate for a category and shop type
 */
export async function updateFeeRate(
    categoryId: string,
    shopType: 'NORMAL' | 'MALL',
    percentage: number
): Promise<UpdateFeeRateResult> {
    try {
        if (percentage < 0 || percentage > 100) {
            return { success: false, error: 'Phần trăm phí phải từ 0 đến 100' }
        }

        const prismaShopType: ShopType = ShopType[shopType]

        // Upsert: update if exists, create if not
        await prisma.feeRate.upsert({
            where: {
                categoryId_shopType: {
                    categoryId,
                    shopType: prismaShopType
                }
            },
            update: {
                percentage
            },
            create: {
                categoryId,
                shopType: prismaShopType,
                percentage
            }
        })

        // Revalidate to refresh the page data
        revalidatePath('/admin/fees')

        return { success: true }
    } catch (error) {
        console.error('Update fee rate error:', error)
        return { success: false, error: 'Đã xảy ra lỗi khi cập nhật. Vui lòng thử lại.' }
    }
}
