import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    try {
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { sku: { contains: search, mode: 'insensitive' as const } }
            ]
        } : {}

        const products = await prisma.product.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                sku: true,
                name: true,
                costPrice: true,
                sellingPrice: true,
                stock: true,
                updatedAt: true,
                lastEditedBy: true,
                // Include other fields needed by ProductDetailSheet
                weight: true,
                length: true,
                width: true,
                height: true,
                isDimensionMissing: true,
                createdAt: true,
                competitorPrice: true,
                useFreeshshipXtra: true,
                mallCategoryId: true,
                categoryType: true,
                estimatedShippingFee: true,
                useVoucherXtra: true,
                customFixedFee: true,
            }
        })

        return NextResponse.json({
            products: products.map(p => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
            total: products.length
        })
    } catch (error) {
        console.error('Fetch recent products error:', error)
        return NextResponse.json({ error: 'Failed to fetch recent products' }, { status: 500 })
    }
}
