# CLAUDE.md — FleetManager Pro V1

> Référence : FMP-CDC-001 | Repo : github.com/SofianeSmoun/Fleet-manager-PRO-V1- | Jira : fleetmanagerpro.atlassian.net

---

## État du projet

**Version :** v0.3.1-fix · **Branche active :** `feature/phase-1-workshop-fixes` · **Avancement :** ~45% V1 · **Tests :** 127 ✅ (49 unit backend + 62 intégration + 16 unit frontend)

| Sprint | Statut |
|--------|--------|
| S1 — Infra & Auth | ✅ v0.1.0 |
| S2 — Flotte & Locations | ✅ v0.2.0 |
| S3 — Sidebar, Clients, Garages, Mécaniciens | ✅ v0.3.0 |
| FIX — Corrections workshop 22 mars | ✅ FIX-01→07 (sauf FIX-04 → S4) |
| S4 → S8 — Interventions, Stock, Dashboard, Alertes, Finalisation | 🆕 À VENIR |

### Prochaines actions (dans l'ordre)

1. Merge `feature/phase-1-workshop-fixes` → `develop` via PR
2. FIX-04 : popup détail maintenance (Sprint 4)
3. Sprint 4 : module Interventions & Maintenance

---

## Commandes

> ⚠️ **WSL obligatoire** : `wsl bash -c "export PATH='/home/sofiane/.nvm/versions/node/v20.20.1/bin:$PATH' && cd /home/sofiane/Fleet-manager-PRO-V1- && <cmd>"`

### Infrastructure

```bash
docker compose up -d postgres
docker ps --format '{{.Names}} {{.Status}}'
```

### Backend (`backend/`)

```bash
pnpm --filter backend run dev                    # port 3000
pnpm --filter backend run typecheck              # OBLIGATOIRE avant commit
pnpm --filter backend run test:unit              # 49 tests (pas de DB)
pnpm --filter backend run test:integration       # 62 tests (nécessite Docker postgres)
pnpm --filter backend run test                   # tous les tests
pnpm --filter backend exec vitest run src/tests/unit/<fichier>.test.ts  # un seul fichier
pnpm --filter backend run test:coverage
pnpm --filter backend exec npx prisma migrate dev --name <nom>
pnpm --filter backend run db:seed                # ~3.6s
pnpm --filter backend run db:studio
```

### Frontend (`frontend/`)

```bash
pnpm --filter frontend run dev                   # port 8080
pnpm --filter frontend run typecheck
pnpm --filter frontend run build
pnpm --filter frontend run test:unit             # 16 tests
```

### Monorepo (racine)

```bash
pnpm run lint && pnpm run typecheck              # validation complète
pnpm run dev                                      # frontend + backend en parallèle
pnpm run format                                   # Prettier (100 chars, single quotes, trailing commas all, LF)
```

### Backup

```bash
pnpm --filter backend exec tsx src/scripts/testBackup.ts encrypt-test
pnpm --filter backend exec tsx src/scripts/testBackup.ts backup
pnpm --filter backend exec tsx src/scripts/testBackup.ts status
pnpm --filter backend exec tsx src/scripts/testBackup.ts restore <chemin.enc>
```

### Ports

| Service | Port | Note |
|---------|------|------|
| Frontend (Vite) | 8080 | Proxy `/api/*` → localhost:3000 |
| Backend (Express) | 3000 | |
| PostgreSQL | 5432 | Container `fleetmanager_postgres` |

**Engines :** Node.js ≥ 20, pnpm ≥ 9

---

## Architecture

