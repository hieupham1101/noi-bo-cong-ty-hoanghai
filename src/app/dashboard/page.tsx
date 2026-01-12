import prisma from "@/lib/prisma"
import { ProfitTable } from "@/components/profit-table"
import { getSystemConfig } from "@/app/actions/system-config"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams?: Promise<{
        query?: string
        page?: string
        sortByStock?: string
    }>
}) {
    // Await searchParams in case of Next.js future versions / strictness
    const resolvedSearchParams = await searchParams
    const query = resolvedSearchParams?.query || ''
    const currentPage = Number(resolvedSearchParams?.page) || 1
    const sortByStock = resolvedSearchParams?.sortByStock === 'true'
    const limit = 20
    const skip = (currentPage - 1) * limit

    const whereClause = query ? {
        OR: [
            { name: { contains: query, mode: 'insensitive' } as const },
            { sku: { contains: query, mode: 'insensitive' } as const }
        ]
    } : {}

    const orderBy = sortByStock
        ? [{ stock: 'desc' }, { createdAt: 'desc' }]
        : { createdAt: 'desc' }

    // Parallel fetch for perf
    const [systemConfig, productsData] = await Promise.all([
        getSystemConfig(),
        prisma.product.findMany({
            where: whereClause,
            take: limit,
            skip: skip,
            orderBy: orderBy as any // eslint-disable-line @typescript-eslint/no-explicit-any
        }).then(async (products) => {
            const count = await prisma.product.count({ where: whereClause })
            return { products, count }
        })
    ])

    const totalPages = Math.ceil(productsData.count / limit)

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sản phẩm</h1>
                    <p className="text-slate-500 mt-2">Quản lý kho hàng, định giá và phân tích biên lợi nhuận.</p>
                </div>
            </div>

            <div className="w-full">
                {/* Main Content - Product Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <ProfitTable
                        systemConfig={systemConfig}
                        initialProducts={productsData.products.map(p => ({
                            ...p,
                            createdAt: p.createdAt.toISOString(),
                            updatedAt: p.updatedAt.toISOString(),
                        }))}
                        pagination={{
                            currentPage,
                            totalPages,
                            totalItems: productsData.count,
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
