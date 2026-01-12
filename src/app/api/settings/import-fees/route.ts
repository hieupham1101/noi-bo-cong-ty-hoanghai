import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // Read the Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json<{
            Category?: string
            FeePercent?: number
            MinFee?: number
            MaxFee?: number
            MaxCap?: number
        }>(sheet)

        if (!data.length) {
            return NextResponse.json({ error: 'Empty file or invalid format' }, { status: 400 })
        }

        // Upsert each category
        const results = await Promise.all(
            data.map(async (row) => {
                if (!row.Category || row.FeePercent === undefined) {
                    return { skipped: true, reason: 'Missing Category or FeePercent' }
                }

                const categoryName = String(row.Category).trim()
                const feePercent = Number(row.FeePercent)
                const minFee = row.MinFee ? Number(row.MinFee) : null
                const maxFee = row.MaxFee ? Number(row.MaxFee) : null
                const maxCap = row.MaxCap ? Number(row.MaxCap) : null

                if (isNaN(feePercent)) {
                    return { skipped: true, reason: `Invalid FeePercent for ${categoryName}` }
                }

                return prisma.mallCategoryFee.upsert({
                    where: { categoryName },
                    update: { feePercent, minFee, maxFee, maxCap },
                    create: { categoryName, feePercent, minFee, maxFee, maxCap },
                })
            })
        )

        const imported = results.filter((r): r is Exclude<typeof r, { skipped: boolean }> => !('skipped' in r)).length
        const skipped = results.filter((r): r is { skipped: boolean; reason: string } => 'skipped' in r).length

        return NextResponse.json({
            message: `Successfully imported ${imported} categories`,
            imported,
            skipped,
        })
    } catch (error) {
        console.error('Import fees error:', error)
        return NextResponse.json({ error: 'Failed to import fee schedule' }, { status: 500 })
    }
}
