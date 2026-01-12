'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { SystemConfig } from '@prisma/client'
import { updateSystemConfig } from '@/app/actions/system-config'

interface GeneralSettingsFormProps {
    initialSettings: SystemConfig | null
}

export default function GeneralSettingsForm({ initialSettings }: GeneralSettingsFormProps) {
    // We can still use React Query for caching if we want, but server actions with revalidate are simpler.
    // Switching to direct Server Action call via useTransition or simple async handler.
    const [isPending, startTransition] = useTransition()
    const { register, handleSubmit, reset } = useForm<SystemConfig>()

    useEffect(() => {
        if (initialSettings) {
            reset({
                paymentFeePercent: initialSettings.paymentFeePercent,
                serviceFeePercent: initialSettings.serviceFeePercent,
                maxServiceFee: initialSettings.maxServiceFee,
                weightConstant: initialSettings.weightConstant,
            })
        }
    }, [initialSettings, reset])

    const onSubmit = (data: SystemConfig) => {
        startTransition(async () => {
            try {
                await updateSystemConfig({
                    paymentFeePercent: Number(data.paymentFeePercent),
                    serviceFeePercent: Number(data.serviceFeePercent),
                    maxServiceFee: Number(data.maxServiceFee),
                    weightConstant: Number(data.weightConstant),
                })
                toast.success('Cập nhật cấu hình thành công')
            } catch (error) {
                toast.error('Lỗi khi cập nhật cấu hình')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Cấu trúc Phí Shopee</CardTitle>
                    <CardDescription>
                        Các giá trị này sẽ được áp dụng cho tất cả các tính toán lợi nhuận.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="paymentFeePercent">Phí Thanh toán (%)</Label>
                        <Input
                            id="paymentFeePercent"
                            type="number"
                            step="0.0001"
                            {...register('paymentFeePercent')}
                        />
                        <p className="text-[10px] text-muted-foreground">Ví dụ: 0.05 là 5%</p>
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="serviceFeePercent">Phí Dịch vụ (%)</Label>
                            <Input
                                id="serviceFeePercent"
                                type="number"
                                step="0.0001"
                                {...register('serviceFeePercent')}
                            />
                            <p className="text-[10px] text-muted-foreground">Phí Freeship Xtra (Ví dụ 0.06)</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxServiceFee">Giới hạn Phí Dịch vụ (VND)</Label>
                            <Input
                                id="maxServiceFee"
                                type="number"
                                {...register('maxServiceFee')}
                            />
                            <p className="text-[10px] text-muted-foreground">Ví dụ: 40000</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="weightConstant">Hệ số quy đổi trọng lượng</Label>
                        <Input
                            id="weightConstant"
                            type="number"
                            {...register('weightConstant')}
                        />
                        <p className="text-[10px] text-muted-foreground">Tiêu chuẩn Shopee là 6000</p>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t px-6 py-4">
                    <Button type="submit" disabled={isPending} className="ml-auto">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu Cấu hình
                    </Button>
                </CardFooter>
            </Card>
        </form >
    )
}
