import { prisma } from '../lib/prisma.mjs';

export function requirePermission(...permKeys) {
  return async (req, res, next) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Cargar permisos del usuario (vía roles)
    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    const userPerms = new Set(
      roles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.key))
    );

    const allowed = permKeys.every(k => userPerms.has(k));
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    next();
  };
}
