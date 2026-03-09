# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# FleetManager Pro V1 — Contexte projet complet
> Référence : FMP-CDC-001 | Backlog : FMP-BKL-001 | Repo : https://github.com/SofianeSmoun/Fleet-manager-PRO-V1-.git

---

## Commands

> ⚠️ **WSL obligatoire** : toutes les commandes Node/pnpm doivent être exécutées via WSL avec le PATH nvm explicite.
> Template : `wsl bash -c "export PATH='/home/sofiane/.nvm/versions/node/v20.20.1/bin:$PATH' && cd /home/sofiane/Fleet-manager-PRO-V1- && <cmd>"`

### Infrastructure

```bash
# Démarrer PostgreSQL (Docker)
docker compose up -d postgres

# Vérifier que le container est healthy
docker ps --format '{{.Names}} {{.Status}}'
```

### Backend (`backend/`)

```bash
# Développement (hot-reload)
pnpm --filter backend run dev          # port 3000

# TypeScript check (OBLIGATOIRE avant commit)
pnpm --filter backend run typecheck

# Tests Vitest + Supertest (nécessite Docker postgres running)
pnpm --filter backend run test

# Un seul test par fichier
pnpm --filter backend exec vitest run src/tests/auth.test.ts

# Couverture
pnpm --filter backend run test:coverage

# Migrations Prisma
pnpm --filter backend exec npx prisma migrate dev --name <nom>
pnpm --filter backend exec npx prisma migrate deploy   # production

# Seed base de données (~3.6s)
pnpm --filter backend run db:seed

# Prisma Studio (UI base de données)
pnpm --filter backend run db:studio
```

### Frontend (`frontend/`)

```bash
# Développement (hot-reload)
pnpm --filter frontend run dev         # port 8080

# TypeScript check
pnpm --filter frontend run typecheck

# Build production
pnpm --filter frontend run build
```

### Monorepo (racine)

```bash
# Lint tous les packages
pnpm run lint

# Typecheck tous les packages
pnpm run typecheck

# Install toutes les dépendances
pnpm install
```

---

## Architecture

### Monorepo pnpm workspaces

```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← source de vérité absolue de la DB
│   │   ├── migrations/            ← historique SQL (commité dans git)
│   │   └── seed.ts                ← 4 users · 4 clients · 120 véhicules · 6 garages · 10 pièces · 120 polices
│   └── src/
│       ├── index.ts               ← Express app + montage routes (export default app pour tests)
│       ├── lib/
│       │   ├── prisma.ts          ← singleton PrismaClient
│       │   ├── logger.ts          ← Winston + DailyRotateFile (JSON structuré)
│       │   └── schemas.ts         ← schemas Zod partagés (login, forgotPassword, resetPassword)
│       ├── middleware/
│       │   ├── auth.ts            ← authenticate (JWT verify + DB lookup) + requireRole
│       │   ├── validate.ts        ← factory Zod middleware → 422 si invalide
│       │   ├── errorHandler.ts    ← ZodError→422, {statusCode}→code, sinon 500
│       │   └── notFound.ts        ← 404 catch-all
│       ├── routes/auth.routes.ts  ← rate limit 10/min + login/refresh/logout/forgot/reset
│       ├── controllers/           ← handlers HTTP, délèguent aux services
│       ├── services/auth.service.ts ← loginService, refreshService, forgotPasswordService, resetPasswordService
│       └── tests/auth.test.ts     ← 11 tests Supertest (tous passent)
└── frontend/
    └── src/
        ├── main.tsx               ← QueryClient (staleTime 5min) + BrowserRouter
        ├── App.tsx                ← routes : /login → LoginPage, /dashboard (E2)
        ├── lib/axios.ts           ← instance Axios + intercepteur auto-refresh JWT
        ├── types/index.ts         ← enums TypeScript miroir du schema Prisma
        └── pages/LoginPage.tsx    ← formulaire + 4 boutons quick-login démo
```

### Flux d'authentification

```
Login  → POST /api/v1/auth/login  → access_token (body) + refresh_token (httpOnly cookie, 7j)
Refresh → POST /api/v1/auth/refresh → rotation : nouveau access_token + nouveau refresh_token
Logout  → POST /api/v1/auth/logout  → cookie expiré
Forgot  → POST /api/v1/auth/forgot-password → UUID token loggué (TTL 30min, pas d'email V1)
Reset   → POST /api/v1/auth/reset-password  → bcrypt cost 12, token invalidé après usage
```

Le `access_token` est stocké **en mémoire** côté frontend (`getAccessToken()`/`setAccessToken()` dans `LoginPage.tsx`). L'intercepteur Axios tente un refresh automatique sur 401.

### Middleware chain Express

```
helmet → cors → rateLimit → cookieParser → json → routes → errorHandler → notFound
```

### Base de données — connexion

- Container Docker : `fleetmanager_postgres` (port 5432)
- Credentials : `fleetmanager:fleetmanager_dev` (DB: `fleetmanager`)
- `DATABASE_URL` dans `backend/.env` : `postgresql://fleetmanager:fleetmanager_dev@localhost:5432/fleetmanager`

### Points de vigilance

- **`exactOptionalPropertyTypes: true`** dans tsconfig — les headers Supertest comme `res.headers['set-cookie']` doivent être typés via `unknown` puis narrowés, jamais castés directement en `string[]`.
- **`StringValue` de `ms`** requis pour `jwt.sign({ expiresIn })` — cast obligatoire depuis `string`.
- Le schema Prisma est la **source de vérité** — toujours migrer avant de coder la logique métier.
- Les erreurs métier utilisent `Object.assign(new Error('msg'), { statusCode: 4xx })` — capturé par `errorHandler`.

---

## 0. Règle d'or

