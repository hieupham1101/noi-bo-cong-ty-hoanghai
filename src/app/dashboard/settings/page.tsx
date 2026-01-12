import { getFeeRates } from '@/app/admin/fees/actions'
import SettingsTabs from '@/components/settings/settings-tabs'
import { Settings as SettingsIcon } from 'lucide-react'
import { getSystemConfig } from '@/app/actions/system-config'

export const metadata = {
    title: 'Cấu hình Hệ thống',
    description: 'Thiết lập các loại phí Shopee',
}

export default async function SettingsPage() {
    // 1. Fetch System Settings (Singleton)
    const settings = await getSystemConfig()

    // 2. Fetch Category Fees (New Fee System)
    const categoryFees = await getFeeRates()

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                        <SettingsIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cấu hình Hệ thống</h1>
                        <p className="text-slate-500 dark:text-slate-400">Thiết lập các loại phí và tham số tính toán cho Shopee.</p>
                    </div>
                </div>
            </div>

            {/* Client Component handling Tabs & Forms */}
            <SettingsTabs settings={settings} categoryFees={categoryFees} />
        </div>
    )
}
