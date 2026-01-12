import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortByStock = searchParams.get('sortByStock') === 'true'

    const skip = (page - 1) * limit

    try {
        const whereClause = {
            OR: [
                { sku: { contains: search } },
                { name: { contains: search } },
            ],
        }

        const [products, totalItems] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                take: limit,
                skip: skip,
                orderBy: sortByStock
                    ? [{ stock: 'desc' }, { createdAt: 'desc' }]
                    : { createdAt: 'desc' },
            }),
            prisma.product.count({
                where: whereClause,
            }),
        ])

        const totalPages = Math.ceil(totalItems / limit)

        return NextResponse.json({
            data: products,
            meta: {
                totalItems,
                totalPages,
                currentPage: page,
                limit,
            },
        })
    } catch (error) {
        console.error('Products fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