**Ne jamais push directement sur `main` ou `develop`.** Toujours travailler sur une branche `feature/xxx`, ouvrir une PR vers `develop`, merger après validation. Chaque session de travail commence par `git pull origin develop` et crée une nouvelle branche feature.

---

## 1. Contexte métier

**Commanditaire :** PME algérienne de location de véhicules utilitaires légers (LLD) pour entreprises industrielles.

**Problème résolu :** Remplace des Google Sheets, fichiers Excel et carnets papier par une application web centralisée.

**Périmètre V1 :** 120 véhicules · 4 clients industriels (Cosider, Sonatrach, Sonelgaz, Agrodiv) · 1 à 3 utilisateurs simultanés maximum.

**Modules V1 :**
- M1 Dashboard & KPIs
- M2 Gestion de la flotte (véhicules)
- M3 Gestion des clients
- M4 Interventions & Maintenance
- M5 Garages prestataires (ex-Mécaniciens dans le CDC)
- M6 Stock de pièces détachées
- M7 Assurances
- M8 Alertes InApp
- M9 Rapports & Exports
- M10 Paramètres
- M11 Gestion des Locations ← **ajout vs CDC, cœur métier**

**Hors scope V1 :** Alertes email/SMS, application mobile native, intégration comptabilité, graphiques BI avancés.

---

## 2. Stack technique

| Couche | Technologie | Version | Note |
|--------|-------------|---------|------|
| Frontend framework | React | 18 | |
| Frontend langage | TypeScript | strict mode | noImplicitAny, strictNullChecks |
| Frontend bundler | Vite | latest | |
| UI components | shadcn/ui + TailwindCSS | latest | |
| État serveur | TanStack Query (React Query) | v5 | cache 5min dashboard |
| Routing | React Router | v6 | |
| Formulaires | react-hook-form + Zod | latest | validation front ET back |
| HTTP client | Axios | latest | |
| Backend runtime | Node.js | 20 LTS | |
| Backend framework | Express | 4 | |
| Backend langage | TypeScript | strict mode | |
| ORM | Prisma | 5.x | schéma = source de vérité |
| Base de données | PostgreSQL | 16 | |
| Auth | JWT HS256 | — | access 1h + refresh 7j httpOnly cookie |
| Hachage mdp | bcrypt | cost factor 12 | |
| Export Excel | ExcelJS | latest | côté serveur |
| Export PDF | jsPDF | latest | **côté navigateur** — zéro charge VPS |
| Logs | Winston + daily-rotate-file | latest | logs JSON structurés |
| Package manager | **pnpm** | latest | workspaces monorepo |
| Conteneurisation | Docker Compose | — | 3 services : nginx, backend, postgres |
| Reverse proxy | Nginx | alpine | SSL termination + SPA serving |
| Process manager | PM2 | latest | dans le container backend |
| CI/CD | GitHub Actions | — | push develop → staging, push main → prod |

> ⚠️ **Puppeteer et Nodemailer sont EXCLUS du scope V1.** PDF = jsPDF navigateur. Alertes = InApp uniquement.

---

## 3. Structure du monorepo

```
/                               ← racine du repo
├── CLAUDE.md                   ← CE fichier (contexte global)
├── docker-compose.yml          ← orchestration multi-conteneurs
├── docker-compose.staging.yml  ← surcharge pour staging
├── .env.example                ← template variables d'environnement
├── .github/
│   └── workflows/
│       ├── ci.yml              ← lint + typecheck sur chaque PR
│       └── deploy.yml          ← deploy staging (develop) + prod (main)
├── frontend/
│   ├── CLAUDE.md               ← contexte spécifique frontend (pointe ici)
│   ├── src/
│   │   ├── components/         ← composants réutilisables (Badge, Modal, Table...)
│   │   ├── pages/              ← une page par module
│   │   ├── hooks/              ← custom hooks React Query (useVehicles, useStock...)
│   │   ├── types/              ← types TypeScript partagés frontend
│   │   ├── lib/                ← utils, axios instance, zod schemas
│   │   └── store/              ← état global auth (zustand ou context)
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── CLAUDE.md               ← contexte spécifique backend (pointe ici)
│   ├── src/
│   │   ├── routes/             ← définition endpoints REST par module
│   │   ├── controllers/        ← logique traitement requêtes HTTP
│   │   ├── services/           ← logique métier (vehicleService, stockService...)
│   │   ├── middleware/         ← auth JWT, RBAC, validation Zod, erreurs, logs
│   │   └── lib/                ← prisma client singleton, winston config
│   ├── prisma/
│   │   ├── schema.prisma       ← schéma DB — source de vérité absolue
│   │   ├── migrations/         ← historique migrations SQL auto-générées
│   │   └── seed.ts             ← données de démo (120 véhicules, 4 clients...)
│   └── package.json
└── docker/
    ├── Dockerfile.frontend
    ├── Dockerfile.backend
    └── nginx.conf
```

---

## 4. Schéma Prisma complet

> Ce schéma est la **source de vérité**. Toujours mettre à jour `schema.prisma` avant d'écrire du code métier.

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  GESTIONNAIRE
  COMMERCIAL
  LECTEUR
}

enum VehicleStatus {
  DISPONIBLE
  LOUE
  MAINTENANCE
  HORS_SERVICE
}

enum Fuel {
  DIESEL
  ESSENCE
  GPL
}

enum RentalStatus {
  EN_COURS
  TERMINEE
  EN_RETARD
  ANNULEE
}

enum MaintenanceType {
  CORRECTIVE
  PREVENTIVE
  ACCIDENTELLE
}

enum MaintenanceStatus {
  EN_ATTENTE
  EN_COURS
  TERMINEE
  EN_RETARD
}

enum GarageStatus {
  DISPONIBLE
  OCCUPE
  INDISPONIBLE
}

enum Specialty {
  MECANIQUE_GENERALE
  ELECTRICITE_AUTO
  CARROSSERIE
  PNEUMATIQUES_FREINS
  MOTEUR_TRANSMISSION
}

