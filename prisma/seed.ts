import { PrismaClient, ShopType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper to create slug from name/key if needed, but user provided keys.
// We will use the keys in parentheses as the base for slugs, lowercase and dashed.
// I will map the provided keys to clean slugs.

const categories = [
    { name: 'Tivi', slug: 'tivi' },
    { name: 'Tivi Box & Đầu thu', slug: 'tivi-box' },
    { name: 'Máy lạnh/Điều hòa', slug: 'may-lanh' },
    { name: 'Máy giặt & Máy sấy', slug: 'may-giat' },
    { name: 'Máy nước nóng', slug: 'may-nuoc-nong' },
    { name: 'Tủ lạnh', slug: 'tu-lanh' },
    { name: 'Tủ đông', slug: 'tu-dong' },
    { name: 'Máy rửa bát', slug: 'may-rua-bat' },
    { name: 'Lò vi sóng', slug: 'lo-vi-song' },
    { name: 'Nồi cơm điện', slug: 'noi-com-dien' },
    { name: 'Nồi chiên không dầu', slug: 'noi-chien-khong-dau' },
    { name: 'Máy lọc nước', slug: 'may-loc-nuoc' },
    { name: 'Máy hút bụi', slug: 'may-hut-bui' }, // Only in Mall list, but good to have
    { name: 'Bàn là/Bàn ủi', slug: 'ban-la' }, // Only in Mall list
]

// Data Types
type FeeData = {
    slug: string
    percentage: number
}

// GROUP A: NORMAL SHOP
const normalShopFees: FeeData[] = [
    { slug: 'tivi', percentage: 7.5 },
    { slug: 'tivi-box', percentage: 8.0 },
    { slug: 'may-lanh', percentage: 7.5 },
    { slug: 'may-giat', percentage: 7.5 },
    { slug: 'may-nuoc-nong', percentage: 8.0 },
    { slug: 'tu-lanh', percentage: 8.0 },
    { slug: 'tu-dong', percentage: 8.0 },
    { slug: 'may-rua-bat', percentage: 8.0 },
    { slug: 'lo-vi-song', percentage: 10.0 },
    { slug: 'noi-com-dien', percentage: 10.0 },
    { slug: 'noi-chien-khong-dau', percentage: 10.0 },
    { slug: 'may-loc-nuoc', percentage: 10.0 },
]

// GROUP B: SHOP MALL
const mallShopFees: FeeData[] = [
    { slug: 'tivi', percentage: 3.8 },
    { slug: 'tivi-box', percentage: 12.6 },
    { slug: 'may-lanh', percentage: 6.5 },
    { slug: 'may-giat', percentage: 5.5 },
    { slug: 'may-nuoc-nong', percentage: 8.3 },
    { slug: 'tu-lanh', percentage: 5.5 },
    { slug: 'tu-dong', percentage: 5.5 },
    { slug: 'may-rua-bat', percentage: 6.5 },
    { slug: 'lo-vi-song', percentage: 14.7 },
    { slug: 'noi-com-dien', percentage: 14.7 },
    { slug: 'noi-chien-khong-dau', percentage: 14.7 },
    { slug: 'may-hut-bui', percentage: 9.5 },
    { slug: 'ban-la', percentage: 13.5 },
]

async function main() {
    console.log('🌱 Starting seed...')

    // 1. Ensure Categories Exist
    console.log('... Upserting Categories')
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name },
            create: {
                name: cat.name,
                slug: cat.slug,
            },
        })
    }

    // 2. Process Normal Shop Fees
    console.log('... Processing NORMAL Shop Fees')
    for (const fee of normalShopFees) {
        const category = await prisma.category.findUnique({
            where: { slug: fee.slug },
        })

        if (category) {
            await prisma.feeRate.upsert({
                where: {
                    categoryId_shopType: {
                        categoryId: category.id,
                        shopType: ShopType.NORMAL,
                    },
                },
                update: {
                    percentage: fee.percentage,
                },
                create: {
                    categoryId: category.id,
                    shopType: ShopType.NORMAL,
                    percentage: fee.percentage,
                },
            })
        }
    }

    // 3. Process Mall Shop Fees
    console.log('... Processing MALL Shop Fees')
    for (const fee of mallShopFees) {
        const category = await prisma.category.findUnique({
            where: { slug: fee.slug },
        })

        if (category) {
            await prisma.feeRate.upsert({
                where: {
                    categoryId_shopType: {
                        categoryId: category.id,
                        shopType: ShopType.MALL,
                    },
                },
                update: {
                    percentage: fee.percentage,
                },
                create: {
                    categoryId: category.id,
                    shopType: ShopType.MALL,
                    percentage: fee.percentage,
                },
            })
        }
    }


    // 4. System Config
    console.log('... Processing System Config')
    await prisma.systemConfig.upsert({
        where: { id: 1 },
        update: {}, // No updates if exists, preserve user changes
        create: {
            // id is autoincrement, but we want a singleton, so we can let it auto-assign 1 or force it if desired. 
            // Since it's autoincrement, we shouldn't force ID unless necessary, but upsert needs a unique field.
            // schema says: id Int @id @default(autoincrement())
            // We can specify ID 1 for simplicity of singleton.
            id: 1,
            paymentFeePercent: 0.0491,
            fixedFeePercent: 0.04,
            serviceFeePercent: 0.06,
            maxServiceFee: 40000,
            weightConstant: 6000,
        },
    })


    // 5. Admin User
    console.log('... Processing Admin User')
    const adminPassword = process.env.ADMIN_PASSWORD || '123456'
    const hashedPassword = bcrypt.hashSync(adminPassword, 10)

    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            // Update password if running seed again to ensure it matches known credentials
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Admin User',
        },
        create: {
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Admin User',
        },
    })

    console.log('✅ Seeding completed.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
