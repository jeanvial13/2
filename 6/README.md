# dem_roles_v5

Proyecto listo para desplegar con **Docker/Portainer**. Incluye:
- Backend: Express + Prisma + PostgreSQL + Multer + JWT + Socket.IO
- Frontend: React + Vite + Tailwind + HeadlessUI + framer-motion + lucide-react
- RACI en crear proyecto, adjuntos (crear y details), icono de adjunto en tarjeta
- Tarjeta se marca en rojo si pasan **3 días** sin cambios (cualquier tipo)
- Gestión de usuarios con rol y corrección de errores
- Colaboración en tiempo real (ediciones simultáneas)

## Desarrollo local
```bash
# 1) backend
cd backend
cp .env.example .env
npm i
npm run prisma:generate
npm run dev  # http://localhost:4000

# 2) frontend
cd ../frontend
npm i
npm run dev  # http://localhost:5173
```

Usuarios dev seed:
- admin / admin123 (admin)
- demo / demo123 (user)

## Docker / Portainer
1. Copia `.env.example` a `.env` en la raíz y ajusta URLs/secretos.
2. En Portainer -> Stacks -> Add stack -> pega `docker-compose.yml` -> Deploy.
3. El volumen `uploads` guarda adjuntos y `pgdata` los datos de Postgres.
- Frontend (Nginx): http://TU_HOST
- API: http://TU_HOST/api

## GitHub
```bash
git init
git add .
git commit -m "dem_roles_v5 initial"
git branch -M main
git remote add origin <URL_REPO>
git push -u origin main
```