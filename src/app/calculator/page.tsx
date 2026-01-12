'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getCategories, calculateFee, CalculateFeeResult, CalculateFeeError } from './actions'
import { formatCurrencyVND } from '@/lib/formatters'
import { Calculator, Store, Building2, Loader2, ArrowRight, Percent, Coins, Wallet } from 'lucide-react'

type Category = {
    id: string
    name: string
    slug: string
}

type ShopType = 'NORMAL' | 'MALL'

export default function CalculatorPage() {
    // Form state
    const [price, setPrice] = useState<string>('')
    const [categorySlug, setCategorySlug] = useState<string>('')
    const [shopType, setShopType] = useState<ShopType>('NORMAL')

    // Data state
    const [categories, setCategories] = useState<Category[]>([])
    const [result, setResult] = useState<CalculateFeeResult['data'] | null>(null)
    const [error, setError] = useState<string>('')

    // Loading states
    const [isPending, startTransition] = useTransition()
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)

    // Fetch categories on mount
    useEffect(() => {
        async function loadCategories() {
            try {
                const data = await getCategories()
                setCategories(data)
            } catch (err) {
                console.error('Failed to load categories:', err)
            } finally {
                setIsLoadingCategories(false)
            }
        }
        loadCategories()
    }, [])

    // Handle form submission
    const handleCalculate = () => {
        setError('')
        setResult(null)

        const numericPrice = parseFloat(price.replace(/[,.]/g, ''))

        startTransition(async () => {
            const response = await calculateFee(
                numericPrice,
                categorySlug,
                shopType === 'MALL'
            )

            if (response.success) {
                setResult(response.data)
            } else {
                setError(response.error)
            }
        })
    }

    // Format price input with thousand separators
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '')
        if (value === '') {
            setPrice('')
            return
        }
        const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(value))
        setPrice(formatted)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white mb-4 shadow-lg">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        Tính Phí Shopee
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Tính toán phí bán hàng dựa trên danh mục và loại Shop
                    </p>
                </div>

                {/* Calculator Card */}
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-orange-500" />
                            Thông tin sản phẩm
                        </CardTitle>
                        <CardDescription>
                            Nhập thông tin để tính phí bán hàng trên Shopee
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Price Input */}
                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-sm font-medium">
                                Giá bán (VNĐ)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="price"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="1.000.000"
                                    value={price}
                                    onChange={handlePriceChange}
                                    className="pr-12 h-12 text-lg font-semibold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                    ₫
                                </span>
                            </div>
                        </div>

                        {/* Category Select */}
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-sm font-medium">
                                Danh mục sản phẩm
                            </Label>
                            <Select
                                value={categorySlug}
                                onValueChange={setCategorySlug}
                                disabled={isLoadingCategories}
                            >
                                <SelectTrigger id="category" className="h-12 w-full">
                                    <SelectValue placeholder={
                                        isLoadingCategories
                                            ? "Đang tải..."
                                            : "Chọn danh mục"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.slug}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Shop Type Toggle */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Loại Shop</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShopType('NORMAL')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${shopType === 'NORMAL'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                                        }`}
                                >
                                    <Store className="w-5 h-5" />
                                    <span className="font-medium">Shop Thường</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShopType('MALL')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${shopType === 'MALL'
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                                        }`}
                                >
                                    <Building2 className="w-5 h-5" />
                                    <span className="font-medium">Shopee Mall</span>
                                </button>
                            </div>
                        </div>

                        {/* Calculate Button */}
                        <Button
                            onClick={handleCalculate}
                            disabled={isPending || !price || !categorySlug}
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Đang tính...
                                </>
                            ) : (
                                <>
                                    <Calculator className="w-5 h-5 mr-2" />
                                    Tính Phí
                                </>
                            )}
                        </Button>

                        {/* Error Display */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Card */}
                {result && (
                    <Card className="mt-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 overflow-hidden">
                        <CardHeader className="border-b border-green-100 dark:border-green-800/50">
                            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <Wallet className="w-5 h-5" />
                                Kết quả tính phí
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {/* Original Price */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-gray-900/40">
                                    <span className="text-muted-foreground">Giá bán gốc</span>
                                    <span className="text-lg font-semibold">
                                        {formatCurrencyVND(result.originalPrice)} ₫
                                    </span>
                                </div>

                                {/* Fee Rate */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-gray-900/40">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Percent className="w-4 h-4" />
                                        Tỷ lệ phí áp dụng
                                    </div>
                                    <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                                        {result.feeRate}%
                                    </span>
                                </div>

                                {/* Fee Amount */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-gray-900/40">
                                    <span className="text-muted-foreground">Số tiền phí</span>
                                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                                        - {formatCurrencyVND(result.feeAmount)} ₫
                                    </span>
                                </div>

                                {/* Divider with arrow */}
                                <div className="flex items-center justify-center py-2">
                                    <ArrowRight className="w-6 h-6 text-green-500 rotate-90" />
                                </div>

                                {/* Final Amount */}
                                <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                                    <span className="font-medium">Số tiền nhận được</span>
                                    <span className="text-2xl font-bold">
                                        {formatCurrencyVND(result.finalReceivedAmount)} ₫
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
