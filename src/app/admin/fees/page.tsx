import { getFeeRates } from './actions'
import FeeTable from './fee-table'
import { Settings, Shield } from 'lucide-react'

export default async function AdminFeesPage() {
    const feeRates = await getFeeRates()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Cấu hình phí bán hàng</h1>
                            <p className="text-muted-foreground text-sm">
                                Quản lý tỷ lệ phí theo từng danh mục và loại shop
                            </p>
                        </div>
                    </div>
                </div>

                {/* Admin Badge */}
                <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                        Chỉ quản trị viên mới có quyền chỉnh sửa cấu hình phí
                    </span>
                </div>

                {/* Fee Table */}
                <FeeTable initialData={feeRates} />

                {/* Info Footer */}
                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>Thay đổi sẽ được áp dụng ngay lập tức cho tất cả các tính toán phí mới.</p>
                </div>
            </div>
        </div>
    )
}