enum StockMovementType {
  ENTREE
  SORTIE
  TRANSFERT
}

enum StockLocationType {
  ENTREPOT
  GARAGE
}

enum SparePartCategory {
  LUBRIFIANTS
  FREINAGE
  FILTRATION
  MOTEUR
  TRANSMISSION
  SUSPENSION
  ELECTRICITE
  CARROSSERIE
  AUTRE
}

enum InsuranceStatus {
  ACTIVE
  EXPIRANT_BIENTOT
  EXPIREE
}

// ─── ENTITÉS ──────────────────────────────────────────────────────────────────

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role      @default(LECTEUR)
  isActive     Boolean   @default(true)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  statusChanges      StatusHistory[]
  kmChanges          KmHistory[]
  clientReassignments VehicleClientHistory[]
  stockMovements     StockMovement[]
}

model Client {
  id          String    @id @default(uuid())
  nom         String
  secteur     String
  adresse     String?
  contactNom  String
  contactEmail String
  contactTel  String
  couleur     String    // hex color pour UI ex: "#1D6FA4"
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  vehicles    Vehicle[]
  rentals     Rental[]
  vehicleHistory VehicleClientHistory[]
}

model Vehicle {
  id             String        @id @default(uuid())
  immatriculation String       @unique // format: WW·NNNN·ALG ex: 16·2341·ALG
  vin            String?       @unique
  marque         String        // Fiat | Volkswagen | Renault
  modele         String
  annee          Int
  km             Int
  statut         VehicleStatus @default(DISPONIBLE)
  carburant      Fuel          @default(DIESEL)
  couleur        String?
  notes          String?
  clientId       String
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  // Relations
  client         Client        @relation(fields: [clientId], references: [id])
  rentals        Rental[]
  maintenances   Maintenance[]
  insurances     InsurancePolicy[]
  statusHistory  StatusHistory[]
  kmHistory      KmHistory[]
  clientHistory  VehicleClientHistory[]
}

// Log horodaté de chaque changement de statut d'un véhicule
model StatusHistory {
  id          String   @id @default(uuid())
  vehicleId   String
  fromStatus  String
  toStatus    String
  reason      String   // commentaire obligatoire
  changedById String
  changedAt   DateTime @default(now())

  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id])
  changedBy   User     @relation(fields: [changedById], references: [id])
}

// Historique des mises à jour kilométrage
model KmHistory {
  id          String   @id @default(uuid())
  vehicleId   String
  kmAvant     Int
  kmApres     Int
  changedById String
  changedAt   DateTime @default(now())

  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id])
  changedBy   User     @relation(fields: [changedById], references: [id])
}

// Historique des réaffectations de véhicule entre clients
model VehicleClientHistory {
  id             String   @id @default(uuid())
  vehicleId      String
  fromClientId   String?
  toClientId     String
  reason         String?
  changedById    String
  changedAt      DateTime @default(now())

  vehicle        Vehicle  @relation(fields: [vehicleId], references: [id])
  toClient       Client   @relation(fields: [toClientId], references: [id])
  changedBy      User     @relation(fields: [changedById], references: [id])
}

model Rental {
  id              String       @id @default(uuid())
  vehicleId       String
  clientId        String
  dateDebut       DateTime
  dateFinPrevue   DateTime
  dateFinReelle   DateTime?
  statut          RentalStatus @default(EN_COURS)
  montantMensuel  Float?       // en DA
  devise          String       @default("DA")
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  vehicle         Vehicle      @relation(fields: [vehicleId], references: [id])
  client          Client       @relation(fields: [clientId], references: [id])
}

// Garage prestataire externe (renommé depuis Mechanic — PAS de mécanicien interne)
model Garage {
  id         String       @id @default(uuid())
  nom        String       // nom de la société prestataire
  adresse    String
  ville      String
  telephone  String
  email      String?
  specialite Specialty?
  statut     GarageStatus @default(DISPONIBLE)
  notes      String?
  deletedAt  DateTime?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  // Relations
  maintenances  Maintenance[]
  stockLocations StockLocation[]
}

model Maintenance {
  id               String            @id @default(uuid())
  vehicleId        String
  garageId         String
  type             MaintenanceType
  nature           String            // texte libre
  dateEntree       DateTime
  dateSortiePrevue DateTime
  dateSortieReelle DateTime?
  statut           MaintenanceStatus @default(EN_ATTENTE)
  coutEstime       Float?
  coutReel         Float?
  rapport          String?           // obligatoire à la clôture (étape 4)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  // Relations
  vehicle          Vehicle           @relation(fields: [vehicleId], references: [id])
  garage           Garage            @relation(fields: [garageId], references: [id])
  parts            MaintenancePart[]
  stockMovements   StockMovement[]
}

model SparePart {
  id             String            @id @default(uuid())
  reference      String            @unique
  designation    String
  categorie      SparePartCategory
  unite          String            // ex: Litre, Pièce, Kit, Jeu
  prixUnitaire   Float
  seuilAlerte    Int               // email/alerte quand qte <= seuilAlerte
  seuilCritique  Int               // alerte critique quand qte <= seuilCritique
  notes          String?
  deletedAt      DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  // Relations
  stockEntries   StockEntry[]
  movements      StockMovement[]
  maintenanceParts MaintenancePart[]
}

model StockLocation {
  id       String            @id @default(uuid())
  nom      String            // ex: Entrepôt Central, Garage Belcourt
  type     StockLocationType
  garageId String?           // si type=GARAGE
  adresse  String?

  garage   Garage?           @relation(fields: [garageId], references: [id])
  entries  StockEntry[]
  movementsFrom StockMovement[] @relation("FromLocation")
  movementsTo   StockMovement[] @relation("ToLocation")
}

