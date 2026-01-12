import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const categories = await prisma.mallCategoryFee.findMany({
            orderBy: { categoryName: 'asc' },
            select: {
                id: true,
                categoryName: true,
                feePercent: true,
                minFee: true,
                maxFee: true,
                maxCap: true,
                updatedAt: true,
            },
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error('Fetch mall categories error:', error)
        return NextResponse.json({ error: 'Failed to fetch mall categories' }, { status: 500 })
    }
}