```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← SOURCE DE VÉRITÉ DB (17 entités)
│   │   ├── migrations/
│   │   ├── seed.ts                ← 4 users · 4 clients · 120 véhicules · 6 garages · 10 pièces · 120 polices
│   │   └── create-admin.ts        ← script idempotent admin (ADMIN_EMAIL/ADMIN_PASSWORD)
│   └── src/
│       ├── index.ts               ← Express app (Swagger à /api/docs en dev)
│       ├── lib/                   ← prisma.ts, logger.ts, schemas.ts, swagger.ts, encryption.ts
│       ├── schemas/               ← Zod (rental, garage, client, vehicle)
│       ├── middleware/            ← auth.ts, auditLog.ts, validate.ts, errorHandler.ts, notFound.ts
│       ├── routes/                ← auth, vehicles, rentals, clients, garages, auditLogs, backup
│       ├── controllers/           ← orchestration HTTP uniquement (ZÉRO logique métier)
│       ├── services/              ← TOUTE logique métier ici (vehicle, rental, garage, client, auth, backup)
│       ├── scheduler/             ← node-cron backup hebdo dimanche 02h00
│       └── tests/
│           ├── helpers/           ← testDb.ts (seed + loginAs), testServer.ts
│           ├── unit/              ← vehicle (22), rental (15), garage (12)
│           └── integration/       ← auth (12), vehicles (17), rentals (9), clients (7), garages (5), audit (3), backup (5)
└── frontend/
    └── src/
        ├── lib/                   ← axios.ts (intercepteur JWT), auth-token.ts (stockage mémoire)
        ├── types/                 ← enums miroir Prisma, Vehicle, Rental, Client, Garage
        ├── hooks/                 ← useAuth, useVehicles, useRentals, useClients, useGarages
        ├── components/            ← StatusBadge, EmptyState, VehicleFormModal, layout/ (AppLayout, Sidebar, RoleGuard)
        ├── pages/                 ← Login, Dashboard, Flotte, VehicleDetail, Locations, Clients, ClientDetail, Garages, AccessDenied
        └── tests/unit/            ← sidebar (8), clients (8)
```

### Flux auth

```
Login  → POST /auth/login  → access_token (body) + refresh_token (httpOnly cookie 7j)
Refresh → POST /auth/refresh → rotation tokens
Logout  → POST /auth/logout  → cookie expiré
Reset   → token UUID TTL 30min (loggé, pas d'email V1)
```

### Middleware Express : `helmet → cors → rateLimit → cookieParser → json → swagger (dev) → routes → errorHandler → notFound`

### Base de données

- Container : `fleetmanager_postgres` · Credentials : `fleetmanager:fleetmanager_dev` · DB : `fleetmanager`
- `DATABASE_URL=postgresql://fleetmanager:fleetmanager_dev@localhost:5432/fleetmanager`

---

## Points de vigilance TypeScript

- **`exactOptionalPropertyTypes: true`** — Impact majeur :
  - Headers Supertest : typer via `unknown` puis narrower, jamais caster en `string[]`
  - Prisma updates : construire payload explicite (`if (data.field !== undefined) updateData.field = data.field`)
  - Props frontend optionnelles : `value?: string | undefined`
- **`StringValue` de `ms`** requis pour `jwt.sign({ expiresIn })` — cast depuis `string`
- Erreurs métier : `Object.assign(new Error('msg'), { statusCode: 4xx })` → capturé par `errorHandler`
- **ESLint strict** : `max-warnings 0`, `no-explicit-any: error`, `no-console` autorise uniquement `warn/error`
- **Backend = CommonJS**, **Frontend = ES modules** avec alias `@/*` → `src/*`
- **Pattern mock Vitest** : `vi.hoisted()` pour variables mock (car `vi.mock()` est hoisté). Ref : `vehicle.service.test.ts`

---

## Règles métier critiques

### Automate d'états véhicule

> Centralisé dans `vehicleService.ts` UNIQUEMENT. Toute transition non listée → HTTP 400.

```
DISPONIBLE  → LOUE         (création Rental)
DISPONIBLE  → MAINTENANCE  (création Maintenance)
DISPONIBLE  → HORS_SERVICE (ADMIN only)
LOUE        → DISPONIBLE   (clôture Rental)
LOUE        → MAINTENANCE  (urgence)
LOUE        → HORS_SERVICE (ADMIN only → Rental ANNULEE)
MAINTENANCE → DISPONIBLE   (clôture étape 4)
MAINTENANCE → HORS_SERVICE (post-maintenance)
HORS_SERVICE → DISPONIBLE  (ADMIN only)
```

Chaque transition → `StatusHistory` avec `reason` obligatoire (422 si vide).

### Workflow intervention (4 étapes)

| Étape | Action | Effets |
|-------|--------|--------|
| ① Création | Véhicule + garage + types travaux + dates | Vehicle → MAINTENANCE, statut EN_ATTENTE |
| ② Pièces | Sélection catalogue + quantités | MaintenancePart créés (pas de déduction stock) |
| ③ Démarrage | Confirmation gestionnaire | → EN_COURS, StockMovement SORTIE, StockEntry.quantite-- |
| ④ Clôture | Date réelle + coût réel + rapport (obligatoire) | → TERMINEE, Vehicle → DISPONIBLE |

**EN_RETARD** = calculé dynamiquement (`dateSortiePrevue < now()` ET statut EN_ATTENTE/EN_COURS), jamais stocké en DB.

### Soft delete