// Quantité d'une pièce dans un emplacement donné
model StockEntry {
  id          String       @id @default(uuid())
  sparePartId String
  locationId  String
  quantite    Int          @default(0)
  updatedAt   DateTime     @updatedAt

  sparePart   SparePart    @relation(fields: [sparePartId], references: [id])
  location    StockLocation @relation(fields: [locationId], references: [id])

  @@unique([sparePartId, locationId])
}

// Historique tracé de chaque mouvement de stock
model StockMovement {
  id             String            @id @default(uuid())
  sparePartId    String
  fromLocationId String?
  toLocationId   String?
  type           StockMovementType
  quantite       Int
  maintenanceId  String?           // lien optionnel si sortie liée à intervention
  operatorId     String
  notes          String?
  createdAt      DateTime          @default(now())

  sparePart      SparePart         @relation(fields: [sparePartId], references: [id])
  fromLocation   StockLocation?    @relation("FromLocation", fields: [fromLocationId], references: [id])
  toLocation     StockLocation?    @relation("ToLocation", fields: [toLocationId], references: [id])
  maintenance    Maintenance?      @relation(fields: [maintenanceId], references: [id])
  operator       User              @relation(fields: [operatorId], references: [id])
}

// Pièces consommées dans une intervention
model MaintenancePart {
  id                    String      @id @default(uuid())
  maintenanceId         String
  sparePartId           String
  quantite              Int
  prixUnitaireApplique  Float       // snapshot prix au moment de l'intervention

  maintenance           Maintenance @relation(fields: [maintenanceId], references: [id])
  sparePart             SparePart   @relation(fields: [sparePartId], references: [id])
}

model InsurancePolicy {
  id            String          @id @default(uuid())
  vehicleId     String
  compagnie     String
  numeroPolice  String
  typeCouverture String         // ex: Tous risques, Tiers
  dateDebut     DateTime
  dateEcheance  DateTime
  primeMontant  Float           // DA/an
  statut        InsuranceStatus @default(ACTIVE)
  notes         String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  vehicle       Vehicle         @relation(fields: [vehicleId], references: [id])
}

// Historique des alertes InApp — lu/non-lu
model AlertLog {
  id          String    @id @default(uuid())
  type        String    // INSURANCE_EXPIRY_30 | INSURANCE_EXPIRY_7 | INSURANCE_EXPIRED
                        // RENTAL_OVERDUE | MAINTENANCE_OVERDUE | STOCK_LOW | STOCK_CRITICAL
  entityId    String    // ID de l'entité concernée
  entityType  String    // Vehicle | SparePart | Rental | Maintenance | InsurancePolicy
  message     String
  readAt      DateTime? // null = non lu, DateTime = lu
  createdAt   DateTime  @default(now())
}
```

---

## 5. Automate d'états — Règles métier CRITIQUES

> ⚠️ Ces règles sont **non négociables**. Toute transition non listée retourne HTTP 400 avec message explicite. La logique est centralisée dans `vehicleService.ts` UNIQUEMENT.

### 5.1 Statuts véhicule

```
DISPONIBLE → LOUE          (création Rental → side effect: Rental.statut = EN_COURS)
DISPONIBLE → MAINTENANCE   (création Maintenance → side effect: Maintenance.statut = EN_ATTENTE)
DISPONIBLE → HORS_SERVICE  (action manuelle ADMIN uniquement)
LOUE       → DISPONIBLE    (clôture Rental → side effect: Rental.statut = TERMINEE)
LOUE       → MAINTENANCE   (entrée urgente → Rental mise en pause)
LOUE       → HORS_SERVICE  (accident grave / panne irréparable — ADMIN only, motif obligatoire → Rental.statut = ANNULEE)
MAINTENANCE → DISPONIBLE   (clôture Maintenance étape 4 → side effect: Maintenance.statut = TERMINEE)
MAINTENANCE → HORS_SERVICE (décision post-maintenance)
HORS_SERVICE → DISPONIBLE  (réhabilitation ADMIN uniquement)
```

**Règle obligatoire :** Chaque transition crée un enregistrement `StatusHistory` avec `reason` (commentaire obligatoire, 422 si vide).

### 5.2 Workflow intervention (4 étapes strictes)

```
Étape 1 — Création    : Vehicle → MAINTENANCE, Maintenance.statut = EN_ATTENTE
Étape 2 — Pièces      : Ajout MaintenancePart (vérif stock AVANT, pas de déduction encore)
Étape 3 — Démarrage   : Maintenance.statut = EN_COURS, StockMovement SORTIE créé, StockEntry.quantite--
Étape 4 — Clôture     : rapport obligatoire, Maintenance.statut = TERMINEE, Vehicle → DISPONIBLE
                        Garage.statut → DISPONIBLE si aucune autre intervention active
