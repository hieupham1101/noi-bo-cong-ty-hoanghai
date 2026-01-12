'use server'

import prisma from '@/lib/prisma'
import { SystemConfig } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getSystemConfig(): Promise<SystemConfig> {
    let config = await prisma.systemConfig.findFirst()

    if (!config) {
        // Fallback if seed didn't run or somehow deleted
        try {
            config = await prisma.systemConfig.create({
                data: {
                    id: 1,
                    paymentFeePercent: 0.0491,
                    serviceFeePercent: 0.06,
                    maxServiceFee: 40000,
                    weightConstant: 6000,
                }
            })
        } catch {
            // Race condition or id collision, try fetch again
            config = await prisma.systemConfig.findFirst()
            if (!config) throw new Error("Failed to initialize system config")
        }
    }

    return config
}

export async function updateSystemConfig(data: Partial<SystemConfig>) {
    // We assume ID 1 is the singleton
    // If we fetched the ID dynamically in get, we should probably pass it or findFirst again.
    // Using findFirst to be safe if ID isn't exactly 1 (though seed sets it).
    const current = await prisma.systemConfig.findFirst()
    if (!current) throw new Error('Config not found')

    await prisma.systemConfig.update({
        where: { id: current.id },
        data: {
            paymentFeePercent: data.paymentFeePercent,
            serviceFeePercent: data.serviceFeePercent,
            maxServiceFee: data.maxServiceFee,
            weightConstant: data.weightConstant,
        },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function forceUpdatePaymentFee() {
    const start = Date.now()
    try {
        await prisma.systemConfig.updateMany({
            data: {
                paymentFeePercent: 0.0491
            }
        })
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard')
        return { success: true, duration: Date.now() - start }
    } catch (e) {
        console.error("Force update failed", e)
        return { success: false, error: e }
    }
}
