import { Router } from 'express';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { requirePermission } from '../middleware/rbac.mjs';

export const audit = Router();

audit.get('/audit', requireAuth, requirePermission('audit.read'), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json(logs);
});