```

**Règle EN_RETARD :** Calculé dynamiquement — si `dateSortiePrevue < now()` ET `statut IN (EN_ATTENTE, EN_COURS)` → afficher EN_RETARD. Ne pas stocker en DB.

### 5.3 Soft delete — Règles universelles

Toutes les entités principales ont un champ `deletedAt DateTime?`.

- **Filtre par défaut** : `WHERE deletedAt IS NULL` sur toutes les requêtes Prisma
- **Accès aux supprimés** : uniquement via `?includeDeleted=true` (ADMIN only)
- **Blocages** :
  - Client : suppression bloquée si véhicule actif ou Rental EN_COURS → HTTP 400
  - Garage : suppression bloquée si Maintenance EN_COURS ou EN_ATTENTE → HTTP 400
  - SparePart : suppression bloquée si StockEntry.quantite > 0 → HTTP 400

### 5.4 Alertes InApp — 7 règles

| Type | Condition | Action |
|------|-----------|--------|
| INSURANCE_EXPIRY_30 | dateEcheance <= today + 30j | Badge orange + panel |
| INSURANCE_EXPIRY_7 | dateEcheance <= today + 7j | Badge rouge + bandeau critique |
| INSURANCE_EXPIRED | dateEcheance < today | Statut → EXPIREE + bandeau critique |
| RENTAL_OVERDUE | dateFinPrevue < now() ET EN_COURS | Badge retard |
| MAINTENANCE_OVERDUE | dateSortiePrevue < today ET EN_COURS/EN_ATTENTE | Badge retard |
| STOCK_LOW | quantite <= seuilAlerte | Badge orange |
| STOCK_CRITICAL | quantite <= seuilCritique | Badge rouge + bandeau critique |

**Anti-doublon :** Avant de créer un AlertLog, vérifier `WHERE type = X AND entityId = Y AND createdAt > now() - 24h`. Si existe → skip.

**Lu/non-lu :** Badge topbar = `COUNT(AlertLog WHERE readAt IS NULL)`. Marquer lu = `UPDATE AlertLog SET readAt = now()`.

---

## 6. API REST — Conventions

```
Base URL : /api/v1
Auth     : Authorization: Bearer <access_token> sur toutes les routes protégées
Format   : JSON exclusivement
Pagination : ?page=1&limit=15&sortBy=createdAt&order=desc
Dates    : ISO 8601
```

### Codes HTTP à respecter
| Code | Usage |
|------|-------|
| 200 | OK — lecture, mise à jour |
| 201 | Created — création réussie |
| 400 | Bad Request — transition invalide, règle métier violée |
| 401 | Unauthorized — token manquant ou expiré |
| 403 | Forbidden — rôle insuffisant |
| 404 | Not Found |
| 422 | Validation Error — champ manquant ou invalide (Zod) |
| 500 | Server Error |

### Endpoints principaux
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /vehicles                    (filtre: statut, clientId, marque, q)
GET    /vehicles/:id
POST   /vehicles
PATCH  /vehicles/:id
PATCH  /vehicles/:id/status         (automate strict, reason obligatoire)
PATCH  /vehicles/:id/km             (crée KmHistory)
DELETE /vehicles/:id                (soft delete, ADMIN only)
GET    /vehicles/:id/history

GET    /clients
GET    /clients/:id
POST   /clients
PATCH  /clients/:id
DELETE /clients/:id

GET    /rentals
GET    /rentals/:id
POST   /rentals                     (Vehicle → LOUE auto)
PATCH  /rentals/:id/close           (Vehicle → DISPONIBLE auto, km retour)

GET    /interventions
GET    /interventions/:id
POST   /interventions               (Vehicle → MAINTENANCE auto)
PATCH  /interventions/:id/parts     (étape 2)
PATCH  /interventions/:id/start     (étape 3 — déduction stock)
PATCH  /interventions/:id/close     (étape 4 — rapport obligatoire)

GET    /garages
GET    /garages/:id
POST   /garages
PATCH  /garages/:id
DELETE /garages/:id

GET    /spare-parts
GET    /spare-parts/:id
POST   /spare-parts
PATCH  /spare-parts/:id
POST   /stock/movement              (ENTREE | SORTIE | TRANSFERT)
GET    /stock/alerts

GET    /insurance-policies
POST   /insurance-policies
PATCH  /insurance-policies/:id

GET    /dashboard/kpis
GET    /dashboard/alerts

GET    /reports/fleet               (?format=excel)
GET    /reports/interventions       (?format=excel&from=&to=)
GET    /reports/stock               (?format=excel)
GET    /reports/insurance           (?format=excel)
GET    /reports/by-client/:id       (?format=excel&from=&to=)
```

---

## 7. Rôles et permissions

| Action | ADMIN | GESTIONNAIRE | COMMERCIAL | LECTEUR |
|--------|-------|--------------|------------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Flotte lecture | ✓ | ✓ | ✓ | ✓ |
| Flotte écriture | ✓ | ✓ | ✗ | ✗ |
| Flotte suppression | ✓ | ✗ | ✗ | ✗ |
| Clients lecture | ✓ | ✓ | ✓ | ✓ |
| Clients écriture | ✓ | ✓ | ✓ | ✗ |
| Locations lecture | ✓ | ✓ | ✓ | ✓ |
| Locations écriture | ✓ | ✓ | ✗ | ✗ |
| Interventions lecture | ✓ | ✓ | ✗ | ✓ |
| Interventions écriture | ✓ | ✓ | ✗ | ✗ |
| Garages lecture | ✓ | ✓ | ✗ | ✓ |
| Garages écriture | ✓ | ✓ | ✗ | ✗ |
| Stock lecture | ✓ | ✓ | ✗ | ✓ |
| Stock mouvements | ✓ | ✓ | ✗ | ✗ |
| Assurances lecture | ✓ | ✓ | ✓ | ✓ |
| Assurances écriture | ✓ | ✗ | ✓ | ✗ |
| Rapports génération | ✓ | ✓ | ✓ | lecture |
| Paramètres | ✓ | ✗ | ✗ | ✗ |
| Utilisateurs | ✓ | ✗ | ✗ | ✗ |

**Implémentation :** Middleware Express `requireRole(...roles)` sur chaque route. Frontend : boutons d'action masqués (`display: none`) si rôle insuffisant — jamais juste grisés.

---

## 8. Variables d'environnement

```bash
# .env.example — copier en .env, ne jamais committer .env

# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/fleetmanager"

# JWT
JWT_SECRET="min-64-chars-generer-avec-openssl-rand-hex-32"
JWT_REFRESH_SECRET="min-64-chars-different-de-JWT_SECRET"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
NODE_ENV="development"       # development | production | test
PORT="3000"
TZ="Africa/Algiers"
FRONTEND_URL="http://localhost:5173"   # CORS origin

# Production uniquement
# FRONTEND_URL="https://fleetmanager.example.dz"
```

> ⚠️ Nodemailer et SMTP sont **exclus du scope V1**. Ne pas ajouter de variables SMTP.

