import { logActivity } from '@/lib/logger'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { calculateSuggestedPrice, type ShopeeSettings } from '@/lib/shopee-logic'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
    const session = await auth()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const products = await req.json()

        if (!Array.isArray(products)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
        }

        if (products.length === 0) {
            return NextResponse.json({ message: 'No products to import' })
        }

        // Fetch settings for calculation
        const dbSettings = await prisma.settings.findFirst({
            where: { id: 'default' }
        })

        // Default settings if DB is empty (fallback)
        const settings: ShopeeSettings = dbSettings ? {
            ...dbSettings,
            ratePayment: (dbSettings as any).ratePayment ?? 0.0491,
            rateTax: (dbSettings as any).rateTax ?? 0.015,
            rateFixedLaptop: (dbSettings as any).rateFixedLaptop ?? 0.0147,
            rateFixedAppliance: (dbSettings as any).rateFixedAppliance ?? 0.0687,
            rateFixedAccessory: (dbSettings as any).rateFixedAccessory ?? 0.0884,
            rateVoucherXtra: (dbSettings as any).rateVoucherXtra ?? 0.04,
            capVoucherXtra: (dbSettings as any).capVoucherXtra ?? 50000,
            feeInfrastructure: (dbSettings as any).feeInfrastructure ?? 3000,
            capServiceFee: (dbSettings as any).capServiceFee ?? 53000
        } : {
            paymentFeePercent: 0.0491,
            fixedFeePercent: 0,
            serviceFeePercent: 0.06,
            serviceFeeMaxCap: 40000,
            volumetricDivisor: 6000,
            ratePayment: 0.0491,
            rateTax: 0.015,
            rateFixedLaptop: 0.0147,
            rateFixedAppliance: 0.0687,
            rateFixedAccessory: 0.0884,
            rateVoucherXtra: 0.04,
            capVoucherXtra: 50000,
            feeInfrastructure: 3000,
            capServiceFee: 53000
        }

        const BATCH_SIZE = 1000
        const totalBatches = Math.ceil(products.length / BATCH_SIZE)
        console.log(`Starting bulk import for ${products.length} products in ${totalBatches} batches...`)

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            console.log(`Processing batch ${batchNum}/${totalBatches}...`)

            const batch = products.slice(i, i + BATCH_SIZE)
            const values: string[] = []

            for (const product of batch) {
                // Safety sanitization for raw SQL
                const safeName = (product.name || '').replace(/'/g, "''")
                const safeSku = (product.sku || '').replace(/'/g, "''")
                const safeLastEditedBy = (session.user?.email || 'Import').replace(/'/g, "''")

                // Ensure numeric values
                const costPrice = Number(product.costPrice) || 0
                const stock = Number(product.stock) || 0
                const weight = Number(product.weight) || 0

                // Calculate selling price
                const suggestedPrice = calculateSuggestedPrice(costPrice, 10, settings)

                // Generate ID since we are doing manual INSERT
                const id = randomUUID()

                // Construct value tuple: 
                // (id, sku, name, costPrice, stock, weight, sellingPrice, isDimensionMissing, lastEditedBy, createdAt, updatedAt)
                values.push(`('${id}', '${safeSku}', '${safeName}', ${costPrice}, ${stock}, ${weight}, ${suggestedPrice}, true, '${safeLastEditedBy}', NOW(), NOW())`)
            }

            if (values.length > 0) {
                // Construct the MEGA QUERY
                const query = `
                    INSERT INTO "Product" ("id", "sku", "name", "costPrice", "stock", "weight", "sellingPrice", "isDimensionMissing", "lastEditedBy", "createdAt", "updatedAt")
                    VALUES 
                    ${values.join(',\n')}
                    ON CONFLICT ("sku") 
                    DO UPDATE SET
                        "name" = EXCLUDED."name",
                        "costPrice" = EXCLUDED."costPrice",
                        "stock" = EXCLUDED."stock",
                        "weight" = EXCLUDED."weight",
                        "sellingPrice" = EXCLUDED."sellingPrice",
                        "lastEditedBy" = EXCLUDED."lastEditedBy",
                        "updatedAt" = NOW();
                `

                // Execute raw unsafe
                await prisma.$executeRawUnsafe(query)
            }
        }

        await logActivity({
            userId: session.user?.email || 'System',
            actionType: 'IMPORT_EXCEL',
            entityName: 'Product Batch',
            details: {
                count: products.length,
                batches: totalBatches,
                message: `Imported ${products.length} products successfully`
            }
        })

        return NextResponse.json({ message: `Successfully processed ${products.length} products` })
    } catch (error) {
        console.error('Import error:', error)
        return NextResponse.json({
            error: 'Failed to import products',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
