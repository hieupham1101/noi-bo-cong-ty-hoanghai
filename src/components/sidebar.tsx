'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    History,
    Settings,
    FileUp,
    LogOut,
    Calculator,
    User,
    ChevronLeft,
    ChevronRight,
    FlaskConical
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const sidebarItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Lịch sử hoạt động", href: "/dashboard/activity", icon: History },
    { name: "Cấu hình", href: "/dashboard/settings", icon: Settings },
    { name: "Nhập Excel", href: "/dashboard/import", icon: FileUp },
    { name: "Test Định Giá", href: "/dashboard/pricing-test", icon: FlaskConical },
]

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                "relative flex flex-col bg-white border-r transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20" : "w-64",
                className
            )}
        >
            <div className="flex items-center h-16 px-6 border-b shrink-0 overflow-hidden">
                <Calculator className="h-6 w-6 text-indigo-600 shrink-0" />
                {!isCollapsed && (
                    <span className="ml-3 font-bold text-lg tracking-tight whitespace-nowrap">ShopeeCalc</span>
                )}
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all group",
                                isActive
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 shrink-0 transition-colors",
                                isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                            )} />
                            {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t mt-auto space-y-4 shrink-0 overflow-hidden">
                <div className={cn(
                    "flex items-center p-2 rounded-lg bg-slate-50 border border-slate-100",
                    isCollapsed ? "justify-center" : "gap-3"
                )}>
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                                {session?.user?.name || "User name"}
                            </p>
                            <button
                                onClick={() => signOut()}
                                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mt-0.5"
                            >
                                <LogOut className="h-3 w-3" />
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all z-10 shadow-sm"
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </button>
            </div>
        </aside>
    )
}