---

## 9. Git flow & Conventions

### Branches
```
main        → production (protégée, merge via PR uniquement)
develop     → staging (protégée, merge via PR uniquement)
feature/xxx → travail en cours (une branche par story/épic)
```

### Convention de commits (Conventional Commits)
```
feat(vehicles): add status transition endpoint
feat(auth): implement JWT refresh token rotation
fix(stock): prevent negative quantity on SORTIE movement
chore(infra): add docker-compose staging configuration
test(vehicles): add unit tests for state machine
docs(api): update vehicle endpoints documentation
refactor(services): extract vehicle state machine to separate file
```

Format : `type(scope): description courte en minuscules`

Types autorisés : `feat` | `fix` | `chore` | `test` | `docs` | `refactor` | `perf`

### Versioning (Semantic Versioning)
```
v1.0.0  → livraison V1 complète (merge develop → main sprint 8)
v1.0.x  → patches / corrections bugs post-livraison
v1.x.0  → nouvelles features V2
```
Tags Git créés automatiquement par GitHub Actions sur chaque merge dans `main`.

### Workflow par session de travail
```bash
git checkout develop
git pull origin develop
git checkout -b feature/e1-s1-monorepo-init
# ... travail ...
git add .
git commit -m "feat(infra): initialize pnpm monorepo with workspaces"
git push origin feature/e1-s1-monorepo-init
# Ouvrir PR vers develop sur GitHub
```

---

## 10. Design system

**Thème :** Industriel / Utilitaire premium — tons neutres, accents bleu marine.

**Typographie :**
- Corps : `IBM Plex Sans`
- Codes/immatriculations/chiffres : `IBM Plex Mono`

**Palette de couleurs :**
```css
--navy:        #0D1B2A   /* sidebar, bannières épics */
--blue:        #1D6FA4   /* actions primaires, liens */
--blue-pale:   #EBF5FB   /* badge LOUE / EN_COURS */
--green:       #0E7C59   /* succès, DISPONIBLE, ACTIVE */
--green-pale:  #E8F6F0
--amber:       #B45309   /* avertissement, MAINTENANCE, EXPIRANT */
--amber-pale:  #FEF3C7
--red:         #C0392B   /* erreur, HORS_SERVICE, EXPIREE, EN_RETARD */
--red-pale:    #FDECEA
--background:  #F4F6F9
--surface:     #FFFFFF
--surface-2:   #F0F2F5
--border:      #E2E6ED
--text:        #1A2332
--text-muted:  #64748B
```

**Badges statuts — composant `<StatusBadge status={...} />`**
```
DISPONIBLE      → vert    (#E8F6F0 / #0E7C59)
LOUE            → bleu    (#EBF5FB / #1D6FA4)
MAINTENANCE     → amber   (#FEF3C7 / #B45309)
HORS_SERVICE    → gris    (#F0F2F5 / #4A5568)
EN_ATTENTE      → gris    (#F0F2F5 / #4A5568)
EN_COURS        → bleu    (#EBF5FB / #1D6FA4)
EN_RETARD       → rouge   (#FDECEA / #C0392B)
TERMINEE        → vert    (#E8F6F0 / #0E7C59)
ACTIVE          → vert    (#E8F6F0 / #0E7C59)
EXPIRANT_BIENTOT → amber  (#FEF3C7 / #B45309)
EXPIREE         → rouge   (#FDECEA / #C0392B)
```

**Règles UX non négociables :**
- Immatriculations : toujours `font-family: 'IBM Plex Mono'` dans un badge `bg: #F0F2F5`
- Tableaux longs : pagination 15 lignes/page — jamais de scroll infini
- Actions destructives : toujours une modal de confirmation avant exécution
- Erreurs de validation : affichées sous chaque champ en rouge, message explicite
- Mode lecture seule : bandeau explicite si le rôle n'a pas les droits d'écriture
- Toasts : succès vert / erreur rouge / info bleu — durée 3 secondes, position bas-centre
- Bandeau alertes critiques : rouge, fixe en haut de page si alertes actives, cliquable

---

## 11. Backlog résumé

| Épic | Titre | Sprint | Stories | Priorité |
|------|-------|--------|---------|----------|
| E1 | Infra + DevOps + Auth | S1 — Sem 1 | 10 | MUST total |
| E2 | Flotte + Locations | S2-S3 — Sem 2-3 | 14 | MUST prioritaire |
| E3 | Clients + Garages | S4 — Sem 4 | 10 | MUST |
| E4 | Interventions & Maintenance | S4-S5 — Sem 4-5 | 10 | MUST complexe |
| E5 | Stock de pièces détachées | S5-S6 — Sem 5-6 | 10 | MUST |
| E6 | Assurances + Alertes InApp | S6 — Sem 6 | 9 | MUST |
| E7 | Dashboard + Rapports | S7-S8 — Sem 7-8 | 10 | MUST |

**Total : 73 User Stories**

### Comptes de démo (seed)
```
admin@fleetmanager.dz        / Admin2026!   → ADMIN
gestionnaire@fleetmanager.dz / Gest2026!   → GESTIONNAIRE
commercial@fleetmanager.dz   / Comm2026!   → COMMERCIAL
lecteur@fleetmanager.dz      / Read2026!   → LECTEUR
```

---

## 12. Definition of Done globale

Chaque story est terminée quand **tous** ces critères sont verts :

- [ ] TypeScript strict — `tsc --noEmit` sans erreur, aucun `any` implicite
- [ ] Validation Zod front ET back sur tout formulaire/endpoint
- [ ] Middleware RBAC : accès non autorisé retourne 403 + message explicite
- [ ] Soft delete : entité invisible dans les listes, accessible via `?includeDeleted=true`
- [ ] Au moins 1 test positif + 1 test négatif par endpoint (Supertest)
- [ ] Aucune erreur console en mode production
- [ ] Feature branch mergée via PR — jamais de push direct sur `develop` ou `main`
- [ ] Pipeline GitHub Actions passe (lint + build) avant merge
- [ ] Toute action destructive protégée par modal de confirmation
- [ ] Temps de réponse API < 500ms pour les lectures en conditions normales

