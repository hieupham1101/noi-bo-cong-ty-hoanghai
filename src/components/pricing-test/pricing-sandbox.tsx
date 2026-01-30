'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    FlaskConical,
    Calculator,
    TrendingUp,
    Percent,
    DollarSign,
    Store,
    Building2,
    Minus,
    Equal,
    ArrowDown,
    Wallet,
    PiggyBank,
    Receipt
} from 'lucide-react'

// Types for category data from database
interface FeeRate {
    shopType: 'NORMAL' | 'MALL'
    percentage: number
}

interface CategoryData {
    id: string
    name: string
    slug: string
    feeRates: FeeRate[]
}

interface PricingSandboxProps {
    categories: CategoryData[]
}

// Shop type options
type ShopType = 'MALL' | 'NORMAL'
type ServiceFeeMode = 'fixed' | 'percent'

// Default fee constants
const DEFAULT_PAYMENT_FEE_RATE = 0.0491 // 4.91%
const DEFAULT_SERVICE_FEE_FIXED = 53000 // 53,000 VND based on user history
const DEFAULT_SERVICE_FEE_PERCENT = 0.06 // 6%

export function PricingSandbox({ categories }: PricingSandboxProps) {
    // State for inputs
    const [shopType, setShopType] = useState<ShopType>('NORMAL') // Default to "Shop Thường"
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [cogs, setCogs] = useState<number>(0)
    const [targetMarginPercent, setTargetMarginPercent] = useState<number>(10)

    // Service fee settings
    const [serviceFeeMode, setServiceFeeMode] = useState<ServiceFeeMode>('fixed')
    const [serviceFeeFixed, setServiceFeeFixed] = useState<number>(DEFAULT_SERVICE_FEE_FIXED)
    const [serviceFeePercent, setServiceFeePercent] = useState<number>(DEFAULT_SERVICE_FEE_PERCENT * 100) // Store as % for display

    // Get the selected category
    const selectedCategory = useMemo(() => {
        return categories.find(c => c.id === selectedCategoryId)
    }, [categories, selectedCategoryId])

    // Get the fee rate for the selected shop type
    const getCategoryFeeRate = (category: CategoryData | undefined, type: ShopType): number | null => {
        if (!category) return null
        const feeRate = category.feeRates.find(f => f.shopType === type)
        return feeRate ? feeRate.percentage / 100 : null // Convert from % to decimal
    }

    // Main calculation logic
    const calculation = useMemo(() => {
        if (!selectedCategory || cogs <= 0) {
            return null
        }

        const categoryFeeRate = getCategoryFeeRate(selectedCategory, shopType)

        if (categoryFeeRate === null) {
            return {
                error: true,
                message: `Chưa cấu hình phí cho "${shopType === 'MALL' ? 'Shopee Mall' : 'Shop Thường'}". Vui lòng cấu hình trong trang Cài đặt.`,
            }
        }

        const paymentFeeRate = DEFAULT_PAYMENT_FEE_RATE
        const marginRate = targetMarginPercent / 100

        // Step 1: Calculate target profit and net payout needed
        const targetProfit = cogs * marginRate
        const netPayoutNeeded = cogs + targetProfit // This is "Giá Thu Về" we want

        // Step 2: Calculate selling price using reverse math
        // Formula depends on service fee mode:
        // - If Fixed: Price = (NetPayoutNeeded + ServiceFeeFixed) / (1 - CategoryFee - PaymentFee)
        // - If Percent: Price = NetPayoutNeeded / (1 - CategoryFee - PaymentFee - ServiceFeePercent)

        let suggestedPrice: number
        let serviceFeeValue: number

        if (serviceFeeMode === 'fixed') {
            const denominator = 1 - categoryFeeRate - paymentFeeRate
            if (denominator <= 0) {
                return {
                    error: true,
                    message: 'Tổng phí vượt quá 100%. Vui lòng kiểm tra cấu hình.',
                }
            }
            suggestedPrice = (netPayoutNeeded + serviceFeeFixed) / denominator
            serviceFeeValue = serviceFeeFixed
        } else {
            const serviceFeeRate = serviceFeePercent / 100
            const denominator = 1 - categoryFeeRate - paymentFeeRate - serviceFeeRate
            if (denominator <= 0) {
                return {
                    error: true,
                    message: 'Tổng phí vượt quá 100%. Vui lòng kiểm tra cấu hình.',
                }
            }
            suggestedPrice = netPayoutNeeded / denominator
            serviceFeeValue = suggestedPrice * serviceFeeRate
        }

        // Step 3: Calculate fee breakdown
        const categoryFeeValue = suggestedPrice * categoryFeeRate
        const paymentFeeValue = suggestedPrice * paymentFeeRate
        const totalFees = categoryFeeValue + paymentFeeValue + serviceFeeValue

        // Step 4: Calculate actual net payout and profit
        const actualNetPayout = suggestedPrice - totalFees // "Doanh thu đơn hàng"
        const actualNetProfit = actualNetPayout - cogs // "Lợi nhuận ròng"
        const actualMarginPercent = (actualNetProfit / cogs) * 100

        return {
            error: false,
            // Inputs
            cogs,
            targetMarginPercent,
            targetProfit,
            // Calculated values
            suggestedPrice,
            // Fee breakdown
            categoryFeeRate,
            categoryFeeValue,
            paymentFeeRate,
            paymentFeeValue,
            serviceFeeMode,
            serviceFeeValue,
            serviceFeePercent: serviceFeeMode === 'percent' ? serviceFeePercent : null,
            totalFees,
            // Outputs
            actualNetPayout, // Giá Thu Về / Doanh thu đơn hàng
            actualNetProfit, // Lợi nhuận ròng
            actualMarginPercent,
        }
    }, [selectedCategory, cogs, targetMarginPercent, shopType, serviceFeeMode, serviceFeeFixed, serviceFeePercent])

    // Format currency
    const formatVND = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value)
    }

    // Format percentage
    const formatPercent = (value: number) => {
        return `${(value * 100).toFixed(2)}%`
    }

    // Get fee display for category option
    const getCategoryFeeDisplay = (category: CategoryData): string => {
        const fee = getCategoryFeeRate(category, shopType)
        if (fee !== null) {
            return `${(fee * 100).toFixed(1)}%`
        }
        return 'N/A'
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Header Info */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <FlaskConical className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-800">Công cụ Tính giá bán ngược</p>
                    <p className="text-xs text-amber-600">
                        Nhập giá vốn + lợi nhuận mong muốn → Tính ra giá bán phù hợp
                    </p>
                </div>
            </div>

            {/* Main Card - Cash Flow Layout */}
            <Card className="shadow-lg border-slate-200">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Calculator className="h-5 w-5" />
                        Thông số đầu vào
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Shop Type Toggle */}
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-600">Loại Shop</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShopType('NORMAL')}
                                className={`flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm ${shopType === 'NORMAL'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <Store className={`h-4 w-4 ${shopType === 'NORMAL' ? 'text-orange-600' : 'text-slate-400'}`} />
                                <span className="font-medium">Shop Thường</span>
                            </button>
                            <button
                                onClick={() => setShopType('MALL')}
                                className={`flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm ${shopType === 'MALL'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <Building2 className={`h-4 w-4 ${shopType === 'MALL' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className="font-medium">Shopee Mall</span>
                            </button>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm text-slate-600">Ngành hàng</Label>
                        {categories.length === 0 ? (
                            <div className="p-3 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                                <p className="text-sm text-slate-500">Chưa có danh mục. Vui lòng cấu hình.</p>
                            </div>
                        ) : (
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger id="category" className="bg-white">
                                    <SelectValue placeholder="Chọn ngành hàng..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => {
                                        const feeDisplay = getCategoryFeeDisplay(cat)
                                        const hasFee = getCategoryFeeRate(cat, shopType) !== null
                                        return (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <span className="flex items-center gap-2">
                                                    <span>{cat.name}</span>
                                                    <span className={`text-xs ${hasFee ? 'text-slate-500' : 'text-red-500'}`}>
                                                        ({feeDisplay})
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* COGS Input */}
                    <div className="space-y-2">
                        <Label htmlFor="cogs" className="text-sm text-slate-600 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Giá vốn (COGS)
                        </Label>
                        <div className="relative">
                            <Input
                                id="cogs"
                                type="number"
                                min={0}
                                value={cogs || ''}
                                onChange={(e) => setCogs(Number(e.target.value) || 0)}
                                placeholder="Nhập giá vốn..."
                                className="pr-14 bg-white text-lg font-medium"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">VND</span>
                        </div>
                    </div>

                    {/* Target Margin Input */}
                    <div className="space-y-2">
                        <Label htmlFor="margin" className="text-sm text-slate-600 flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Lợi nhuận mong muốn
                        </Label>
                        <div className="flex items-center gap-3">
                            <input
                                id="margin"
                                type="range"
                                min={0}
                                max={50}
                                step={1}
                                value={targetMarginPercent}
                                onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={targetMarginPercent}
                                    onChange={(e) => setTargetMarginPercent(Number(e.target.value) || 0)}
                                    className="w-16 text-center bg-white font-medium"
                                />
                                <span className="text-slate-500">%</span>
                            </div>
                        </div>
                        {cogs > 0 && (
                            <p className="text-xs text-slate-500">
                                = Lời <span className="font-medium text-green-600">{formatVND(cogs * targetMarginPercent / 100)}</span> trên mỗi sản phẩm
                            </p>
                        )}
                    </div>

                    {/* Service Fee Section */}
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-slate-600 flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Phí dịch vụ (Freeship/Video...)
                            </Label>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={serviceFeeMode === 'fixed' ? 'text-slate-700 font-medium' : 'text-slate-400'}>Cố định</span>
                                <Switch
                                    checked={serviceFeeMode === 'percent'}
                                    onCheckedChange={(checked) => setServiceFeeMode(checked ? 'percent' : 'fixed')}
                                />
                                <span className={serviceFeeMode === 'percent' ? 'text-slate-700 font-medium' : 'text-slate-400'}>%</span>
                            </div>
                        </div>
                        {serviceFeeMode === 'fixed' ? (
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0}
                                    value={serviceFeeFixed || ''}
                                    onChange={(e) => setServiceFeeFixed(Number(e.target.value) || 0)}
                                    placeholder="53000"
                                    className="pr-14 bg-white"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">VND</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.1}
                                    value={serviceFeePercent}
                                    onChange={(e) => setServiceFeePercent(Number(e.target.value) || 0)}
                                    placeholder="6"
                                    className="w-24 bg-white"
                                />
                                <span className="text-slate-500">%</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Results Card */}
            {calculation && !calculation.error && (
                <Card className="shadow-lg border-2 border-blue-200 overflow-hidden">
                    {/* Suggested Selling Price - Hero Section */}
                    <div className={`p-5 text-center ${shopType === 'MALL'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                        : 'bg-gradient-to-r from-orange-500 to-red-500'
                        }`}>
                        <p className="text-white/80 text-sm font-medium mb-1 flex items-center justify-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            GIÁ BÁN GỢI Ý
                        </p>
                        <p className="text-4xl font-bold text-white tracking-tight">
                            {formatVND(calculation.suggestedPrice!)}
                        </p>
                    </div>

                    {/* Fee Breakdown */}
                    <CardContent className="p-4 space-y-3">
                        <div className="text-sm space-y-2">
                            {/* Category Fee */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <Minus className="h-3 w-3 text-red-500" />
                                    Phí ngành hàng ({formatPercent(calculation.categoryFeeRate)})
                                </span>
                                <span className="font-medium text-red-600">-{formatVND(calculation.categoryFeeValue)}</span>
                            </div>

                            {/* Payment Fee */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <Minus className="h-3 w-3 text-red-500" />
                                    Phí thanh toán (4.91%)
                                </span>
                                <span className="font-medium text-red-600">-{formatVND(calculation.paymentFeeValue)}</span>
                            </div>

                            {/* Service Fee */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <Minus className="h-3 w-3 text-red-500" />
                                    Phí dịch vụ {calculation.serviceFeePercent ? `(${calculation.serviceFeePercent}%)` : '(cố định)'}
                                </span>
                                <span className="font-medium text-red-600">-{formatVND(calculation.serviceFeeValue)}</span>
                            </div>

                            {/* Total Fees */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-red-50 rounded border border-red-100">
                                <span className="text-red-700 font-medium">Tổng phí Shopee</span>
                                <span className="font-bold text-red-700">-{formatVND(calculation.totalFees)}</span>
                            </div>
                        </div>

                        {/* Divider with arrow */}
                        <div className="flex items-center justify-center py-2">
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>

                        {/* Net Payout - Blue Highlight */}
                        <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    <div>
                                        <p className="text-xs text-blue-100">DOANH THU ĐƠN HÀNG</p>
                                        <p className="text-sm font-medium">Giá thu về thực tế</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">{formatVND(calculation.actualNetPayout)}</p>
                            </div>
                        </div>

                        {/* COGS deduction */}
                        <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded text-sm">
                            <span className="flex items-center gap-2 text-slate-600">
                                <Minus className="h-3 w-3 text-slate-400" />
                                Giá vốn (COGS)
                            </span>
                            <span className="font-medium text-slate-700">-{formatVND(calculation.cogs)}</span>
                        </div>

                        {/* Net Profit - Green Highlight */}
                        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="h-5 w-5" />
                                    <div>
                                        <p className="text-xs text-green-100">LỢI NHUẬN RÒNG</p>
                                        <p className="text-sm font-medium">Tiền lời thực nhận</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{formatVND(calculation.actualNetProfit)}</p>
                                    <p className="text-xs text-green-100">≈ {calculation.actualMarginPercent.toFixed(1)}% trên vốn</p>
                                </div>
                            </div>
                        </div>

                        {/* Verification note */}
                        <div className="text-xs text-center text-slate-500 pt-2">
                            ✓ Giá thu về ({formatVND(calculation.actualNetPayout)}) = Vốn ({formatVND(cogs)}) + Lời ({formatVND(calculation.actualNetProfit)})
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error State */}
            {calculation?.error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-center text-red-600">
                        <p className="font-medium">{calculation.message}</p>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!calculation && (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-slate-400">
                        <Calculator className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>Chọn ngành hàng và nhập giá vốn để tính giá bán</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
