import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@demo.local';
  const adminPass  = process.env.ADMIN_PASS  || 'demo123';
  const adminName  = process.env.ADMIN_NAME  || 'System Admin';

  // Permisos base
  const basePerms = [
    'users.read','users.create','users.update','users.delete',
    'roles.read','roles.create','roles.update','roles.delete',
    'permissions.read','permissions.create','permissions.update','permissions.delete',
    'audit.read'
  ];

  // Upsert permisos
  const permRecords = [];
  for (const key of basePerms) {
    const p = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key }
    });
    permRecords.push(p);
  }

  // Rol ADMIN con todos los permisos
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Superuser with all permissions' }
  });

  for (const p of permRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id }
    });
  }

  // Usuario admin
  const hash = await bcrypt.hash(adminPass, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: adminName, passwordHash: hash, isActive: true }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id }
  });

  console.log('✅ Seed OK → Admin:', adminEmail, 'Role: ADMIN');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
