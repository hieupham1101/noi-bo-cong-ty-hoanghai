import prisma from "@/lib/prisma"

interface LogActivityParams {
    userId?: string | null
    actionType: string
    entityName: string
    details?: any
}

export async function logActivity({ userId, actionType, entityName, details }: LogActivityParams) {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                actionType,
                entityName,
                details: details ?? {},
            },
        })
    } catch (error) {
        console.error("Failed to log activity:", error)
        // Fail silently to avoid blocking the main flow
    }
}
