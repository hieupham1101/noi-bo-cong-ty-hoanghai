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

export default function ActivityLogPage() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    // Fetch Activity Logs
    const { data, isLoading } = useQuery({
        queryKey: ['activity-logs', search, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                search,
                page: page.toString(),
                limit: '20'
            })
            const res = await fetch(`/api/activity?${params}`)
            if (!res.ok) throw new Error('Failed to fetch activity logs')
            return res.json()
        }
    })

    const logs = data?.logs || []
    const pagination = data?.pagination

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4">
            {/* Header Area */}
            <div className="flex flex-col gap-4 pb-4 border-b shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-indigo-600" />
                            Lịch sử hoạt động
                        </h1>
                        <p className="text-sm text-slate-500">
                            Nhật ký thay đổi toàn hệ thống (Chỉ xem).
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm log..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                    />
                </div>
            </div>

            {/* Logs List - Read Only Table */}
            <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-2 pb-10">
                    {isLoading ? (
                        <div className="flex justify-center p-20">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Clock className="h-8 w-8 text-slate-300" />
                            </div>
                            <p>Không tìm thấy hoạt động nào.</p>
                        </div>
                    ) : (
                        <div className="w-full text-sm text-left">
                            <table className="w-full">
                                <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Thời gian</th>
                                        <th className="px-4 py-3 font-medium">Người dùng</th>
                                        <th className="px-4 py-3 font-medium">Đối tượng</th>
                                        <th className="px-4 py-3 font-medium">Chi tiết thay đổi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map((log: any) => {
                                        const parsed = (() => {
                                            // Handle potential raw JSON strings or objects
                                            try {
                                                return typeof log.details === 'string'
                                                    ? JSON.parse(log.details)
                                                    : log.details
                                            } catch {
                                                return {}
                                            }
                                        })()

                                        // Simple formatter for display
                                        const formatChanges = (changes: any) => {
                                            if (!changes) return log.actionType

                                            // If it's a simple import message or string
                                            if (typeof changes === 'string') return changes

                                            // If it shows old/new structure
                                            return Object.entries(changes).map(([key, val]: [string, any]) => {
                                                // Skip if val is not object with old/new
                                                if (!val || typeof val !== 'object') return `${key}: ${val}`
                                                return (
                                                    <div key={key} className="flex items-center gap-1.5 py-0.5">
                                                        <span className="font-medium text-slate-600">{key}:</span>
                                                        <span className="line-through text-slate-400">{String(val.old)}</span>
                                                        <span className="text-slate-400">→</span>
                                                        <span className="font-bold text-slate-800">{String(val.new)}</span>
                                                    </div>
                                                )
                                            })
                                        }

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-500 w-[180px]">
                                                    {formatDistanceToNow(new Date(log.createdAt), {
                                                        addSuffix: true,
                                                        locale: vi
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-slate-500">
                                                                {(log.userId || 'S').charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-slate-700 truncate max-w-[150px]" title={log.userId}>
                                                            {log.userId || 'System'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-indigo-600 w-[200px]">
                                                    {log.entityName}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {formatChanges(parsed)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Pagination Controls could go here if needed, keeping it simple for now as infinite scroll is preferred or clean list */}
        </div>
    )
}
    