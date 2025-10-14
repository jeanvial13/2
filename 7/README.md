# Flowboard – Deploy con Portainer (a prueba de errores)

Repo mínimo que **compila en CI** y Portainer **solo hace pull** de imágenes.
Incluye workflows para **Docker Hub** y **GHCR**.

## Estructura
```
frontend/  # Vite + React (placeholder; reemplázalo por tu app si quieres)
backend/   # API Express mínima
docker-compose.yml
.github/workflows/
```

## Uso rápido
1) Sube este repo a GitHub.
2) Crea secrets:
   - Docker Hub: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
   - GHCR: `GHCR_TOKEN` (PAT con write:packages)
3) Haz push a `main`. CI construirá y publicará:
   - `frontend` → `flowboard-frontend:latest`
   - `backend`  → `flowboard-backend:latest`
4) En Portainer, crea stack con `docker-compose.yml`. Opcionalmente define:
   - `REGISTRY_HOST` (`docker.io` o `ghcr.io`)
   - `REGISTRY_USER` (tu usuario en Docker Hub; en GHCR no es necesario)
   - `TAG` (`latest` por defecto)
