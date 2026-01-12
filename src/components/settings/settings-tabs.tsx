'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import GeneralSettingsForm from "./general-settings-form"
import CategoryFeeTable, { CategoryWithRates } from "./category-fee-table"
import { SystemConfig } from "@prisma/client"

interface SettingsTabsProps {
    settings: SystemConfig | null
    categoryFees: CategoryWithRates[]
}

export default function SettingsTabs({ settings, categoryFees }: SettingsTabsProps) {
    return (
        <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 text-blue-800 dark:text-blue-300">
                <Info className="h-4 w-4" />
                <AlertTitle>Lưu ý về thứ tự ưu tiên</AlertTitle>
                <AlertDescription>
                    Phí theo ngành hàng (Tab 2) sẽ được ưu tiên áp dụng. Nếu không có cấu hình riêng, hệ thống sẽ dùng Phí mặc định.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="general">Cấu hình chung</TabsTrigger>
                    <TabsTrigger value="categories">Biểu phí ngành hàng</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-4">
                    <GeneralSettingsForm initialSettings={settings} />
                </TabsContent>
                <TabsContent value="categories" className="mt-4">
                    <CategoryFeeTable initialData={categoryFees} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
