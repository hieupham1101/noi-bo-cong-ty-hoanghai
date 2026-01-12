'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from "@/components/ui/switch"
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { type ShopeeSettings } from '@/lib/shopee-logic'
import { toast } from 'sonner'
import { Search, Loader2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { ProductDetailSheet } from '@/components/product-detail-sheet'
import { SystemConfig } from '@prisma/client'

interface Product {
    id: string
    sku: string
    name: string
    costPrice: number
    stock: number
    sellingPrice: number
    weight: number
    length: number
    width: number
    height: number
    isDimensionMissing: boolean
    createdAt: string
    updatedAt: string
    lastEditedBy: string | null
    competitorPrice: number | null
    useFreeshshipXtra: boolean
    mallCategoryId: string | null
    // FY2026 Fields
    categoryType: 'LAPTOP_PHONE' | 'APPLIANCE' | 'ACCESSORY'
    estimatedShippingFee: number
    useVoucherXtra: boolean
    customFixedFee: number | null
}

function ProductRow({ product, settings, onUpdate, onRowClick }: { product: Product, settings: ShopeeSettings, onUpdate: (id: string, data: Partial<Product>) => Promise<void>, onRowClick: (product: Product) => void }) {
    const [localPrice, setLocalPrice] = useState<string>(product.sellingPrice.toString())
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!isSaving) {
            setLocalPrice(product.sellingPrice.toString())
        }
    }, [product.sellingPrice, isSaving])

    const numericPrice = parseFloat(localPrice) || 0

    const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
        const newPrice = parseFloat(localPrice) || 0
        if (newPrice === product.sellingPrice) return

        setIsSaving(true)
        try {
            await onUpdate(product.id, { sellingPrice: newPrice })
            toast.success('Cập nhật giá thành công')
        } catch (error) {
            toast.error('Lỗi khi cập nhật giá')
            setLocalPrice(product.sellingPrice.toString())
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <TableRow
            className={cn(
                "group cursor-pointer hover:bg-slate-50 transition-colors h-16",
                product.isDimensionMissing && "bg-amber-50/30 hover:bg-amber-50/50"
            )}
            onClick={() => onRowClick(product)}
        >
            <TableCell>
                <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-900 whitespace-normal break-words max-w-[350px]">
                        {product.name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tracking-tighter">
                        {product.sku}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <Badge
                    variant={product.stock === 0 ? "destructive" : "secondary"}
                    className={cn(
                        "font-mono",
                        product.stock < 5 && product.stock > 0 && "bg-amber-100 text-amber-800 hover:bg-amber-100/80"
                    )}
                >
                    {product.stock}
                </Badge>
            </TableCell>

            <TableCell>
                <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Vốn: {product.costPrice.toLocaleString()}đ
                    </div>
                    <div className="relative group/price">
                        <Input
                            type="number"
                            value={localPrice}
                            onChange={(e) => setLocalPrice(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSave()
                                    e.currentTarget.blur()
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSaving}
                            className="h-8 text-right pr-2 w-28 bg-transparent border-transparent group-hover/price:border-slate-200 focus:border-indigo-500 transition-all font-semibold"
                        />
                        {isSaving && (
                            <div className="absolute right-0.5 top-2">
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRowClick(product)
                    }}
                >
                    <Edit2 className="h-4 w-4 text-slate-400" />
                </Button>
            </TableCell>
        </TableRow>
    )
}

interface ProfitTableProps {
    systemConfig: SystemConfig
    initialProducts: Product[]
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
    }
}

export function ProfitTable({ systemConfig, initialProducts, pagination }: ProfitTableProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    // Initialize state from URL params
    const initialQuery = searchParams.get('query') || ''
    const initialSort = searchParams.get('sortByStock') === 'true'

    const [searchTerm, setSearchTerm] = useState(initialQuery)
    const [isStockSorted, setIsStockSorted] = useState(initialSort)

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (searchTerm) {
                params.set('query', searchTerm)
            } else {
                params.delete('query')
            }
            // Always reset to page 1 on new search
            if (searchTerm !== (searchParams.get('query') || '')) {
                params.set('page', '1')
            }
            router.replace(`${pathname}?${params.toString()}`)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchTerm, searchParams, pathname, router])

    const handleStockSortToggle = (checked: boolean) => {
        setIsStockSorted(checked)
        const params = new URLSearchParams(searchParams.toString())
        params.set('sortByStock', checked ? 'true' : 'false')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    // Map systemConfig to legacy ShopeeSettings for compatibility
    const legacySettings: ShopeeSettings = {
        paymentFeePercent: 0.0491, // Fixed per requirements
        fixedFeePercent: 0,
        serviceFeePercent: systemConfig.serviceFeePercent,
        serviceFeeMaxCap: systemConfig.maxServiceFee,
        volumetricDivisor: systemConfig.weightConstant,
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
            // Since we are now using server data, we should ideally refresh the server data
            router.refresh()
        },
    })

    const handleUpdateProduct = async (id: string, data: Partial<Product>) => {
        return updateMutation.mutateAsync({ id, data })
    }

    return (
        <div className="flex flex-col">
            <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Tìm theo SKU hoặc Tên sản phẩm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 bg-white border-slate-200"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="stock-sort"
                        checked={isStockSorted}
                        onCheckedChange={handleStockSortToggle}
                    />
                    <Label htmlFor="stock-sort" className="text-sm text-slate-600 cursor-pointer">Sắp hết hàng</Label>
                </div>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b">
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead className="w-[100px]">Tồn kho</TableHead>
                            <TableHead className="w-[180px]">Định giá</TableHead>
                            <TableHead className="w-[80px] text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-40 text-center text-slate-400">
                                    Không tìm thấy sản phẩm. {searchTerm ? 'Hãy thử tìm từ khóa khác.' : 'Bắt đầu bằng cách nhập dữ liệu.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialProducts.map((product) => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    settings={legacySettings}
                                    onUpdate={handleUpdateProduct}
                                    onRowClick={(p) => {
                                        setSelectedProduct(p)
                                        setIsSheetOpen(true)
                                    }}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                    Hiển thị <strong>{(pagination.currentPage - 1) * 20 + 1}-{Math.min(pagination.currentPage * 20, pagination.totalItems)}</strong> trong tổng số <strong>{pagination.totalItems}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(Math.max(pagination.currentPage - 1, 1))}
                        disabled={pagination.currentPage === 1}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-semibold px-2">
                        {pagination.currentPage} / {pagination.totalPages || 1}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(Math.min(pagination.currentPage + 1, pagination.totalPages))}
                        disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ProductDetailSheet
                product={selectedProduct}
                systemConfig={systemConfig}
                settings={legacySettings}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onSave={handleUpdateProduct}
            />
        </div >
    )
}
