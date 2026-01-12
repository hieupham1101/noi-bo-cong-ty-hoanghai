'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowRight, ChevronRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { parseActivityDetails } from '@/lib/activity-parser'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export interface AuditLog {
    id: string
    userName: string
    action: string
    details: string
    createdAt: Date | string
    // user: {
    //     name: string | null
    //     image: string | null
    // } | null
}

interface RecentActivityFeedProps {
    initialData: AuditLog[]
}

const getAvatarColor = (name: string) => {
    const colors = [
        'bg-red-100 text-red-700',
        'bg-emerald-100 text-emerald-700',
        'bg-blue-100 text-blue-700',
        'bg-amber-100 text-amber-700',
        'bg-purple-100 text-purple-700',
        'bg-pink-100 text-pink-700',
        'bg-indigo-100 text-indigo-700',
        'bg-orange-100 text-orange-700'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function RecentActivityFeed({ initialData }: RecentActivityFeedProps) {
    return (
        <Card className="flex flex-col h-full border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    Hoạt động mới nhất
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-6 overflow-hidden">
                <div className="relative border-l border-slate-100 ml-3 space-y-8">
                    {initialData.length === 0 ? (
                        <p className="text-sm text-slate-500 pl-6 italic">Chưa có hoạt động nào.</p>
                    ) : (
                        initialData.map((log) => {
                            const parsed = parseActivityDetails(log.details, log.action)
                            const time = format(new Date(log.createdAt), 'HH:mm', { locale: vi })
                            const date = format(new Date(log.createdAt), 'dd/MM', { locale: vi })

                            return (
                                <div key={log.id} className="relative pl-8 group">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[5px] top-1">
                                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 ring-4 ring-white transition-colors" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={`https://avatar.vercel.sh/${log.userName}`} />
                                                <AvatarFallback className={`${getAvatarColor(log.userName)} text-[10px]`}>
                                                    {getInitials(log.userName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
                                                {log.userName}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{date} • {time}</span>
                                        </div>

                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {/* Simplified Action Text */}
                                            {parsed.type === 'CREATE' ? 'Đã tạo sản phẩm mới' :
                                                parsed.type === 'UPDATE' ? 'Đã cập nhật thông tin' :
                                                    parsed.type === 'PRICE_INCREASE' ? `Tăng giá ${parsed.productName ? parsed.productName : 'sản phẩm'}` :
                                                        parsed.type === 'PRICE_DECREASE' ? `Giảm giá ${parsed.productName ? parsed.productName : 'sản phẩm'}` :
                                                            parsed.type === 'STOCK_CHANGE' ? 'Cập nhật tồn kho' :
                                                                log.action}
                                        </p>

                                        {/* Minimal Diff Pill */}
                                        <div className="mt-1">
                                            {parsed.type === 'PRICE_INCREASE' && (
                                                <Badge variant="outline" className="text-xs font-normal bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 h-auto gap-1">
                                                    {parsed.oldValue} <ArrowRight className="h-3 w-3" /> {parsed.newValue}
                                                </Badge>
                                            )}
                                            {parsed.type === 'PRICE_DECREASE' && (
                                                <Badge variant="outline" className="text-xs font-normal bg-rose-50 text-rose-700 border-rose-100 px-2 py-0.5 h-auto gap-1">
                                                    {parsed.oldValue} <ArrowRight className="h-3 w-3" /> {parsed.newValue}
                                                </Badge>
                                            )}
                                            {parsed.type === 'STOCK_CHANGE' && (
                                                <Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-100 px-2 py-0.5 h-auto gap-1">
                                                    Stock: {parsed.oldValue} <ArrowRight className="h-3 w-3" /> {parsed.newValue}
                                                </Badge>
                                            )}
                                            {parsed.type === 'CREATE' && (
                                                <Badge variant="outline" className="text-xs font-normal bg-slate-50 text-slate-600 border-slate-100 px-2 py-0.5 h-auto">
                                                    Sản phẩm mới
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-50">
                <Link href="/dashboard/activity" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 w-full justify-center py-2 hover:bg-slate-50 rounded-md transition-colors">
                    Xem tất cả <ChevronRight className="h-4 w-4" />
                </Link>
            </CardFooter>
        </Card>
    )
}
