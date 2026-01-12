'use client'

import { useState, useTransition } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { updateFeeRate } from '@/app/admin/fees/actions'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Pencil, Loader2, Store, Building2, Check, X } from 'lucide-react'

// Define the interface locally or import if shared. 
// For now, I'll redefine compatible with the one in actions.ts to avoid circular deps if actions import components (unlikely but safe).
export interface CategoryWithRates {
    id: string
    name: string
    slug: string
    normalRate: number | null
    normalRateId: string | null
    mallRate: number | null
    mallRateId: string | null
    updatedAt: Date | null
}

interface CategoryFeeTableProps {
    initialData: CategoryWithRates[]
}

export default function CategoryFeeTable({ initialData }: CategoryFeeTableProps) {
    const [data, setData] = useState(initialData)
    const [editingCategory, setEditingCategory] = useState<CategoryWithRates | null>(null)
    const [normalRate, setNormalRate] = useState('')
    const [mallRate, setMallRate] = useState('')
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    const openEditModal = (category: CategoryWithRates) => {
        setEditingCategory(category)
        setNormalRate(category.normalRate?.toString() ?? '')
        setMallRate(category.mallRate?.toString() ?? '')
        setError('')
    }

    const closeModal = () => {
        setEditingCategory(null)
        setNormalRate('')
        setMallRate('')
        setError('')
    }

    const handleSave = () => {
        if (!editingCategory) return

        setError('')

        const normalValue = parseFloat(normalRate)
        const mallValue = parseFloat(mallRate)

        if (isNaN(normalValue) || isNaN(mallValue)) {
            setError('Vui lòng nhập số hợp lệ')
            return
        }

        startTransition(async () => {
            // Update Normal rate
            const normalResult = await updateFeeRate(
                editingCategory.id,
                'NORMAL',
                normalValue
            )
            if (!normalResult.success) {
                setError(normalResult.error || 'Lỗi cập nhật phí Shop Thường')
                return
            }

            // Update Mall rate
            const mallResult = await updateFeeRate(
                editingCategory.id,
                'MALL',
                mallValue
            )
            if (!mallResult.success) {
                setError(mallResult.error || 'Lỗi cập nhật phí Shopee Mall')
                return
            }

            // Update local state optimistically
            setData(prev =>
                prev.map(cat =>
                    cat.id === editingCategory.id
                        ? { ...cat, normalRate: normalValue, mallRate: mallValue, updatedAt: new Date() }
                        : cat
                )
            )

            closeModal()
        })
    }

    const formatDate = (date: Date | null) => {
        if (!date) return '—'
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })
    }

    return (
        <>
            <div className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="font-semibold">Danh mục</TableHead>
                            <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center gap-1.5">
                                    <Store className="w-4 h-4" />
                                    Shop Thường (%)
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                                <div className="flex items-center justify-center gap-1.5">
                                    <Building2 className="w-4 h-4" />
                                    Shopee Mall (%)
                                </div>
                            </TableHead>
                            <TableHead className="text-center font-semibold">Cập nhật</TableHead>
                            <TableHead className="text-right font-semibold">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((category) => (
                            <TableRow key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="text-center">
                                    {category.normalRate !== null ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-semibold">
                                            {category.normalRate}%
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Chưa cấu hình</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {category.mallRate !== null ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold">
                                            {category.mallRate}%
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Chưa cấu hình</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                    {formatDate(category.updatedAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditModal(category)}
                                        className="gap-1.5"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Sửa
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Chưa có danh mục nào. Vui lòng tạo danh mục trước.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Modal */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-orange-500" />
                            Chỉnh sửa phí
                        </DialogTitle>
                        <DialogDescription>
                            Cập nhật tỷ lệ phí cho danh mục <strong>{editingCategory?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Normal Rate Input */}
                        <div className="space-y-2">
                            <Label htmlFor="normalRate" className="flex items-center gap-2">
                                <Store className="w-4 h-4 text-orange-500" />
                                Shop Thường (%)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="normalRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={normalRate}
                                    onChange={(e) => setNormalRate(e.target.value)}
                                    placeholder="VD: 7.5"
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    %
                                </span>
                            </div>
                        </div>

                        {/* Mall Rate Input */}
                        <div className="space-y-2">
                            <Label htmlFor="mallRate" className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-red-500" />
                                Shopee Mall (%)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="mallRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={mallRate}
                                    onChange={(e) => setMallRate(e.target.value)}
                                    placeholder="VD: 5.5"
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    %
                                </span>
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/50 dark:border-red-800 dark:text-red-300">
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeModal} disabled={isPending}>
                            <X className="w-4 h-4 mr-1.5" />
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isPending}
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-1.5" />
                                    Lưu thay đổi
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
