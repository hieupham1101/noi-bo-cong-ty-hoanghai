'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    getPsychologicalPrice,
    type ShopeeSettings,
} from '@/lib/shopee-logic'
import { calculateProfit } from '@/lib/utils/shopeeCalculator'
import { solveSellingPrice, type PricingMode, getPricingModeTooltip } from '@/lib/utils/solveSellingPrice'
import { cn, formatCurrency } from '@/lib/utils'
import { calculateFee, getCategories } from '@/app/calculator/actions'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Loader2,
    Calculator,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    Zap,
    AlertCircle,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Search,
    Info,
    Lock,
    Clock,
    User
} from 'lucide-react'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { SystemConfig } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { parseActivityDetails } from '@/lib/activity-parser'

// --- Interfaces ---

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
    competitorPrice: number | null
    useFreeshshipXtra: boolean
    mallCategoryId: string | null
    // FY2026 Fields
    categoryType: 'LAPTOP_PHONE' | 'APPLIANCE' | 'ACCESSORY'
    estimatedShippingFee: number
    useVoucherXtra: boolean
    customFixedFee: number | null
}

interface MallCategoryFee {
    id: string
    categoryName: string
    feePercent: number
    minFee?: number
    maxFee?: number
}

interface ProductDetailSheetProps {
    product: Product | null
    settings: ShopeeSettings // Keep for legacy compatibility if needed
    systemConfig: SystemConfig | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (id: string, data: Partial<Product>) => Promise<void>
}

interface FormData {
    sellingPrice: number
    costPrice: number
    categoryType: 'LAPTOP_PHONE' | 'APPLIANCE' | 'ACCESSORY'
    estimatedShippingFee: number
    useVoucherXtra: boolean
    customFixedFee: number | null
    competitorPrice: number | null
    useFreeshshipXtra: boolean
    isShopMall: boolean
    mallCategoryId: string | null
    categorySlug: string // New field for calculation
    shopVoucher: number // New field
}

interface Category {
    id: string
    name: string
    slug: string
    feeRates?: {
        shopType: string
        percentage: number
    }[]
}

// --- Activity Log Interface ---
interface ActivityLog {
    id: string
    userId: string | null
    actionType: string
    entityName: string
    details: any
    createdAt: string
}

