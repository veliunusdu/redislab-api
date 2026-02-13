import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateApiKey() {
  const raw = randomBytes(32).toString('base64url')
  const prefix = raw.slice(0, 10)
  return { raw, prefix }
}

async function main() {
  const user = await prisma.user.create({
    data: { email: 'veli@example.com', name: 'Veli' },
  })

  console.log('Seeded user id:', user.id);

  const { raw, prefix } = generateApiKey()
  const keyHash = await bcrypt.hash(raw, 10)

  await prisma.apiKey.create({
    data: { userId: user.id, prefix, keyHash },
  })

  console.log('Seeded ✅')
  console.log('API KEY (copy now, not stored raw):', raw)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
