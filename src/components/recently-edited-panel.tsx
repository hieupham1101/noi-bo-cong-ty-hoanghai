'use client'

import { useRecentlyEdited } from '@/components/recently-edited-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { History, X, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRelativeTime } from '@/lib/utils'

// ... imports
import { formatCurrency } from '@/lib/utils'

export function RecentlyEditedPanel() {
    const { recentlyEdited, clearRecentlyEdited } = useRecentlyEdited()

    if (recentlyEdited.length === 0) {
        return (
            <Card className="h-fit">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Hoạt động gần đây
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-4 px-4">
                    <p className="text-xs text-muted-foreground text-center">
                        Chưa có hoạt động nào.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-fit">
            <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Hoạt động gần đây
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                            {recentlyEdited.length}
                        </span>
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={clearRecentlyEdited}
                        title="Xóa lịch sử"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2 max-h-[400px] overflow-y-auto">
                {recentlyEdited.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-col gap-1 p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate" title={item.name}>
                                    {item.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    {item.sku}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-semibold">
                                    {item.newPrice.toLocaleString()}đ
                                </p>
                                <div className={cn(
                                    "flex items-center justify-end gap-0.5 text-[10px]",
                                    item.profit >= 0 ? "text-green-600" : "text-red-500"
                                )}>
                                    {item.profit >= 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3" />
                                    )}
                                    <span>{item.profit.toLocaleString()}đ</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {getRelativeTime(item.timestamp)}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