---

## 13. Décisions d'architecture — Ce qui a été tranché et pourquoi

| Décision | Choix retenu | Raison |
|----------|-------------|--------|
| Export PDF | jsPDF (navigateur) | Puppeteer trop lourd sur VPS 4Go RAM |
| Alertes V1 | InApp uniquement | Éviter complexité SMTP en V1 |
| Alertes email | Fonctionnalité premium V2 | Non incluse package V1 |
| Mechanic | Renommé Garage | Modèle métier : uniquement prestataires externes, pas d'employés internes |
| Module Locations | Dédié (M11) | Cœur métier LLD — absorbé dans fiche véhicule était insuffisant |
| Soft delete | Universel | User + Vehicle + Client + Garage + SparePart |
| Kilométrage | km + KmHistory | Traçabilité : qui a mis à jour, quand, avant/après |
| Réaffectation client | VehicleClientHistory | Véhicule peut changer de client — historique obligatoire |
| Package manager | pnpm | Workspaces natifs, performances, cohérence monorepo |
| Stack | Node.js 20 + React 18 | Léger sur VPS 4Go, Claude Code optimisé pour ce stack, cohérence TS full-stack |
| VPS staging | À définir | Agnostique — n'importe quel VPS Linux avec Docker |
| Versioning | Semantic Versioning | Tags v1.0.0 sur merge main via GitHub Actions |
| Backup BDD | Google Drive + AES-256-GCM | Gratuit (15 Go), chiffré, compte client (cf. section 19) |
| Swagger | swagger-jsdoc (Option A) | Intégré Sprint 2, usage interne dev + livrable client futur |
| Staging | Prod uniquement en V1 | Préprod si chantier majeur uniquement |
| Données seed | Cosider/Sonatrach/etc. | Démo uniquement, pas des données client réelles |
| AuditLog | Table dédiée + middleware auto | Traçabilité métier Sprint 2 (cf. section 20) |
| BullMQ + Redis | Écarté | Over-engineering pour 7 jobs/jour — node-cron suffisant V1 |
| Grafana + Loki | Écarté | Overkill pour 3 users — Winston + UptimeRobot suffisants V1 |
| Backblaze B2 | Écarté | Données hors territoire national algérien |
| Backup local client | Écarté | Dépendance infrastructure non maîtrisée |

---

## 14. Seed & Données de démonstration

- Le seed (`prisma/seed.ts`) est **UNIQUEMENT pour dev et staging**
- En production : l'application démarre avec 0 données (0 véhicules, 0 clients, 0 pièces, 0 utilisateurs sauf le compte admin initial)
- La commande `prisma db seed` ne doit **JAMAIS** s'exécuter en `NODE_ENV=production`
- Vérifier que `ci.yml` et `deploy.yml` respectent cette règle
- L'UI doit gérer les **empty states** proprement sur toutes les pages : tableaux vides, dashboard sans données, messages "Aucun élément — Ajouter le premier"

---

## 15. Points ouverts à clarifier avec le client

- Remplacement véhicule en cours de location : nouvelle location ou modification de l'existante ?
- Ristourne financière accident : clause contractuelle existante ?
- Validation des enrichissements BDD non facturés : KmHistory + VehicleClientHistory
- Confirmation personas utilisateurs par rôle (noms et postes réels)

**Hors périmètre V1 (à ne pas implémenter) :**
- Gestion du véhicule de remplacement
- Calcul de ristourne financière

---

## 16. Sprint 2 — Backlog final

| Story | Description |
|-------|-------------|
| E2-S1 | CRUD Véhicules complet (liste, fiche, création, modification) |
| E2-S2 | Automate d'états véhicule — vehicleService.ts centralisé (LOGIQUE ICI UNIQUEMENT) |
| E2-S3 | Transition LOUE→HORS_SERVICE (ADMIN only, Rental→ANNULEE auto) |
| E2-S4 | Historique statuts — StatusHistory + commentaire obligatoire |
| E2-S5 | Module Locations LLD (CRUD Rental, statuts, dates) |
| E2-S6 | Export Excel liste véhicules filtrée |
| E2-S7 | Swagger (swagger-jsdoc Option A — usage dev interne) |
| E2-S8 | Table AuditLog schema Prisma + middleware écriture automatique |
| E2-S9 | Tests unitaires vehicleService Jest |
| E2-S10 | Empty states UI flotte/locations |
| E2-S11 | Widget backup dashboard admin (BackupLog statut + historique) |
| E2-S12 | Seed bloqué NODE_ENV=production |

**Infra pré-Sprint 2 (à faire avant démarrage) :**

| Ticket | Description |
|--------|-------------|
| INFRA-01 | Compte Google Drive dev + Service Account + clé JSON |
| INFRA-02 | Script backup pg_dump → gzip → AES-256-GCM → Google Drive |
| INFRA-03 | Cron hebdomadaire dimanche 02h00 + retry automatique |
| INFRA-04 | Table BackupLog schema Prisma + migration |
| INFRA-05 | Test chiffrement + déchiffrement + restauration complète |
| INFRA-06 | Document livrable client (compte Google + clé + procédure restauration) |

---

## 17. Leçons apprises Sprint 1

- `prisma generate` **DOIT** précéder lint et build dans la CI (sans ça : TS2305 PrismaClient/Role non trouvés)
- Toujours vérifier 0 erreurs lint + typecheck en local avant de committer
- La branche PR doit cibler `develop`, jamais `main` directement

---

## 18. Tests & TNR

### Stratégie générale (mise à jour revue externe Mars 2026)

