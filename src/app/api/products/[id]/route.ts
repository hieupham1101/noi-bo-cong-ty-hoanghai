import { logActivity } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { Product, CategoryType } from '@prisma/client'

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { id } = await params
        const body = await req.json()
        const {
            sellingPrice,
            length,
            width,
            height,
            weight,
            costPrice,
            competitorPrice,
            useFreeshshipXtra,
            mallCategoryId,
            categoryType,
            estimatedShippingFee,
            useVoucherXtra,
            customFixedFee
        } = body

        // Fetch current product state for audit log comparing
        const oldProduct = await prisma.product.findUnique({
            where: { id },
            select: {
                id: true,
                sku: true,
                name: true,
                costPrice: true,
                sellingPrice: true,
                mallCategoryId: true,
                isDimensionMissing: true,
                length: true,
                width: true,
                height: true,
                weight: true,
            }
        })

        if (!oldProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

        const isDimensionMissing = !length && !width && !height && !weight
            ? oldProduct.isDimensionMissing
            : (!length || !width || !height || !weight)

        const product = await prisma.product.update({
            where: { id: id },
            data: {
                sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
                costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
                length: length !== undefined ? Number(length) : undefined,
                width: width !== undefined ? Number(width) : undefined,
                height: height !== undefined ? Number(height) : undefined,
                weight: weight !== undefined ? Number(weight) : undefined,
                competitorPrice: competitorPrice !== undefined ? (competitorPrice === null ? null : Number(competitorPrice)) : undefined,
                useFreeshshipXtra: useFreeshshipXtra !== undefined ? Boolean(useFreeshshipXtra) : undefined,

                // Relation Update for Mall Category (Safe connect/disconnect)
                mallCategory: mallCategoryId !== undefined
                    ? (mallCategoryId === null ? { disconnect: true } : { connect: { id: mallCategoryId } })
                    : undefined,

                // FY2026 Fields with strict Enum casting
                categoryType: categoryType !== undefined ? (categoryType as CategoryType) : undefined,
                estimatedShippingFee: estimatedShippingFee !== undefined ? Number(estimatedShippingFee) : undefined,
                useVoucherXtra: useVoucherXtra !== undefined ? Boolean(useVoucherXtra) : undefined,
                customFixedFee: customFixedFee !== undefined ? (customFixedFee === null ? null : Number(customFixedFee)) : undefined,

                isDimensionMissing: isDimensionMissing,
                lastEditedBy: session.user?.email || 'System',
            },
        })

        // Capture diffs for Activity Log
        const diffs: Record<string, any> = {}
        if (sellingPrice !== undefined && sellingPrice !== oldProduct.sellingPrice)
            diffs.sellingPrice = { old: oldProduct.sellingPrice, new: sellingPrice }
        if (costPrice !== undefined && costPrice !== oldProduct.costPrice)
            diffs.costPrice = { old: oldProduct.costPrice, new: costPrice }
        if (mallCategoryId !== undefined && mallCategoryId !== oldProduct.mallCategoryId)
            diffs.mallCategoryId = { old: oldProduct.mallCategoryId, new: mallCategoryId }

        // Only log if something important changed
        if (Object.keys(diffs).length > 0) {
            await logActivity({
                userId: session.user?.email || 'Unknown',
                actionType: 'UPDATE_PRODUCT',
                entityName: product.name,
                entityId: product.id,
                details: diffs
            })
        }

        // CRITICAL FIX: Revalidate paths to refresh UI immediately
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/activity')

        return NextResponse.json(product)
    } catch (error) {
        console.error('Update error:', error)
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}
