import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10)

        const usersToSeed = [
            { name: 'Thuý', email: 'thuy@shop.com', role: 'STAFF' },
            { name: 'Tòng', email: 'tong@shop.com', role: 'STAFF' },
            { name: 'Như', email: 'nhu@shop.com', role: 'STAFF' },
        ]

        const createdUsers = []

        for (const user of usersToSeed) {
            const newUser = await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    name: user.name,
                    role: user.role,
                    // Optionally update password if you want reset on seed
                    password: hashedPassword
                },
                create: {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    password: hashedPassword
                }
            })
            createdUsers.push(newUser)
        }

        return NextResponse.json({
            success: true,
            message: 'Users seeded successfully',
            data: createdUsers.map(u => ({ id: u.id, name: u.name, email: u.email }))
        })
    } catch (error) {
        console.error('Seeding error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to seed users' },
            { status: 500 }
        )
    }
}
