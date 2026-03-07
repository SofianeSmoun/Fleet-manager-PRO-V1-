import { PrismaClient, Role, VehicleStatus, Fuel, RentalStatus, MaintenanceType, MaintenanceStatus, GarageStatus, Specialty, SparePartCategory, StockLocationType, StockMovementType, InsuranceStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

async function main(): Promise<void> {
  console.warn('🌱 Seeding FleetManager Pro…');

  // ─── 1. USERS ──────────────────────────────────────────────────────────────
  console.warn('  → Users');

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@fleetmanager.dz' },
      update: {},
      create: {
        email: 'admin@fleetmanager.dz',
        passwordHash: await bcrypt.hash('Admin2026!', BCRYPT_COST),
        firstName: 'Karim',
        lastName: 'Bensalem',
        role: Role.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: 'gestionnaire@fleetmanager.dz' },
      update: {},
      create: {
        email: 'gestionnaire@fleetmanager.dz',
        passwordHash: await bcrypt.hash('Gest2026!', BCRYPT_COST),
        firstName: 'Amira',
        lastName: 'Hadj',
        role: Role.GESTIONNAIRE,
      },
    }),
    prisma.user.upsert({
      where: { email: 'commercial@fleetmanager.dz' },
      update: {},
      create: {
        email: 'commercial@fleetmanager.dz',
        passwordHash: await bcrypt.hash('Comm2026!', BCRYPT_COST),
        firstName: 'Youcef',
        lastName: 'Meraghni',
        role: Role.COMMERCIAL,
      },
    }),
    prisma.user.upsert({
      where: { email: 'lecteur@fleetmanager.dz' },
      update: {},
      create: {
        email: 'lecteur@fleetmanager.dz',
        passwordHash: await bcrypt.hash('Read2026!', BCRYPT_COST),
        firstName: 'Nadia',
        lastName: 'Boudiaf',
        role: Role.LECTEUR,
      },
    }),
  ]);

  const [admin] = users;

  // ─── 2. CLIENTS ────────────────────────────────────────────────────────────
  console.warn('  → Clients');

  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'client-cosider-001' },
      update: {},
      create: {
        id: 'client-cosider-001',
        nom: 'Cosider',
        secteur: 'BTP / Travaux Publics',
        adresse: 'Route Nationale N°1, Dar El Beïda, Alger',
        contactNom: 'Mourad Kellou',
        contactEmail: 'mkellou@cosider.dz',
        contactTel: '+213 21 50 00 10',
        couleur: '#E74C3C',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-sonatrach-001' },
      update: {},
      create: {
        id: 'client-sonatrach-001',
        nom: 'Sonatrach',
        secteur: 'Pétrole & Gaz',
        adresse: 'Djenane El Malik, Hydra, Alger',
        contactNom: 'Fatima Zitoun',
        contactEmail: 'fzitoun@sonatrach.dz',
        contactTel: '+213 21 54 60 00',
        couleur: '#27AE60',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-sonelgaz-001' },
      update: {},
      create: {
        id: 'client-sonelgaz-001',
        nom: 'Sonelgaz',
        secteur: 'Énergie / Électricité & Gaz',
        adresse: '2 Boulevard Krim Belkacem, Alger Centre',
        contactNom: 'Rachid Benarfa',
        contactEmail: 'rbenarfa@sonelgaz.dz',
        contactTel: '+213 21 73 40 00',
        couleur: '#F39C12',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-agrodiv-001' },
      update: {},
      create: {
        id: 'client-agrodiv-001',
        nom: 'Agrodiv',
        secteur: 'Agriculture / Agroalimentaire',
        adresse: '5 Rue Hassiba Ben Bouali, Alger',
        contactNom: 'Samira Tebbal',
        contactEmail: 'stebbal@agrodiv.dz',
        contactTel: '+213 21 66 20 00',
        couleur: '#8E44AD',
      },
    }),
  ]);

  const [cosider, sonatrach, sonelgaz, agrodiv] = clients;

  // ─── 3. GARAGES ────────────────────────────────────────────────────────────
  console.warn('  → Garages');

  const garages = await Promise.all([
    prisma.garage.upsert({
      where: { id: 'garage-belcourt-001' },
      update: {},
      create: {
        id: 'garage-belcourt-001',
        nom: 'Auto Service Belcourt',
        adresse: '12 Rue Belouizdad',
        ville: 'Alger',
        telephone: '+213 21 67 45 20',
        email: 'contact@autoservice-belcourt.dz',
        specialite: Specialty.MECANIQUE_GENERALE,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
    prisma.garage.upsert({
      where: { id: 'garage-hussein-001' },
      update: {},
      create: {
        id: 'garage-hussein-001',
        nom: 'Garage Hussein Dey Élite',
        adresse: '45 Avenue de l\'ALN',
        ville: 'Hussein Dey',
        telephone: '+213 21 77 33 11',
        email: 'elite@garage-hussein.dz',
        specialite: Specialty.MOTEUR_TRANSMISSION,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
    prisma.garage.upsert({
      where: { id: 'garage-kouba-001' },
      update: {},
      create: {
        id: 'garage-kouba-001',
        nom: 'Tech Auto Kouba',
        adresse: '8 Cité des Pins',
        ville: 'Kouba',
        telephone: '+213 21 68 90 55',
        specialite: Specialty.ELECTRICITE_AUTO,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
    prisma.garage.upsert({
      where: { id: 'garage-bab-ezzouar-001' },
      update: {},
      create: {
        id: 'garage-bab-ezzouar-001',
        nom: 'Centre Auto Bab Ezzouar',
        adresse: 'Zone Industrielle Bab Ezzouar',
        ville: 'Bab Ezzouar',
        telephone: '+213 21 56 78 90',
        email: 'info@centreauto-babezzouar.dz',
        specialite: Specialty.CARROSSERIE,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
    prisma.garage.upsert({
      where: { id: 'garage-dar-beida-001' },
      update: {},
      create: {
        id: 'garage-dar-beida-001',
        nom: 'Pneumo Stop Dar El Beïda',
        adresse: '22 Route de l\'Aéroport',
        ville: 'Dar El Beïda',
        telephone: '+213 21 50 12 34',
        specialite: Specialty.PNEUMATIQUES_FREINS,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
    prisma.garage.upsert({
      where: { id: 'garage-bir-mourad-001' },
      update: {},
      create: {
        id: 'garage-bir-mourad-001',
        nom: 'Multiservice Bir Mourad Raïs',
        adresse: '3 Rue Hassiba Ben Bouali',
        ville: 'Bir Mourad Raïs',
        telephone: '+213 21 44 56 78',
        email: 'multiservice.bmr@gmail.com',
        specialite: Specialty.MECANIQUE_GENERALE,
        statut: GarageStatus.DISPONIBLE,
      },
    }),
  ]);

  const [garageBelcourt, garageHussein] = garages;

  // ─── 4. STOCK LOCATIONS ────────────────────────────────────────────────────
  console.warn('  → Stock locations');

  const stockLocations = await Promise.all([
    prisma.stockLocation.upsert({
      where: { id: 'loc-entrepot-central' },
      update: {},
      create: {
        id: 'loc-entrepot-central',
        nom: 'Entrepôt Central',
        type: StockLocationType.ENTREPOT,
        adresse: 'Zone Industrielle Rouiba, Alger',
      },
    }),
    prisma.stockLocation.upsert({
      where: { id: 'loc-garage-belcourt' },
      update: {},
      create: {
        id: 'loc-garage-belcourt',
        nom: 'Stock Garage Belcourt',
        type: StockLocationType.GARAGE,
        garageId: garageBelcourt.id,
        adresse: '12 Rue Belouizdad, Alger',
      },
    }),
    prisma.stockLocation.upsert({
      where: { id: 'loc-garage-hussein' },
      update: {},
      create: {
        id: 'loc-garage-hussein',
        nom: 'Stock Garage Hussein Dey',
        type: StockLocationType.GARAGE,
        garageId: garageHussein.id,
        adresse: '45 Avenue de l\'ALN, Hussein Dey',
      },
    }),
  ]);

  const [locEntrepot] = stockLocations;

  // ─── 5. SPARE PARTS ────────────────────────────────────────────────────────
  console.warn('  → Spare parts');

  const spareParts = await Promise.all([
    prisma.sparePart.upsert({
      where: { reference: 'LUB-5W30-001' },
      update: {},
      create: {
        reference: 'LUB-5W30-001',
        designation: 'Huile moteur 5W-30 synthétique',
        categorie: SparePartCategory.LUBRIFIANTS,
        unite: 'Litre',
        prixUnitaire: 850,
        seuilAlerte: 20,
        seuilCritique: 10,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'FIL-HUI-001' },
      update: {},
      create: {
        reference: 'FIL-HUI-001',
        designation: 'Filtre à huile universel',
        categorie: SparePartCategory.FILTRATION,
        unite: 'Pièce',
        prixUnitaire: 650,
        seuilAlerte: 15,
        seuilCritique: 5,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'FIL-AIR-001' },
      update: {},
      create: {
        reference: 'FIL-AIR-001',
        designation: 'Filtre à air',
        categorie: SparePartCategory.FILTRATION,
        unite: 'Pièce',
        prixUnitaire: 1200,
        seuilAlerte: 10,
        seuilCritique: 3,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'FRE-PAV-001' },
      update: {},
      create: {
        reference: 'FRE-PAV-001',
        designation: 'Plaquettes de frein avant (jeu)',
        categorie: SparePartCategory.FREINAGE,
        unite: 'Jeu',
        prixUnitaire: 3500,
        seuilAlerte: 8,
        seuilCritique: 3,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'FRE-PAR-001' },
      update: {},
      create: {
        reference: 'FRE-PAR-001',
        designation: 'Plaquettes de frein arrière (jeu)',
        categorie: SparePartCategory.FREINAGE,
        unite: 'Jeu',
        prixUnitaire: 2800,
        seuilAlerte: 8,
        seuilCritique: 3,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'BAT-12V-001' },
      update: {},
      create: {
        reference: 'BAT-12V-001',
        designation: 'Batterie 12V 74Ah',
        categorie: SparePartCategory.ELECTRICITE,
        unite: 'Pièce',
        prixUnitaire: 12000,
        seuilAlerte: 5,
        seuilCritique: 2,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'PNE-195-65R15' },
      update: {},
      create: {
        reference: 'PNE-195-65R15',
        designation: 'Pneu 195/65 R15',
        categorie: SparePartCategory.SUSPENSION,
        unite: 'Pièce',
        prixUnitaire: 8500,
        seuilAlerte: 8,
        seuilCritique: 4,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'BOU-GIE-001' },
      update: {},
      create: {
        reference: 'BOU-GIE-001',
        designation: 'Bougie d\'allumage (set 4)',
        categorie: SparePartCategory.MOTEUR,
        unite: 'Kit',
        prixUnitaire: 2400,
        seuilAlerte: 10,
        seuilCritique: 4,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'COU-DIS-001' },
      update: {},
      create: {
        reference: 'COU-DIS-001',
        designation: 'Courroie de distribution',
        categorie: SparePartCategory.MOTEUR,
        unite: 'Pièce',
        prixUnitaire: 4500,
        seuilAlerte: 6,
        seuilCritique: 2,
      },
    }),
    prisma.sparePart.upsert({
      where: { reference: 'LIQ-REF-001' },
      update: {},
      create: {
        reference: 'LIQ-REF-001',
        designation: 'Liquide de refroidissement (5L)',
        categorie: SparePartCategory.MOTEUR,
        unite: 'Litre',
        prixUnitaire: 400,
        seuilAlerte: 15,
        seuilCritique: 5,
      },
    }),
  ]);

  // Stock initial dans l'entrepôt central
  await Promise.all(
    spareParts.map((part) =>
      prisma.stockEntry.upsert({
        where: { sparePartId_locationId: { sparePartId: part.id, locationId: locEntrepot.id } },
        update: {},
        create: {
          sparePartId: part.id,
          locationId: locEntrepot.id,
          quantite: 30,
        },
      }),
    ),
  );

  // ─── 6. VEHICLES (120) ─────────────────────────────────────────────────────
  console.warn('  → Vehicles (120)');

  // Distribution: Cosider 40, Sonatrach 35, Sonelgaz 30, Agrodiv 15
  const vehicleDistribution = [
    { client: cosider, count: 40, prefix: 'CS' },
    { client: sonatrach, count: 35, prefix: 'SN' },
    { client: sonelgaz, count: 30, prefix: 'SG' },
    { client: agrodiv, count: 15, prefix: 'AG' },
  ];

  const marques = [
    { marque: 'Fiat', modeles: ['Ducato', 'Fiorino', 'Doblo'] },
    { marque: 'Volkswagen', modeles: ['Transporter', 'Crafter', 'Caddy'] },
    { marque: 'Renault', modeles: ['Trafic', 'Master', 'Kangoo'] },
  ];

  const carburants = [Fuel.DIESEL, Fuel.DIESEL, Fuel.DIESEL, Fuel.ESSENCE]; // 75% diesel
  const statuses = [
    VehicleStatus.DISPONIBLE,
    VehicleStatus.DISPONIBLE,
    VehicleStatus.DISPONIBLE,
    VehicleStatus.DISPONIBLE,
    VehicleStatus.LOUE,
    VehicleStatus.LOUE,
    VehicleStatus.MAINTENANCE,
  ];

  const vehicleIds: string[] = [];
  let vehicleCounter = 1;

  for (const { client, count, prefix } of vehicleDistribution) {
    for (let i = 0; i < count; i++) {
      const wilayas = [16, 9, 25, 31, 35, 6, 19, 23];
      const wilaya = wilayas[vehicleCounter % wilayas.length] ?? 16;
      const immat = `${String(wilaya)}·${String(1000 + vehicleCounter).padStart(4, '0')}·ALG`;
      const marqueData = marques[vehicleCounter % marques.length]!;
      const modeles = marqueData.modeles;
      const modele = modeles[vehicleCounter % modeles.length]!;
      const annee = 2018 + (vehicleCounter % 7);
      const km = 15000 + vehicleCounter * 1200 + (vehicleCounter % 50) * 300;
      const statut = statuses[vehicleCounter % statuses.length] ?? VehicleStatus.DISPONIBLE;
      const carburant = carburants[vehicleCounter % carburants.length] ?? Fuel.DIESEL;

      const vehicleId = `vehicle-${prefix}-${String(vehicleCounter).padStart(3, '0')}`;
      vehicleIds.push(vehicleId);

      await prisma.vehicle.upsert({
        where: { id: vehicleId },
        update: {},
        create: {
          id: vehicleId,
          immatriculation: immat,
          marque: marqueData.marque,
          modele,
          annee,
          km,
          statut,
          carburant,
          clientId: client.id,
        },
      });

      vehicleCounter++;
    }
  }

  // ─── 7. RENTALS (quelques locations actives sur véhicules LOUE) ─────────────
  console.warn('  → Rentals');

  // Les véhicules avec statut LOUE sont ceux aux index 4, 11, 18, ... (statuses[4]=LOUE)
  const louedVehicleIds = vehicleIds.filter((_, idx) => statuses[(idx + 1) % statuses.length] === VehicleStatus.LOUE);

  for (let i = 0; i < Math.min(louedVehicleIds.length, 10); i++) {
    const vid = louedVehicleIds[i]!;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } });
    if (!vehicle) continue;

    const rentalId = `rental-${String(i + 1).padStart(3, '0')}`;
    const isOverdue = i === 2; // 1 location EN_RETARD intentionnel

    await prisma.rental.upsert({
      where: { id: rentalId },
      update: {},
      create: {
        id: rentalId,
        vehicleId: vid,
        clientId: vehicle.clientId,
        dateDebut: daysAgo(90 + i * 15),
        dateFinPrevue: isOverdue ? daysAgo(10) : daysFromNow(90 - i * 5),
        statut: isOverdue ? RentalStatus.EN_RETARD : RentalStatus.EN_COURS,
        montantMensuel: 85000 + i * 5000,
        devise: 'DA',
        notes: isOverdue ? 'Renouvellement en attente de signature client' : null,
      },
    });
  }

  // ─── 8. MAINTENANCES (6 interventions avec statuts variés) ─────────────────
  console.warn('  → Maintenances');

  const maintenanceVehicleIds = vehicleIds.filter((_, idx) =>
    statuses[(idx + 1) % statuses.length] === VehicleStatus.MAINTENANCE,
  );

  const maintenanceScenarios = [
    {
      id: 'maint-001',
      type: MaintenanceType.PREVENTIVE,
      nature: 'Vidange + remplacement filtres (révision 30 000 km)',
      statut: MaintenanceStatus.TERMINEE,
      dateDelta: -30,
      durée: 2,
      rapport: 'Révision effectuée. Vidange moteur 5W-30, filtre huile et filtre air remplacés. Véhicule en bon état général.',
    },
    {
      id: 'maint-002',
      type: MaintenanceType.CORRECTIVE,
      nature: 'Remplacement plaquettes de frein avant',
      statut: MaintenanceStatus.EN_COURS,
      dateDelta: -5,
      durée: 3,
      rapport: null,
    },
    {
      id: 'maint-003',
      type: MaintenanceType.CORRECTIVE,
      nature: 'Panne électrique — diagnostic alternateur',
      statut: MaintenanceStatus.EN_ATTENTE,
      dateDelta: -2,
      durée: 5,
      rapport: null,
    },
    {
      id: 'maint-004',
      type: MaintenanceType.PREVENTIVE,
      nature: 'Remplacement courroie de distribution (90 000 km)',
      statut: MaintenanceStatus.EN_COURS,
      dateDelta: -15,
      durée: 4,
      rapport: null,
    },
    {
      id: 'maint-005',
      type: MaintenanceType.ACCIDENTELLE,
      nature: 'Réparation carrosserie — choc pare-chocs arrière',
      statut: MaintenanceStatus.EN_ATTENTE,
      dateDelta: -3,
      durée: 7,
      rapport: null,
    },
    {
      id: 'maint-006',
      type: MaintenanceType.PREVENTIVE,
      nature: 'Remplacement pneumatiques (4 pneus)',
      // EN_RETARD intentionnel : dateSortiePrevue dépassée, statut EN_COURS
      statut: MaintenanceStatus.EN_COURS,
      dateDelta: -20,
      durée: 3, // durée dépassée → EN_RETARD dynamique
      rapport: null,
    },
  ];

  for (let i = 0; i < maintenanceScenarios.length; i++) {
    const scenario = maintenanceScenarios[i]!;
    const vid = maintenanceVehicleIds[i % maintenanceVehicleIds.length] ?? vehicleIds[i * 7]!;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } });
    if (!vehicle) continue;

    const garage = garages[i % garages.length]!;
    const dateEntree = daysAgo(-scenario.dateDelta);
    const dateSortiePrevue = new Date(dateEntree);
    dateSortiePrevue.setDate(dateSortiePrevue.getDate() + scenario.durée);

    // maint-006 : dateSortiePrevue dans le passé → EN_RETARD dynamique
    const dateSortiePrevueFinal =
      scenario.id === 'maint-006' ? daysAgo(5) : dateSortiePrevue;

    await prisma.maintenance.upsert({
      where: { id: scenario.id },
      update: {},
      create: {
        id: scenario.id,
        vehicleId: vid,
        garageId: garage.id,
        type: scenario.type,
        nature: scenario.nature,
        dateEntree,
        dateSortiePrevue: dateSortiePrevueFinal,
        dateSortieReelle: scenario.statut === MaintenanceStatus.TERMINEE ? daysAgo(25) : null,
        statut: scenario.statut,
        coutEstime: 15000 + i * 5000,
        coutReel: scenario.statut === MaintenanceStatus.TERMINEE ? 13500 : null,
        rapport: scenario.rapport ?? null,
      },
    });
  }

  // ─── 9. INSURANCE POLICIES (120 polices) ───────────────────────────────────
  console.warn('  → Insurance policies (120)');

  const compagnies = [
    'CAAT', 'SAA', 'CASH Assurances', 'Alliance Assurances',
    'TRUST Algérie', 'AXA Algérie', 'GAM Assurances',
  ];
  const typesCouverture = ['Tous risques', 'Tiers', 'Tiers + Vol + Incendie'];

  for (let i = 0; i < vehicleIds.length; i++) {
    const vid = vehicleIds[i]!;
    const policeId = `insurance-${String(i + 1).padStart(3, '0')}`;

    // Scénarios spéciaux pour les alertes :
    // Polices 1-2 : expirées
    // Polices 3-5 : expirent dans 20j (< 30j)
    // Polices 6-8 : expirent dans 5j (< 7j)
    // Reste : actives
    let dateEcheance: Date;
    let statut: InsuranceStatus;

    if (i < 2) {
      dateEcheance = daysAgo(15);
      statut = InsuranceStatus.EXPIREE;
    } else if (i < 5) {
      dateEcheance = daysFromNow(20);
      statut = InsuranceStatus.EXPIRANT_BIENTOT;
    } else if (i < 8) {
      dateEcheance = daysFromNow(5);
      statut = InsuranceStatus.EXPIRANT_BIENTOT;
    } else {
      dateEcheance = daysFromNow(180 + (i % 180));
      statut = InsuranceStatus.ACTIVE;
    }

    const dateDebut = new Date(dateEcheance);
    dateDebut.setFullYear(dateDebut.getFullYear() - 1);

    await prisma.insurancePolicy.upsert({
      where: { id: policeId },
      update: {},
      create: {
        id: policeId,
        vehicleId: vid,
        compagnie: compagnies[i % compagnies.length]!,
        numeroPolice: `POL-${String(2025 + (i % 2))}-${String(10000 + i)}`,
        typeCouverture: typesCouverture[i % typesCouverture.length]!,
        dateDebut,
        dateEcheance,
        primeMontant: 45000 + (i % 20) * 3000,
        statut,
        notes: i < 2 ? 'URGENT : renouvellement requis immédiatement' : null,
      },
    });
  }

  console.warn('\n✅ Seed terminé avec succès !');
  console.warn('─────────────────────────────────────────');
  console.warn('Comptes de démonstration :');
  console.warn('  admin@fleetmanager.dz        / Admin2026!  (ADMIN)');
  console.warn('  gestionnaire@fleetmanager.dz / Gest2026!  (GESTIONNAIRE)');
  console.warn('  commercial@fleetmanager.dz   / Comm2026!  (COMMERCIAL)');
  console.warn('  lecteur@fleetmanager.dz      / Read2026!  (LECTEUR)');
  console.warn('─────────────────────────────────────────');
  console.warn(`  ${String(vehicleCounter - 1)} véhicules · 4 clients · 6 garages · 10 pièces · 120 polices d'assurance`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
