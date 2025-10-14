import 'dotenv/config';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

async function migrateAndSeedIfNeeded() {
  try {
    console.log('🔄 Running prisma migrate deploy…');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    const prisma = new PrismaClient();
    const users = await prisma.user.count();

    if (users === 0) {
      console.log('🌱 No users found → running seed…');
      // seed es idempotente por uso de upsert
      execSync('node prisma/seed.mjs', { stdio: 'inherit' });
    } else {
      console.log(`✅ Users found (${users}) → skipping seed`);
    }
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

(async () => {
  await migrateAndSeedIfNeeded();
  console.log('🚀 Starting API…');
  await import('./index.mjs');
})();
