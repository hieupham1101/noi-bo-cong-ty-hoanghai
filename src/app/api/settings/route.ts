import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        let settings = await prisma.settings.findUnique({
            where: { id: 'default' },
        })

        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 'default' },
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const settings = await prisma.settings.upsert({
            where: { id: 'default' },
            update: {
                paymentFeePercent: body.paymentFeePercent,
                fixedFeePercent: body.fixedFeePercent,
                serviceFeePercent: body.serviceFeePercent,
                serviceFeeMaxCap: body.serviceFeeMaxCap,
                volumetricDivisor: body.volumetricDivisor,
            },
            create: {
                id: 'default',
                paymentFeePercent: body.paymentFeePercent,
                fixedFeePercent: body.fixedFeePercent,
                serviceFeePercent: body.serviceFeePercent,
                serviceFeeMaxCap: body.serviceFeeMaxCap,
                volumetricDivisor: body.volumetricDivisor,
            },
        })

        return NextResponse.json(settings)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
