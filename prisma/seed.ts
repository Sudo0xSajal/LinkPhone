import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() { console.log('Seeding database...') }
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
