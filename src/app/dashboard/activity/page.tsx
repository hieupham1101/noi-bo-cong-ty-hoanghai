'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Clock, Search, Package, Edit2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ProductDetailSheet } from '@/components/product-detail-sheet'
import { getSystemConfig } from '@/app/actions/system-config'
import { type ShopeeSettings } from '@/lib/shopee-logic'

interface Product {
    id: string
    sku: string
    name: string
    costPrice: number
    sellingPrice: number
    stock: number
    updatedAt: string
    createdAt: string
    lastEditedBy: string | null
    weight: number
    length: number
    width: number
    height: number
    isDimensionMissing: boolean
    competitorPrice: number | null
    useFreeshshipXtra: boolean
    mallCategoryId: string | null
    categoryType: 'LAPTOP_PHONE' | 'APPLIANCE' | 'ACCESSORY'
    estimatedShippingFee: number
    useVoucherXtra: boolean
    customFixedFee: number | null
}

interface RecentProductsResponse {
    products: Product[]
    total: number
}

export default function RecentProductsPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    // Fetch system config for the modal
    const { data: systemConfig } = useQuery({
        queryKey: ['systemConfig'],
        queryFn: async () => getSystemConfig()
    })

    // Fetch recently updated products
    const { data, isLoading, refetch } = useQuery<RecentProductsResponse>({
        queryKey: ['recent-products', search],
        queryFn: async () => {
            const params = new URLSearchParams({ search, limit: '30' })
            const res = await fetch(`/api/recent-products?${params}`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        }
    })

    const products = data?.products || []

    // Legacy settings for ProductDetailSheet compatibility
    const legacySettings: ShopeeSettings = {
        paymentFeePercent: 0.0491,
        fixedFeePercent: 0,
        serviceFeePercent: systemConfig?.serviceFeePercent || 0.06,
        serviceFeeMaxCap: systemConfig?.maxServiceFee || 40000,
        volumetricDivisor: systemConfig?.weightConstant || 6000,
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

    // Update product mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Update failed')
            return res.json()
        },
        onSuccess: () => {
            refetch()
            router.refresh()
        },
    })

    const handleUpdateProduct = async (id: string, data: Partial<Product>) => {
        return updateMutation.mutateAsync({ id, data })
    }

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product)
        setIsSheetOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4">
            {/* Header Area */}
            <div className="flex flex-col gap-4 pb-4 border-b shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-indigo-600" />
                            Sản phẩm cập nhật gần đây
                        </h1>
                        <p className="text-sm text-slate-500">
                            Danh sách sản phẩm được chỉnh sửa gần đây nhất. Click để xem chi tiết và lịch sử chỉnh sửa.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm theo SKU hoặc Tên sản phẩm..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Products List */}
            <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-3 pb-10">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Package className="h-8 w-8 text-slate-300" />
                            </div>
                            <p>Không tìm thấy sản phẩm nào.</p>
                        </div>
                    ) : (
                        products.map((product) => (
                            <Card
                                key={product.id}
                                className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
                                onClick={() => handleProductClick(product)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-900 truncate">
                                                    {product.name}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                                                    {product.sku}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(product.updatedAt), {
                                                        addSuffix: true,
                                                        locale: vi
                                                    })}
                                                </span>
                                                {product.lastEditedBy && (
                                                    <span className="flex items-center gap-1">
                                                        <Edit2 className="h-3 w-3" />
                                                        {product.lastEditedBy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400 uppercase">Tồn kho</div>
                                                <Badge
                                                    variant={product.stock === 0 ? "destructive" : "secondary"}
                                                    className="font-mono"
                                                >
                                                    {product.stock}
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400 uppercase">Giá bán</div>
                                                <span className="font-bold text-slate-900">
                                                    {product.sellingPrice.toLocaleString()}đ
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* ProductDetailSheet Modal */}
            {systemConfig && (
                <ProductDetailSheet
                    product={selectedProduct}
                    systemConfig={systemConfig}
                    settings={legacySettings}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    onSave={handleUpdateProduct}
                />
            )}
        </div>
    )
}