- **Règle** : les tests unitaires sont écrits **EN MÊME TEMPS** que le service métier, pas après
- **Sprint 2** : tests unitaires vehicleService (automate d'états — Jest) — **OBLIGATOIRE**
- **Sprint 3** : tests unitaires maintenanceService + stockService
- **Sprint 4+** : tests d'intégration API (Supertest) sur les endpoints critiques
- **Sprint 7-8** : tests E2E Playwright (optionnel V1)
- Tout nouveau module livré doit embarquer ses tests
- Les tests font partie de la Definition of Done à partir du Sprint 2

### Stack de tests

| Type | Outil | Cibles |
|------|-------|--------|
| Unitaires services | Jest + ts-jest | vehicleService (transitions), stockService (mouvements), alertService (règles), rentalService (statuts) |
| Intégration API | Supertest + Jest | auth, CRUD véhicules, workflow intervention complet, transitions états véhicule (valides ET invalides) |
| E2E | Playwright | login → action critique → vérification résultat, scénarios métier complets (intervention, clôture, stock) |

### Règles d'écriture du code (applicables dès Sprint 2)

Pour que les tests Sprint 3 soient efficaces, tout le code doit être écrit selon ces principes dès maintenant :

- **Zéro logique métier dans les controllers** (controllers = orchestration uniquement)
- **Toute logique métier dans les services** (vehicleService, rentalService, stockService...)
- Services injectables et mockables (pas de dépendances directes à prisma dans les controllers)
- Chaque fonction de service = une responsabilité unique
- Les transitions d'états centralisées dans `vehicleService.ts` UNIQUEMENT (déjà en place — à maintenir)

### Cibles prioritaires Jest

- **vehicleService** : toutes les transitions autorisées + toutes les transitions interdites (HTTP 400)
- **maintenanceService** : workflow 4 étapes complet
- **stockService** : mouvements ENTREE / SORTIE / TRANSFERT
- **authService** : login, refresh, logout, reset password
- Chaque endpoint API : 1 test positif + 1 test négatif minimum

### Intégration CI/CD (Sprint 3+)

Ajouter un job `test` dans `ci.yml` :

- S'exécute après lint et typecheck
- Nécessite un service PostgreSQL (container `postgres:16`)
- Exécute `prisma migrate deploy` + `prisma db seed` avant les tests
- Commande : `pnpm --filter backend test`
- Le job doit passer pour autoriser le merge de la PR

---

## 19. Backup base de données — Google Drive + AES-256-GCM

### Solution retenue

- **Stockage** : Google Drive via API (Service Account Google)
- **Chiffrement** : AES-256-GCM (module `crypto` natif Node.js) — le backup n'est JAMAIS stocké en clair
- **Fréquence** : hebdomadaire (dimanche 02h00, scheduler node-cron)
- **Retry** : automatique quotidien si échec, jusqu'à 3 tentatives consécutives
- **Env dev** : compte Google Drive dédié dev (Service Account JSON dans .env)
- **Env prod** : compte Google Drive créé pour le client, livré avec la V1
- **Clé de chiffrement** : variable `BACKUP_ENCRYPTION_KEY` dans .env (32 bytes hex, `openssl rand -hex 32`)
- **Restauration** : automatique via l'application (déchiffrement intégré AES-256-GCM)
- **Historisation** : table `BackupLog` dans Prisma
- **Dashboard** : widget admin affichant statut + historique 10 dernières backups + bouton backup manuelle

### Variables d'environnement (à ajouter dans `.env.example`)

```bash
BACKUP_ENCRYPTION_KEY=        # 32 bytes hex — openssl rand -hex 32
GOOGLE_DRIVE_CLIENT_EMAIL=    # email du Service Account Google
GOOGLE_DRIVE_PRIVATE_KEY=     # clé privée du Service Account (JSON)
GOOGLE_DRIVE_FOLDER_ID=       # ID du dossier Google Drive destination
```

### Pourquoi pas les alternatives

| Alternative | Raison du rejet |
|-------------|----------------|
| Backblaze B2 | Données hors territoire national algérien |
| Stockage local client | Dépendance infrastructure client non maîtrisée |
| Google Drive | Gratuit (free tier 15 Go largement suffisant), API fiable, données dans compte appartenant au client |

---

## 20. AuditLog métier — Sprint 2

> Suite à recommandation consultant externe validée.

Table `AuditLog` à ajouter au schema Prisma dès Sprint 2.

**Champs** : `id`, `userId`, `entityType`, `entityId`, `action`, `metadata` (JSON), `timestamp`

**Événements à tracer :**
- Changement de statut véhicule
- Création / modification / suppression véhicule
- Mouvements de stock
- Création / modification maintenance
- Création / modification location

**Implémentation** : middleware Express automatique — les controllers ne doivent **PAS** appeler AuditLog directement.

---

## 21. Décisions écartées — à ne pas remettre en question

| Technologie / Approche | Raison du rejet |
|------------------------|----------------|
| Puppeteer | Trop lourd pour VPS 4 Go — remplacé par jsPDF navigateur |
| Alertes email (Nodemailer) | Fonctionnalité premium V2 — V1 = alertes visuelles in-app uniquement |
| BullMQ + Redis | Over-engineering pour 7 jobs/jour — node-cron suffisant en V1 |
| Grafana + Loki | Overkill pour 3 users — Winston + UptimeRobot suffisants en V1 |
| Backblaze B2 | Données hors territoire national algérien |
| Backup local chez client | Dépendance infrastructure non maîtrisée |
| Staging permanent | À la demande uniquement, financé par le chantier qui le justifie |

---

*Dernière mise à jour : Mars 2026 — Sprint 1 terminé (v0.1.0), revue externe validée, Sprint 2 en préparation.*
*Ce fichier fait autorité sur toute décision technique ou fonctionnelle non documentée ailleurs.*