// --- Edit History Section Component ---
function EditHistorySection({ entityId, productName }: { entityId: string, productName: string }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const { data, isLoading } = useQuery<{ logs: ActivityLog[] }>({
        queryKey: ['product-activity', entityId],
        queryFn: async () => {
            const params = new URLSearchParams({ entityId: entityId })
            const res = await fetch(`/api/activity?${params}`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
        enabled: isExpanded // Only fetch when expanded
    })

    const logs = data?.logs || []

    return (
        <div className="border-t border-slate-100">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold text-sm">Lịch sử chỉnh sửa</span>
                    {logs.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {logs.length}
                        </Badge>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-6 pb-4">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-4 text-sm text-slate-400">
                            Chưa có lịch sử chỉnh sửa
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {logs.map((log) => {
                                const parsed = parseActivityDetails(log.details, log.actionType)
                                const userName = log.userId || 'System'

                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm"
                                    >
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                                <span className="font-semibold text-slate-700">{userName}</span>
                                                <span>•</span>
                                                <span>
                                                    {formatDistanceToNow(new Date(log.createdAt), {
                                                        addSuffix: true,
                                                        locale: vi
                                                    })}
                                                </span>
                                            </div>
                                            <div className="text-slate-600">
                                                {parsed.changes ? (
                                                    parsed.changes.map((c: any, i: number) => (
                                                        <div key={i} className="text-xs">
                                                            <span className="text-slate-500">{c.field}:</span>{' '}
                                                            <span className="line-through text-slate-400">{String(c.old)}</span>
                                                            {' → '}
                                                            <span className="font-medium text-slate-700">{String(c.new)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-500">{parsed.raw || log.actionType}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1']; // Green, Amber, Red, Indigo

export function ProductDetailSheet({
    product,
    settings,
    systemConfig,
    open,
    onOpenChange,
    onSave
}: ProductDetailSheetProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'simulator' | 'competitor'>('simulator')

    // Fetch mall categories
    const { data: mallCategories = [] } = useQuery<MallCategoryFee[]>({
        queryKey: ['mall-categories'],
        queryFn: async () => {
            const res = await fetch('/api/mall-categories')
            if (!res.ok) throw new Error('Failed to fetch mall categories')
            return res.json()
        },
        enabled: open
    })

    // Fetch new categories
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            return await getCategories()
        },
        enabled: open
    })

    const [calculatedFeeResult, setCalculatedFeeResult] = useState<{ feeAmount: number } | null>(null)
    const [calculatedProfit, setCalculatedProfit] = useState<number | null>(null)
    const [isCalculatingFee, setIsCalculatingFee] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Smart Pricing Engine State
    const [pricingStrategy, setPricingStrategy] = useState<{
        mode: PricingMode;
        targetValue: number;
        isAutoSync: boolean;
    }>({
        mode: 'ROI_PERCENT',
        targetValue: 0,
        isAutoSync: true
    })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const { register, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            sellingPrice: 0,
            costPrice: 0,
            competitorPrice: null,
            useFreeshshipXtra: true,
            isShopMall: false,
            mallCategoryId: null,
            categoryType: 'ACCESSORY',
            categorySlug: '',
            estimatedShippingFee: 50000,
            useVoucherXtra: true,
            customFixedFee: null,
            shopVoucher: 0,
        }
    })

    // Reset when product opens
    useEffect(() => {
        if (product && open) {
            reset({
                sellingPrice: product.sellingPrice,
                costPrice: product.costPrice,
                competitorPrice: product.competitorPrice,
                useFreeshshipXtra: product.useFreeshshipXtra,
                isShopMall: !!product.mallCategoryId,
                mallCategoryId: product.mallCategoryId,
                categoryType: product.categoryType || 'ACCESSORY',
                categorySlug: '', // seamless default
                estimatedShippingFee: product.estimatedShippingFee ?? 50000,
                // Default Voucher Xtra to true if undefined for new simulator feel
                useVoucherXtra: product.useVoucherXtra ?? true,
                customFixedFee: product.customFixedFee ?? null,
                // shopVoucher is not in Product model yet, so default to 0
                shopVoucher: 0,
            })
        }
    }, [product, open, reset])

    const watchedValues = watch()

    // --- Safe Parsing ---
    const sellingPrice = Number(watchedValues.sellingPrice) || 0
    const costPrice = Number(watchedValues.costPrice) || 0
    const competitorPrice = watchedValues.competitorPrice ? Number(watchedValues.competitorPrice) : null
    const useFreeshshipXtra = watchedValues.useFreeshshipXtra
    const useVoucherXtra = watchedValues.useVoucherXtra
    const categoryType = watchedValues.categoryType
    const categorySlug = watchedValues.categorySlug
    const isShopMall = watchedValues.isShopMall
    const mallCategoryId = watchedValues.mallCategoryId
    const customFixedFee = watchedValues.customFixedFee ? Number(watchedValues.customFixedFee) : null
    const shopVoucher = Number(watchedValues.shopVoucher) || 0

    // --- Real-time Fee Calculation Effect ---
    useEffect(() => {
        const calculate = async () => {
            if (!categorySlug || !sellingPrice) {
                setCalculatedFeeResult(null)
                setCalculatedProfit(null)
                return
            }

            setIsCalculatingFee(true)
            try {
                const res = await calculateFee(sellingPrice, categorySlug, isShopMall)
                if (res.success) {
                    setCalculatedFeeResult(res.data)
                    const profit = sellingPrice - costPrice - res.data.feeAmount
                    setCalculatedProfit(profit)
                } else {
                    // Handle error silently or toast?
                    console.error(res.error)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setIsCalculatingFee(false)
            }
        }

        const timer = setTimeout(() => {
            calculate()
        }, 500) // Debounce

        return () => clearTimeout(timer)
    }, [sellingPrice, categorySlug, isShopMall, costPrice])

    // --- Calculation Logic ---
    const calculations = useMemo(() => {
        // Fallbacks if SystemConfig is missing (or use legacy props if necessary, but we try to use SystemConfig)
        const baseConfig = systemConfig || {
            id: 0,
            paymentFeePercent: 0.0491,
            serviceFeePercent: 0.06,
            maxServiceFee: 40000,
            weightConstant: 6000,
            updatedAt: new Date(),
            fixedFeePercent: 0
        }

        // 1. Determine Effective Fixed Fee Rate
        let effectiveFixedFeePercent = 0 // Default to 0 if no category selected

        // Find selected category object
        const selectedCategory = categories.find(c => c.slug === categorySlug)

        if (customFixedFee !== null && customFixedFee !== undefined) {
            // Custom fee is usually in Percent (e.g. 8.84)
            effectiveFixedFeePercent = customFixedFee / 100
        } else if (selectedCategory && selectedCategory.feeRates && selectedCategory.feeRates.length > 0) {
            // Dynamic Fee Logic from Database
            const targetType = isShopMall ? 'MALL' : 'NORMAL'
            const rateObj = selectedCategory.feeRates.find((r) => r.shopType === targetType)

            if (rateObj) {
                effectiveFixedFeePercent = rateObj.percentage / 100
            }
        }

        // 2. Determine Service Fee Rate
        // Note: calculateProfit function typically uses config.serviceFeePercent.
        // If useFreeshshipXtra is false, calculateProfit might handle it if we pass hasFreeshipXtra=false
        // But if we want to ensure the rate is used from DB:
        const effectiveServiceFeePercent = baseConfig.serviceFeePercent

        // 3. Construct effective config for calculation
        // Ensure we don't pass fixedFeePercent if it's not in the type
        const calculationConfig: SystemConfig = {
            ...baseConfig,
            serviceFeePercent: effectiveServiceFeePercent
        }

        // 4. Calculate
        const result = calculateProfit({
            sellingPrice,
            cogs: costPrice,
            isMall: isShopMall,
            hasFreeshipXtra: useFreeshshipXtra,
            hasVoucherXtra: useVoucherXtra,
            fixedFeePercent: effectiveFixedFeePercent, // Pass dynamic fee
            config: calculationConfig,
            shopVoucher: shopVoucher
        })

        return {
            ...result,
            costPrice,
            categoryFeePercent: effectiveFixedFeePercent * 100,
            serviceFeePercent: effectiveServiceFeePercent * 100,
            paymentFeePercent: baseConfig.paymentFeePercent * 100,
            voucherFeePercent: (settings?.rateVoucherXtra ?? 0.04) * 100, // Legacy fallback for now as DB might not have Voucher Rate
            margin: result.roi, // Use ROI as margin? result.roi is (profit/cogs)*100. margin usually (profit/revenue)*100.
            // Wait, calculateProfit ROI is NetProfit / COGS. Margin is NetProfit / Revenue.
            // Let's calculate Margin properly here for display
            shopVoucher: shopVoucher
        }

    }, [watchedValues, systemConfig, settings, mallCategories, categories, categorySlug, isShopMall, customFixedFee, useFreeshshipXtra, useVoucherXtra, sellingPrice, costPrice, shopVoucher])

    // Correct Margin Calculation
    const displayMargin = useMemo(() => {
        if (!calculations || sellingPrice <= 0) return 0
        return (calculations.netProfit / sellingPrice) * 100
    }, [calculations, sellingPrice])

    const calculationDisplay = useMemo(() => {
        if (!calculations) return null
        return {
            ...calculations,
            margin: displayMargin
        }
    }, [calculations, displayMargin])

    // Alias for render
    const displayMetrics = calculationDisplay

    // --- Smart Pricing Engine: Auto-Sync Effect ---
    useEffect(() => {
        const isTargetInvalid = pricingStrategy.targetValue === undefined || pricingStrategy.targetValue === null || isNaN(pricingStrategy.targetValue);
        if (!pricingStrategy.isAutoSync || isTargetInvalid) return;

        // Calculate total fee rate from config and category
        const baseConfig = systemConfig || {
            id: 0,
            paymentFeePercent: 0.0491,
            serviceFeePercent: 0.06,
            fixedFeePercent: 0.04,
            maxServiceFee: 40000,
            weightConstant: 6000,
            updatedAt: new Date()
        }

        // Get category fee rate
        let categoryFeeRate = 0
        const selectedCategory = categories.find(c => c.slug === categorySlug)
        if (customFixedFee !== null && customFixedFee !== undefined) {
            categoryFeeRate = customFixedFee / 100
        } else if (selectedCategory?.feeRates?.length) {
            const targetType = isShopMall ? 'MALL' : 'NORMAL'
            const rateObj = selectedCategory.feeRates.find((r) => r.shopType === targetType)
            if (rateObj) {
                categoryFeeRate = rateObj.percentage / 100
            }
        }

        // Build total fee rate (R)
        const paymentRate = baseConfig.paymentFeePercent
        const serviceRate = useFreeshshipXtra ? baseConfig.serviceFeePercent : 0
        const voucherRate = useVoucherXtra ? (settings?.rateVoucherXtra ?? 0.04) : 0
        const totalFeeRate = categoryFeeRate + paymentRate + serviceRate + voucherRate

        // Fixed amount fees (K) - can be extended if there are constant fees in VND
        const fixedAmountFees = shopVoucher // Shop voucher is deducted from revenue

        // Build fee config with caps for accurate iterative solving
        const feeConfig = {
            paymentFeeRate: paymentRate,
            serviceFeeRate: serviceRate,
            serviceFeeMax: useFreeshshipXtra ? (baseConfig.maxServiceFee || 40000) : 0,
            voucherFeeRate: voucherRate,
            voucherFeeMax: useVoucherXtra ? 50000 : 0, // Voucher Xtra cap
            categoryFeeRate: categoryFeeRate
        }

        // DEBUG: Log what we're passing to the solver
        console.log('🎯 Smart Pricing Solver Input:', {
            mode: pricingStrategy.mode,
            targetValue: pricingStrategy.targetValue,
            cogs: costPrice,
            totalFeeRate,
            fixedAmountFees,
            feeConfig,
            currentSellingPrice: sellingPrice
        })

        const result = solveSellingPrice({
            mode: pricingStrategy.mode,
            targetValue: pricingStrategy.targetValue,
            cogs: costPrice,
            totalFeeRate,
            fixedAmountFees,
            feeConfig
        })

        // DEBUG: Log the result
        console.log('🎯 Smart Pricing Solver Result:', result)

        // Only update if the calculated price is different from current value
        // This prevents infinite loops from setValue triggering re-renders
        if (result.success && result.price !== null && result.price !== sellingPrice) {
            console.log('🎯 Updating selling price from', sellingPrice, 'to', result.price)
            setValue('sellingPrice', result.price)
        }
    }, [
        pricingStrategy.mode,
        pricingStrategy.targetValue,
        pricingStrategy.isAutoSync,
        costPrice,
        systemConfig,
        settings,
        categories,
        categorySlug,
        isShopMall,
        customFixedFee,
        useFreeshshipXtra,
        useVoucherXtra,
        shopVoucher,
        sellingPrice, // Added to dependency array to fix stale closure
        setValue
    ])


    const handleSaveProduct = async (data: FormData) => {
        if (!product) return
        setIsSaving(true)
        try {
            await onSave(product.id, {
                sellingPrice: Number(data.sellingPrice) || 0,
                costPrice: Number(data.costPrice) || 0,
                competitorPrice: data.competitorPrice ? Number(data.competitorPrice) : null,
                useFreeshshipXtra: data.useFreeshshipXtra,
                mallCategoryId: data.isShopMall ? data.mallCategoryId : null,
                categoryType: data.categoryType,
                estimatedShippingFee: Number(data.estimatedShippingFee) || 0,
                // Ensure boolean
                useVoucherXtra: !!data.useVoucherXtra,
                customFixedFee: data.customFixedFee ? Number(data.customFixedFee) : null,
            })
            toast.success('Đã lưu chiến lược giá')
            onOpenChange(false)
        } catch (error) {
            toast.error('Lỗi khi lưu chiến lược')
        } finally {
            setIsSaving(false)
        }
    }

    if (!product || !calculations) return null

    // Chart Data
    // Chart Data - Strict Sanitization
    const chartData = [
        {
            name: 'Giá vốn',
            value: Math.max(0, Number(calculations.costPrice) || 0),
            color: '#94a3b8'
        },
        {
            name: 'Phí sàn Shopee',
            value: Math.max(0, Number(calculations.totalFees) || 0),
            color: '#fb923c'
        },
        {
            name: 'Lợi nhuận',
            value: Math.max(0, Number(calculations.netProfit) || 0), // Only positive for Donut
            color: '#10b981'
        },
    ]

    // Debug Logging
    console.log('Chart Data:', chartData)

    const totalValue = chartData.reduce((acc, item) => acc + item.value, 0);

    const isProfitPositive = calculations.netProfit > 0
    const profitColor = isProfitPositive ? 'text-emerald-600' : 'text-rose-600'
    const profitBg = isProfitPositive ? 'bg-emerald-50' : 'bg-rose-50'

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col h-full bg-slate-50/50">
                <SheetHeader className="px-6 py-4 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0">
                    <div className="space-y-1">
                        <SheetTitle className="text-lg font-bold text-slate-900 tracking-tight">
                            Mô phỏng Lợi nhuận
                        </SheetTitle>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                            Sản phẩm: <span className="text-slate-900 font-semibold">{product.name}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
                        <Button onClick={handleSubmit(handleSaveProduct)} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
                            Áp dụng tính toán
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 w-full">

                        {/* --- LEFT COLUMN: SIMULATOR (Income & Config) --- */}
                        <div className="lg:col-span-5 flex flex-col border-r border-slate-200 bg-white overflow-y-auto">
                            <div className="p-6 space-y-8">

                                {/* 1. Primary Inputs */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-slate-900">Giá & Chi phí</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                Giá bán
                                                {pricingStrategy.isAutoSync && (
                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-purple-100 text-purple-700 border-0">
                                                        <Lock className="w-2.5 h-2.5 mr-0.5" />
                                                        Tự động
                                                    </Badge>
                                                )}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    {...register('sellingPrice')}
                                                    type="number"
                                                    readOnly={pricingStrategy.isAutoSync}
                                                    className={cn(
                                                        "h-14 text-2xl font-black pl-4 pr-12 transition-all text-slate-900",
                                                        pricingStrategy.isAutoSync
                                                            ? "bg-purple-50 border-purple-200 cursor-not-allowed"
                                                            : "bg-slate-50 border-slate-200 focus:bg-white"
                                                    )}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá vốn hàng bán (COGS)</Label>
                                            <div className="relative">
                                                <Input
                                                    {...register('costPrice')}
                                                    type="number"
                                                    className="h-14 text-xl font-bold pl-4 pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-slate-700"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                Voucher của Shop / Giảm giá
                                                <span className="text-[10px] normal-case text-slate-400 font-normal">(Trừ vào giá bán trước khi tính phí)</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    {...register('shopVoucher')}
                                                    type="number"
                                                    className="h-10 font-bold pl-4 pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-slate-700"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Competitor Price Analysis */}
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá đối thủ (Tham khảo)</Label>
                                        <div className="relative">
                                            <Input
                                                {...register('competitorPrice')}
                                                type="number"
                                                placeholder="Nhập giá đối thủ..."
                                                className="h-14 text-xl font-bold pl-4 pr-12 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all text-slate-700"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                        </div>

                                        {/* Analysis Badge */}
                                        {competitorPrice && competitorPrice > 0 && sellingPrice > 0 && (
                                            <div className={cn(
                                                "mt-3 p-3 rounded-lg border flex items-start gap-3",
                                                // Calculate difference here for styling
                                                ((sellingPrice - competitorPrice) / competitorPrice) < -0.02 ? "bg-emerald-50 border-emerald-100" :
                                                    ((sellingPrice - competitorPrice) / competitorPrice) > 0.02 ? "bg-rose-50 border-rose-100" :
                                                        "bg-blue-50 border-blue-100" // Equal range
                                            )}>
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                                    ((sellingPrice - competitorPrice) / competitorPrice) < -0.02 ? "bg-emerald-100 text-emerald-600" :
                                                        ((sellingPrice - competitorPrice) / competitorPrice) > 0.02 ? "bg-rose-100 text-rose-600" :
                                                            "bg-blue-100 text-blue-600"
                                                )}>
                                                    {((sellingPrice - competitorPrice) / competitorPrice) < -0.02 ? <TrendingDown className="w-3.5 h-3.5" /> :
                                                        ((sellingPrice - competitorPrice) / competitorPrice) > 0.02 ? <TrendingUp className="w-3.5 h-3.5" /> :
                                                            <Target className="w-3.5 h-3.5" />}
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    {/* Text Logic */}
                                                    {(() => {
                                                        const diffPercent = ((sellingPrice - competitorPrice) / competitorPrice);
                                                        const textPercent = Math.abs(diffPercent * 100).toFixed(1);

                                                        if (diffPercent < -0.02) {
                                                            return (
                                                                <>
                                                                    <p className="text-sm font-bold text-emerald-800">Giá cạnh tranh tốt! Rẻ hơn {textPercent}%</p>
                                                                    <p className="text-xs text-emerald-600">Tỷ lệ chuyển đổi có thể cao hơn.</p>
                                                                </>
                                                            )
                                                        } else if (diffPercent > 0.02) {
                                                            return (
                                                                <>
                                                                    <p className="text-sm font-bold text-rose-800">Giá cao hơn đối thủ {textPercent}%</p>
                                                                    <p className="text-xs text-rose-600">Cân nhắc giảm giá hoặc tối ưu hình ảnh/SEO.</p>
                                                                </>
                                                            )
                                                        } else {
                                                            return (
                                                                <>
                                                                    <p className="text-sm font-bold text-blue-800">Giá ngang bằng thị trường</p>
                                                                    <p className="text-xs text-blue-600">Cạnh tranh bằng Freeship hoặc Voucher.</p>
                                                                </>
                                                            )
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Smart Pricing Engine */}
                                    <div className="pt-2">
                                        <div className="p-5 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 space-y-4 shadow-sm">
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-700">
                                                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
                                                        <Target className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">Chiến lược giá</span>
                                                </div>
                                                {/* Auto-Sync Toggle */}
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] text-purple-600 font-medium">Tự động tính giá bán</Label>
                                                    <Switch
                                                        checked={pricingStrategy.isAutoSync}
                                                        onCheckedChange={(val) => setPricingStrategy(prev => ({ ...prev, isAutoSync: val }))}
                                                        className="data-[state=checked]:bg-purple-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* Mode Selector - Segmented Control */}
                                            <TooltipProvider>
                                                <div className="flex bg-white rounded-lg p-1 border border-purple-100 shadow-inner">
                                                    {(['ROI_PERCENT', 'MARGIN_PERCENT', 'FIXED_AMOUNT'] as PricingMode[]).map((mode) => (
                                                        <Tooltip key={mode}>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPricingStrategy(prev => ({ ...prev, mode }))}
                                                                    className={cn(
                                                                        "flex-1 py-2 px-3 text-xs font-bold rounded-md transition-all duration-200",
                                                                        pricingStrategy.mode === mode
                                                                            ? "bg-purple-600 text-white shadow-md"
                                                                            : "text-purple-600 hover:bg-purple-50"
                                                                    )}
                                                                >
                                                                    {mode === 'ROI_PERCENT' && '% ROI'}
                                                                    {mode === 'MARGIN_PERCENT' && '% Margin'}
                                                                    {mode === 'FIXED_AMOUNT' && 'VNĐ'}
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom" className="text-xs">
                                                                {getPricingModeTooltip(mode)}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ))}
                                                </div>
                                            </TooltipProvider>

                                            {/* Target Value Input */}
                                            <div className="space-y-2">
                                                <Label className="text-xs text-purple-700 font-semibold flex items-center gap-1.5">
                                                    <Info className="w-3 h-3" />
                                                    {pricingStrategy.mode === 'FIXED_AMOUNT' ? 'Lợi nhuận mong muốn' :
                                                        pricingStrategy.mode === 'ROI_PERCENT' ? 'Tỷ suất lợi nhuận trên vốn (ROI)' :
                                                            'Biên lợi nhuận trên doanh thu (Margin)'}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={pricingStrategy.targetValue}
                                                        onChange={(e) => setPricingStrategy(prev => ({
                                                            ...prev,
                                                            targetValue: e.target.value === '' ? 0 : Number(e.target.value)
                                                        }))}
                                                        placeholder={pricingStrategy.mode === 'FIXED_AMOUNT' ? '50000' : '0'}
                                                        className="h-14 text-2xl font-black pl-4 pr-14 bg-white border-purple-200 text-purple-900 focus:border-purple-500 focus:ring-purple-500 placeholder:text-purple-200"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-lg">
                                                        {pricingStrategy.mode === 'FIXED_AMOUNT' ? '₫' : '%'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Result Preview */}
                                            {pricingStrategy.isAutoSync && (
                                                <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-purple-100">
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                                                        <span className="text-xs font-medium text-purple-600">Giá bán được tính tự động</span>
                                                    </div>
                                                    <span className="font-bold text-purple-800">
                                                        {formatCurrency(sellingPrice)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <Separator />

                                {/* 2. Fee Configuration */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-slate-900">Cấu hình biểu phí</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Row 1: Category Selection (New Logic) */}
                                        <div className="flex flex-col gap-2 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                            <Label className="text-sm font-bold text-slate-700">Ngành hàng (Shopee)</Label>
                                            <Select
                                                onValueChange={(val) => setValue('categorySlug', val)}
                                                value={watchedValues.categorySlug}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Chọn ngành hàng..." />
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
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-slate-700">Loại Shop</Label>
                                                <p className="text-[10px] text-slate-500">Shop Thường vs Shop Mall</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-medium transition-colors", !watchedValues.isShopMall ? "text-indigo-600 font-bold" : "text-slate-400")}>Thường</span>
                                                <Switch
                                                    checked={watchedValues.isShopMall}
                                                    onCheckedChange={(val) => setValue('isShopMall', val)}
                                                />
                                                <span className={cn("text-xs font-medium transition-colors", watchedValues.isShopMall ? "text-indigo-600 font-bold" : "text-slate-400")}>Mall</span>
                                            </div>
                                        </div>

                                        {/* Calculated Shopee Fee */}
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-50 bg-indigo-50/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-indigo-900">Phí cố định ({(calculations.categoryFeePercent).toFixed(2)}%)</Label>
                                                <p className="text-[10px] text-indigo-700/80">Đã cập nhật theo danh mục {watchedValues.isShopMall ? 'Mall' : 'Thường'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-indigo-700">
                                                    {formatCurrency(calculations.fixedFee)}
                                                </span>
                                            </div>
                                        </div>



                                        {/* Row 2: Freeship Xtra */}
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-slate-700">Freeship Xtra</Label>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm text-slate-500 font-normal">
                                                        {(settings.serviceFeePercent ?? 0.06) * 100}%
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400">Tối đa 20k</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={useFreeshshipXtra}
                                                onCheckedChange={(val) => setValue('useFreeshshipXtra', val)}
                                            />
                                        </div>

                                        {/* Row 3: Voucher Xtra */}
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-slate-700">Voucher Xtra</Label>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm text-slate-500 font-normal">
                                                        {(settings.rateVoucherXtra ?? 0.04) * 100}%
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400">Tối đa 50k</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={useVoucherXtra}
                                                onCheckedChange={(val) => setValue('useVoucherXtra', val)}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>


                        {/* --- RIGHT COLUMN: ANALYTICS (Visuals) --- */}
                        <div className="lg:col-span-7 flex flex-col bg-slate-50 overflow-y-auto">
                            <div className="p-8 space-y-8">

                                {/* 1. Hero Metric */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={cn("p-6 rounded-2xl shadow-sm border", profitBg, isProfitPositive ? "border-emerald-100" : "border-rose-100")}>
                                        <h4 className={cn("text-xs font-bold uppercase tracking-widest mb-2 opacity-70", profitColor)}>Lợi nhuận ròng</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className={cn("text-4xl font-black tracking-tighter", profitColor)}>
                                                {formatCurrency(calculations.netProfit)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge className={cn("font-bold", isProfitPositive ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600")}>
                                                {(calculations?.margin ?? 0).toFixed(1)}% Biên LN
                                            </Badge>
                                            {calculations.netProfit < 0 && (
                                                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Cảnh báo: Đang lỗ
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col justify-center">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ROI</h4>
                                        <span className="text-3xl font-black text-slate-800 tracking-tight">
                                            {calculations.netProfit > 0 && costPrice > 0 ? ((calculations.netProfit / costPrice) * 100).toFixed(0) : 0}%
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">Tỷ suất lợi nhuận trên vốn</p>
                                    </div>
                                </div>

                                {/* 2. Visualization (Donut) */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[300px] flex items-center justify-between">
                                    <div className="flex-1 h-full min-w-0 relative">
                                        {/* Enforce Container Height explicitly */}
                                        <div className="w-full h-[250px]">
                                            {!isMounted ? (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-full animate-pulse">
                                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                                                </div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={totalValue > 0 ? chartData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#f1f5f9' }]}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={totalValue > 0 ? 5 : 0}
                                                            dataKey="value"
                                                            stroke="none"
                                                            isAnimationActive={false}
                                                        >
                                                            {totalValue > 0 ? (
                                                                chartData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))
                                                            ) : (
                                                                <Cell fill="#f1f5f9" />
                                                            )}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            formatter={(value: any, name: any) => {
                                                                if (totalValue === 0) return ['Chưa có dữ liệu', '']
                                                                return formatCurrency(value)
                                                            }}
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-[180px] shrink-0 space-y-4">
                                        <h5 className="text-sm font-bold text-slate-900 border-b pb-2 mb-2">Phân bổ dòng tiền</h5>
                                        {chartData.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: totalValue > 0 ? item.color : '#e2e8f0' }} />
                                                    <span className={cn("font-medium", totalValue > 0 ? "text-slate-500" : "text-slate-300")}>{item.name}</span>
                                                </div>
                                                <span className={cn("font-bold", totalValue > 0 ? "text-slate-700" : "text-slate-300")}>
                                                    {(sellingPrice > 0 && totalValue > 0 ? (item.value / sellingPrice) * 100 : 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                        {totalValue === 0 && (
                                            <p className="text-[10px] text-slate-400 italic text-center pt-2">
                                                Nhập giá bán để xem biểu đồ
                                            </p>
                                        )}
                                    </div>
                                </div>


                                {/* 3. The Details Receipt */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <Search className="w-3.5 h-3.5 text-slate-400" />
                                            Chi tiết tính toán
                                        </h4>
                                    </div>
                                    <div className="p-0">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-50">
                                                {/* Revenue */}
                                                <tr className="bg-emerald-50/30">
                                                    <td className="px-6 py-3 text-slate-500 font-medium pl-4 border-l-4 border-emerald-400">Doanh thu (Giá bán)</td>
                                                    <td className="px-6 py-3 text-right font-bold text-emerald-700">{formatCurrency(sellingPrice)}</td>
                                                </tr>
                                                {calculations.shopVoucher > 0 && (
                                                    <tr className="bg-slate-50/30">
                                                        <td className="px-6 py-2 text-slate-500 font-medium pl-4 border-l-4 border-transparent text-xs">(-) Voucher Shop</td>
                                                        <td className="px-6 py-2 text-right font-medium text-slate-600 text-xs">-{formatCurrency(calculations.shopVoucher)}</td>
                                                    </tr>
                                                )}
                                                {/* COGS */}
                                                <tr>
                                                    <td className="px-6 py-3 text-slate-500 font-medium pl-4 border-l-4 border-slate-200">Giá vốn hàng bán (COGS)</td>
                                                    <td className="px-6 py-3 text-right font-semibold text-slate-700">-{formatCurrency(costPrice)}</td>
                                                </tr>
                                                {/* Fees Breakdown */}
                                                <tr>
                                                    <td className="p-0" colSpan={2}>
                                                        <div className="bg-slate-50/50 px-6 py-2">
                                                            <div className="space-y-2 text-xs">
                                                                <div className="flex justify-between items-center text-slate-500">
                                                                    <span>Phí Cố Định ({(calculations?.categoryFeePercent ?? 0).toFixed(2)}%)</span>
                                                                    <span>-{formatCurrency(calculations.fixedFee)}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-slate-500">
                                                                    <span>Phí Thanh Toán ({(calculations?.paymentFeePercent ?? 0).toFixed(2)}%)</span>
                                                                    <span>-{formatCurrency(calculations.paymentFee)}</span>
                                                                </div>
                                                                {calculations.serviceFee > 0 && (
                                                                    <div className="flex justify-between items-center text-slate-500">
                                                                        <span>Phí Dịch Vụ (Freeship)</span>
                                                                        <span>-{formatCurrency(calculations.serviceFee)}</span>
                                                                    </div>
                                                                )}
                                                                {calculations.voucherFee > 0 && (
                                                                    <div className="flex justify-between items-center text-slate-500">
                                                                        <span>Phí Voucher Xtra</span>
                                                                        <span>-{formatCurrency(calculations.voucherFee)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Final Net */}
                                                <tr className={cn(isProfitPositive ? "bg-emerald-50/10" : "bg-rose-50/10")}>
                                                    <td className="px-6 py-4 font-bold text-slate-900 border-t border-slate-100">Lợi nhuận ròng</td>
                                                    <td className={cn("px-6 py-4 text-right font-black border-t border-slate-100 text-lg", profitColor)}>
                                                        {formatCurrency(calculations.netProfit)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- EDIT HISTORY SECTION --- */}
                        <div className="lg:col-span-12 border-t border-slate-200 bg-white">
                            <EditHistorySection entityId={product.id} productName={product.name} />
                        </div>

                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
