# d1 — IT SEALS project track (local first)

## Paso a paso (rápido)
1) **Requisitos**: Node 20+ y npm.
2) Abrir una terminal en la carpeta `d1/backend` y crear `.env` (puede copiar `.env.example`).
3) Instalar dependencias:
   ```bash
   cd backend
   npm install
   npm start
   ```
4) Abrir `http://localhost:3000` en el navegador.
   - Login demo: **admin / admin123**
5) Crear proyectos (normal o **Special Projects**).
6) Seleccionar un proyecto en la barra inferior para mostrar el **rail**.
   - Dar click en cualquier etapa del rail para actualizar el estado.
   - Guardar RACI, añadir notas, poner **Hold** o **Close**.
   - La tarjeta del proyecto se pone **roja** si han pasado **> 5 días** sin actualizaciones.

## Estructura
- `backend/` Express + lowdb (JSON).
- `frontend/` HTML estático + Tailwind + SVG rail.
- `docker-compose.yml` para ejecutar en NAS/Portainer.

## Docker
Desde la carpeta `d1/`:
```bash
docker compose up -d --build
```
Luego abre `http://localhost:3000`.

## Usuarios
- Por defecto se crea: `admin / admin123` (solo para pruebas).
- El admin puede crear usuarios vía `POST /api/users` (no incluido en UI).

## Notas
- El rail SVG replica la imagen: línea principal, ramas **Cancel**, burbujas de **Close/Cancel** y nodos por etapa.
- Los **Special Projects** se muestran en azul y el rail usa borde azul para distinguirlos.
- Todo persiste en `backend/db.json`.