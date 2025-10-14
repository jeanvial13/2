import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { requirePermission } from '../middleware/rbac.mjs';
import { hashPassword } from '../lib/auth.mjs';

export const users = Router();

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  isActive: z.boolean().optional().default(true)
});

users.post('/users', requireAuth, requirePermission('users.create'), async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const hash = await hashPassword(parsed.password);
    const user = await prisma.user.create({
      data: { email: parsed.email, name: parsed.name, passwordHash: hash, isActive: parsed.isActive }
    });
    await prisma.auditLog.create({
      data: { userId: req.user.sub, actor: req.user.email, action: 'USER_CREATE', entity: 'User', entityId: user.id, ip: req.ip }
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

users.get('/users', requireAuth, requirePermission('users.read'), async (_req, res) => {
  const list = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(list);
});

users.get('/users/:id', requireAuth, requirePermission('users.read'), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional()
});

users.patch('/users/:id', requireAuth, requirePermission('users.update'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updated = await prisma.user.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({
      data: { userId: req.user.sub, actor: req.user.email, action: 'USER_UPDATE', entity: 'User', entityId: updated.id, ip: req.ip, payload: data }
    });
    res.json(updated);
  } catch (e) { next(e); }
});

users.delete('/users/:id', requireAuth, requirePermission('users.delete'), async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

users.post('/users/:id/roles/:roleId', requireAuth, requirePermission('roles.update'), async (req, res) => {
  const { id, roleId } = req.params;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: id, roleId } },
    update: {},
    create: { userId: id, roleId }
  });
  res.json({ ok: true });
});

users.delete('/users/:id/roles/:roleId', requireAuth, requirePermission('roles.update'), async (req, res) => {
  const { id, roleId } = req.params;
  await prisma.userRole.delete({ where: { userId_roleId: { userId: id, roleId } } });
  res.json({ ok: true });
});
