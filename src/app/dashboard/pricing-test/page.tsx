import { PricingSandbox } from '@/components/pricing-test/pricing-sandbox'
import { FlaskConical } from 'lucide-react'
import { getCategories } from '@/app/calculator/actions'

export default async function PricingTestPage() {
    // Fetch real categories from database
    const categories = await getCategories()

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <FlaskConical className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Công cụ Tính giá (Test)
                    </h1>
                    <p className="text-sm text-slate-500">
                        Thử nghiệm logic tính giá tự động trước khi áp dụng vào sản phẩm thực
                    </p>
                </div>
            </div>

            {/* Sandbox Component */}
            <PricingSandbox categories={categories} />
        </div>
    )
}
