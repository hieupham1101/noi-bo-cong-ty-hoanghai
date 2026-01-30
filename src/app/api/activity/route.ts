import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const user = searchParams.get('user') || 'all'
    const sku = searchParams.get('sku') || ''  // Filter by product SKU (Legacy)
    const entityId = searchParams.get('entityId') || '' // Exact filter by Entity ID
    const limit = 20
    const skip = (page - 1) * limit

    try {
        // Build filter conditions
        const where: any = {}

        if (entityId) {
            where.entityId = entityId
        } else if (sku) {
            // Fallback for SKU search if no ID provided
            where.entityName = { contains: sku, mode: 'insensitive' }
        }

        if (user && user !== 'all') {
            where.userId = user
        }

        if (search) {
            where.OR = [
                { entityName: { contains: search, mode: 'insensitive' } },
                { actionType: { contains: search, mode: 'insensitive' } },
                { userId: { contains: search, mode: 'insensitive' } },
            ]
        }

        const [logs, total, users] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.activityLog.count({ where }),
            // Fetch distinct users
            prisma.activityLog.findMany({
                distinct: ['userId'],
                select: { userId: true },
                where: { userId: { not: null } }
            })
        ])

        return NextResponse.json({
            logs,
            users: users.map(u => u.userId).filter(Boolean),
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            }
        })
    } catch (error) {
        console.error('Fetch logs error:', error)
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
}


