import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { requirePermission } from '../middleware/rbac.mjs';

export const roles = Router();

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

roles.post('/roles', requireAuth, requirePermission('roles.create'), async (req, res) => {
  const data = roleSchema.parse(req.body);
  const role = await prisma.role.create({ data });
  res.status(201).json(role);
});

roles.get('/roles', requireAuth, requirePermission('roles.read'), async (_req, res) => {
  const list = await prisma.role.findMany();
  res.json(list);
});

roles.patch('/roles/:id', requireAuth, requirePermission('roles.update'), async (req, res) => {
  const data = roleSchema.partial().parse(req.body);
  const role = await prisma.role.update({ where: { id: req.params.id }, data });
  res.json(role);
});

roles.delete('/roles/:id', requireAuth, requirePermission('roles.delete'), async (req, res) => {
  await prisma.role.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Asignar y revocar permisos a roles
roles.post('/roles/:id/permissions/:permId', requireAuth, requirePermission('roles.update'), async (req, res) => {
  const { id, permId } = req.params;
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: id, permissionId: permId } },
    update: {},
    create: { roleId: id, permissionId: permId }
  });
  res.json({ ok: true });
});

roles.delete('/roles/:id/permissions/:permId', requireAuth, requirePermission('roles.update'), async (req, res) => {
  const { id, permId } = req.params;
  await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId: id, permissionId: permId } } });
  res.json({ ok: true });
});
