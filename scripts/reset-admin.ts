import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdmin() {
    console.log('🔄 Resetting admin password...')

    const email = 'admin@example.com'
    const password = '123456'
    const hashedPassword = bcrypt.hashSync(password, 10)

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Admin User',
            },
            create: {
                email,
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Admin User',
            },
        })

        console.log(`✅ Success! User ${user.email} password reset to "${password}"`)
    } catch (error) {
        console.error('❌ Failed to reset password:', error)
    } finally {
        await prisma.$disconnect()
    }
}

resetAdmin()
