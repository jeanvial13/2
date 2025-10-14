import { Router } from 'express';
import { prisma } from '../lib/prisma.mjs';
import { verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/auth.mjs';
import { z } from 'zod';

export const auth = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

auth.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const access = signAccessToken({ sub: user.id, email: user.email });
  const refresh = signRefreshToken({ sub: user.id, email: user.email });

  // registrar refresh token
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refresh, userAgent: req.headers['user-agent'], ip: req.ip, expiresAt }
  });
  await prisma.session.create({ data: { userId: user.id, userAgent: req.headers['user-agent'], ip: req.ip } });

  res.json({ access, refresh });
});

auth.post('/auth/refresh', async (req, res) => {
  const token = req.body?.refreshToken;
  if (!token) return res.status(400).json({ error: 'Missing refreshToken' });

  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt) return res.status(401).json({ error: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token expired' });

    const payload = verifyRefreshToken(token);
    const access = signAccessToken({ sub: payload.sub, email: payload.email });
    res.json({ access });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

auth.post('/auth/logout', async (req, res) => {
  const token = req.body?.refreshToken;
  if (token) {
    await prisma.refreshToken.updateMany({ where: { token }, data: { revokedAt: new Date() } });
  }
  res.json({ ok: true });
});