`deletedAt DateTime?` sur toutes les entités. Filtre par défaut `WHERE deletedAt IS NULL`. Blocages : Client (si véhicule actif), Garage (si maintenance active), SparePart (si stock > 0).

---

## Rôles & Permissions

| Action | ADMIN | GESTIONNAIRE | COMMERCIAL | LECTEUR |
|--------|:-----:|:------------:|:----------:|:-------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Flotte R/W/D | ✓/✓/✓ | ✓/✓/✗ | ✓/✗/✗ | ✓/✗/✗ |
| Clients R/W | ✓/✓ | ✓/✓ | ✓/✓ | ✓/✗ |
| Locations R/W | ✓/✓ | ✓/✓ | ✓/✗ | ✓/✗ |
| Interventions R/W | ✓/✓ | ✓/✓ | ✗/✗ | ✓/✗ |
| Garages R/W | ✓/✓ | ✓/✓ | ✓/✗ | ✓/✗ |
| Stock R/W | ✓/✓ | ✓/✓ | ✗/✗ | ✓/✗ |
| Assurances R/W | ✓/✓ | ✓/✗ | ✓/✓ | ✓/✗ |
| Paramètres/Users | ✓ | ✗ | ✗ | ✗ |

Impl : middleware `requireRole(...roles)`. Frontend : boutons masqués (`display: none`), jamais grisés.

---

## API REST — Conventions

```
Base : /api/v1 | Auth : Bearer <access_token> | Format : JSON | Pagination : ?page=1&limit=15&sortBy=createdAt&order=desc | Dates : ISO 8601
```

Codes : 200 OK · 201 Created · 400 Bad Request (transition invalide) · 401 Unauthorized · 403 Forbidden · 404 Not Found · 422 Validation (Zod) · 500 Server Error

### Endpoints implémentés (v0.3.1-fix)

```
POST   /auth/login|refresh|logout|forgot-password|reset-password

GET|POST         /vehicles          (filters: statut, marque, wilaya, maintenance, from/to, q)
GET|PATCH|DELETE  /vehicles/:id
PATCH             /vehicles/:id/status|km
GET               /vehicles/:id/history
GET               /vehicles/export/excel

GET|POST         /rentals           (dateFinPrevue optionnelle = contrat ouvert)
GET               /rentals/:id
PATCH             /rentals/:id/close

GET|POST         /clients           (filters: wilaya, secteur, q + _count.vehicles)
GET               /clients/:id|/:id/detail
PATCH|DELETE      /clients/:id

GET|POST         /garages           (includes: active maintenances + workload)
GET|PATCH|DELETE  /garages/:id

GET               /audit-logs (ADMIN)
GET|POST          /admin/backup/status|trigger (ADMIN)
```

### Endpoints à venir (S4+)

```
POST|PATCH /interventions (workflow 4 étapes)
GET|POST   /spare-parts + POST /stock/movement
GET|POST|PATCH /insurance-policies
GET        /dashboard/kpis|alerts
GET        /reports/*
```

---

## Git flow

```
main     → production (PR only, tag vX.Y.Z)
develop  → staging (PR only)
feature/ → une branche par ticket
```

**Commits :** `type(scope): description` — types : feat | fix | chore | test | docs | refactor | perf

**Workflow :** `git checkout develop && git pull → git checkout -b feature/xxx → work → push → PR vers develop`

**Règle absolue :** Ne jamais push sur `main` ou `develop` directement.

---

## Design system

- **Thème :** Industriel / Utilitaire premium · **Fonts :** IBM Plex Sans (corps), IBM Plex Mono (immat, codes, chiffres)
- **Couleurs clés :** navy `#0D1B2A` · blue `#1D6FA4` · green `#0E7C59` · amber `#B45309` · red `#C0392B` · bg `#F4F6F9` · text `#1A2332`
- **Badges :** DISPONIBLE/TERMINEE/ACTIVE → vert · LOUE/EN_COURS → bleu · MAINTENANCE/EXPIRANT → amber · HORS_SERVICE/EN_ATTENTE → gris · EN_RETARD/EXPIREE → rouge
- **UX :** Pagination 15/page · Modals pour actions destructives · Toasts 3s bas-centre · Bandeau rouge alertes critiques · Immat toujours en monospace badge gris

---

## Variables d'environnement

