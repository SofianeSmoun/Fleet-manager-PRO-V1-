# FleetManager Pro V1

Gestion de flotte de véhicules utilitaires légers pour PME algériennes.

## Stack

- **Backend**: Node.js 20 + Express 4 + TypeScript strict + Prisma 5 + PostgreSQL 16
- **Frontend**: React 18 + Vite + TailwindCSS + React Query v5
- **Auth**: JWT HS256 (access 1h + refresh 7j httpOnly cookie)
- **Package manager**: pnpm (workspaces monorepo)

## Démarrage rapide

### Prérequis

- Node.js 20 LTS
- pnpm
- Docker (pour PostgreSQL)

### 1. Démarrer la base de données

```bash
docker compose up -d postgres
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Variables d'environnement

```bash
cp .env.example backend/.env
# Éditer backend/.env avec vos valeurs
```

### 4. Migrations et seed

```bash
# Appliquer les migrations
pnpm --filter backend exec npx prisma migrate deploy

# Peupler la base avec les données de démo
pnpm --filter backend run db:seed
```

Le seed (~3s) crée :

| Entité           | Quantité |
|------------------|----------|
| Utilisateurs     | 4        |
| Clients          | 4        |
| Véhicules        | 120      |
| Garages          | 6        |
| Pièces détachées | 10       |
| Interventions    | 6        |
| Polices assurance| 120      |

### 5. Lancer le développement

```bash
# Backend (port 3000)
pnpm --filter backend run dev

# Frontend (port 5173)
pnpm --filter frontend run dev
```

## Comptes de démo

| Email                            | Mot de passe | Rôle         |
|----------------------------------|--------------|--------------|
| admin@fleetmanager.dz            | Admin2026!   | ADMIN        |
| gestionnaire@fleetmanager.dz     | Gest2026!    | GESTIONNAIRE |
| commercial@fleetmanager.dz       | Comm2026!    | COMMERCIAL   |
| lecteur@fleetmanager.dz          | Read2026!    | LECTEUR      |

## Tests

```bash
# Tests backend (Vitest + Supertest)
pnpm --filter backend run test

# Couverture
pnpm --filter backend run test:coverage
```

## Auth API

```
POST /api/v1/auth/login           # email + password → access_token + cookie refresh_token
POST /api/v1/auth/refresh         # cookie refresh_token → nouvel access_token (rotation)
POST /api/v1/auth/logout          # supprime le cookie
POST /api/v1/auth/forgot-password # { email } → génère reset token (loggué en V1)
POST /api/v1/auth/reset-password  # { token, newPassword } → réinitialise le mot de passe
```

## Git Flow

```bash
git checkout develop && git pull
git checkout -b feature/ma-story
# ... travail ...
git push origin feature/ma-story
# Ouvrir PR vers develop
```

Voir `CLAUDE.md` pour le contexte complet du projet.
