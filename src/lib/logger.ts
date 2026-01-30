import prisma from "@/lib/prisma"

interface LogActivityParams {
    userId?: string | null
    actionType: string
    entityName: string
    entityId?: string // Optional for backward compatibility, but highly recommended
    details?: any
}

export async function logActivity({ userId, actionType, entityName, entityId, details }: LogActivityParams) {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                actionType,
                entityName,
                entityId,
                details: details ?? {},
            },
        })
    } catch (error) {
        console.error("Failed to log activity:", error)
        // Fail silently to avoid blocking the main flow
    }
}
