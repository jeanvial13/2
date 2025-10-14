import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { requirePermission } from '../middleware/rbac.mjs';

export const permissions = Router();

const permSchema = z.object({
  key: z.string().min(3),
  description: z.string().optional()
});

permissions.post('/permissions', requireAuth, requirePermission('permissions.create'), async (req, res) => {
  const data = permSchema.parse(req.body);
  const p = await prisma.permission.create({ data });
  res.status(201).json(p);
});

permissions.get('/permissions', requireAuth, requirePermission('permissions.read'), async (_req, res) => {
  const list = await prisma.permission.findMany();
  res.json(list);
});

permissions.patch('/permissions/:id', requireAuth, requirePermission('permissions.update'), async (req, res) => {
  const data = permSchema.partial().parse(req.body);
  const p = await prisma.permission.update({ where: { id: req.params.id }, data });
  res.json(p);
});

permissions.delete('/permissions/:id', requireAuth, requirePermission('permissions.delete'), async (req, res) => {
  await prisma.permission.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
