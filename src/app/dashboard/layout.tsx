'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calculator, Menu } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex sticky top-0 h-screen shrink-0" />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b sticky top-0 z-20 shrink-0">
                    <div className="flex items-center">
                        <Calculator className="h-6 w-6 text-indigo-600 mr-2" />
                        <span className="font-bold text-lg tracking-tight">ShopeeCalc</span>
                    </div>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6 text-slate-600" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <div className="px-6 py-4 border-b md:hidden">
                                <SheetTitle className="text-lg font-bold">Điều hướng</SheetTitle>
                                <SheetDescription className="sr-only">Truy cập các phần khác của ứng dụng</SheetDescription>
                            </div>
                            <Sidebar className="w-full border-none h-full" />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10">
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