```bash
DATABASE_URL="postgresql://fleetmanager:fleetmanager_dev@localhost:5432/fleetmanager"
JWT_SECRET="<64+ chars>"
JWT_REFRESH_SECRET="<64+ chars, différent>"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"
NODE_ENV="development"
PORT="3000"
TZ="Africa/Algiers"
FRONTEND_URL="http://localhost:8080"
BACKUP_ENCRYPTION_KEY="<32 bytes hex>"
BACKUP_LOCAL_DIR="/var/backups/fleetmanager"
```

> ⚠️ Nodemailer/SMTP exclus V1. Ne pas ajouter de variables SMTP.

---

## Comptes de démo (seed)

```
admin@fleetmanager.dz        / Admin2026!   → ADMIN
gestionnaire@fleetmanager.dz / Gest2026!    → GESTIONNAIRE
commercial@fleetmanager.dz   / Comm2026!    → COMMERCIAL
lecteur@fleetmanager.dz      / Read2026!    → LECTEUR
```

Seed bloqué en `NODE_ENV=production`. Empty states obligatoires sur toutes les pages.

---

## Décisions figées — Ne pas remettre en question

| Décision | Choix | Raison |
|----------|-------|--------|
| PDF export | jsPDF (navigateur) | VPS 4Go RAM — Puppeteer exclu |
| Alertes V1 | InApp uniquement | Email = V2 premium |
| Mécaniciens | Fusionné dans Garages (FIX-02 ✅) | PME = prestataires externes uniquement |
| Backup | Local AES-256-GCM | Google Drive reporté V2 (quota Service Account) |
| Queue | node-cron | BullMQ/Redis = over-engineering pour 7 jobs/jour |
| Monitoring | Winston + UptimeRobot | Grafana/Loki = overkill pour 3 users |
| Stockage externe | Exclu V1 | Backblaze B2 hors territoire algérien |
| Tests | Vitest unifié (remplace Jest) | Backend + frontend |
| Staging | Pas permanent | À la demande uniquement |
| Transitions états | vehicleService.ts uniquement | Jamais dans les controllers |
| AuditLog | Middleware déclaratif | Jamais dans les controllers |
| Soft delete | `deletedAt` universel | Jamais suppression physique |

---

## Backup — Résumé technique

- **Format :** `pg_dump → gzip → AES-256-GCM → .sql.gz.enc`
- **Fréquence :** Hebdo dimanche 02h00 + retry quotidien si échec
- **Fichiers :** `encryption.ts`, `googleDrive.ts` (stockage local malgré le nom), `backupService.ts`, `scheduler/index.ts`, `testBackup.ts`
- **Dashboard :** Widget admin (statut + historique 10 derniers + bouton manuel)

---

## Corrections workshop (FIX-01 à FIX-07)

> Détail complet dans DTF_FleetManager_Pro.docx §3 et DOC_Fonctionnelle §12

| Réf | Module | Description | Statut |
|-----|--------|-------------|--------|
| FIX-01 | Clients | Refonte → tableau paginé + colonnes Wilaya/Véhicules loués + CRUD + filtres | ✅ |
| FIX-02 | Garages | Fusion Mécaniciens dans Garages — supprimé /mecaniciens + sidebar + tests | ✅ |
| FIX-03 | Flotte | Colonnes Wilaya + Date début/fin location + Maintenance | ✅ |
| FIX-04 | Flotte | Popup détail maintenance (type, garage, dates, pièces, lien intervention) | ⏳ Sprint 4 |
| FIX-05 | Flotte | Filtres Wilaya + Maintenance OUI/NON + Période | ✅ |
| FIX-06 | Assurances | Champ adresseAgence dans InsurancePolicy | ✅ |
| FIX-07 | Locations | dateFinPrevue optionnelle (contrat ouvert) + EN_RETARD adapté | ✅ |

---

## Tests — Stratégie

| Niveau | Outil | Périmètre |
|--------|-------|-----------|
| Unitaires | Vitest + vi.mock | Services métier, composants React |
| Intégration | Vitest + Supertest | Tous endpoints API (DB test isolée) |
| E2E (futur) | Playwright | Workflows métier complets |

**Règle :** Tests écrits EN MÊME TEMPS que le service. Ordre validation : ① unit ✅ → ② intégration ✅ → ③ tests manuels ✅ → ④ commit + PR.

---

*Dernière mise à jour : 23 Mars 2026 — Corrections workshop FIX-01→FIX-07 livrées (sauf FIX-04 → S4). Branche `feature/phase-1-workshop-fixes` prête pour PR → develop.*
*Ce fichier fait autorité sur toute décision technique ou fonctionnelle. Docs complémentaires : fleetmanager-specs.json, DTF, CDC, DOC Fonctionnelle.*
