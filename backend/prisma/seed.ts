/**
 * LoomStay — Prisma Seed Script
 * ─────────────────────────────────────────────────────────────────────
 *
 * MODES
 * ─────
 *   Default (safe/idempotent):
 *     npx ts-node prisma/seed.ts
 *     npm run seed
 *     npx prisma db seed
 *
 *     → Uses upsert everywhere. Never deletes real data.
 *     → Safe to run multiple times. Only adds what is missing.
 *
 *   Reset (full demo wipe + recreate):
 *     SEED_RESET=true npx ts-node prisma/seed.ts
 *     SEED_RESET=true npm run seed
 *
 *     → Deletes ALL rows from ALL tables (cascade order).
 *     → Re-creates a clean demo database from scratch.
 *     → Use only in development / demo environments.
 */

import {
  PrismaClient,
  UserRole,
  Department,
  RoomStatus,
  ReservationStatus,
  ComplaintCategory,
  ComplaintStatus,
  WorkerShift,
  DailyCleaningStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// ─── Demo credentials ─────────────────────────────────────────────────
const DEMO_PASSWORD = "LoomStay2024!";

const DEMO_ACCOUNTS = [
  { name: "Admin Hôtel",           email: "admin@loomstay.test",              role: UserRole.ADMIN,                department: null },
  { name: "Sophie Martin",         email: "reception@loomstay.test",           role: UserRole.RECEPTIONIST,         department: Department.RECEPTION },
  { name: "Karim Bouaziz",         email: "maintenance.manager@loomstay.test", role: UserRole.MAINTENANCE_MANAGER,  department: Department.MAINTENANCE },
  { name: "Nadia Toumi",           email: "housekeeping.manager@loomstay.test",role: UserRole.HOUSEKEEPING_MANAGER, department: Department.HOUSEKEEPING },
  { name: "Mehdi Sassi",           email: "maint.worker1@loomstay.test",       role: UserRole.EMPLOYEE,             department: Department.MAINTENANCE },
  { name: "Amine Gharbi",          email: "maint.worker2@loomstay.test",       role: UserRole.EMPLOYEE,             department: Department.MAINTENANCE },
  { name: "Yassine Khalil",        email: "maint.worker3@loomstay.test",       role: UserRole.EMPLOYEE,             department: Department.MAINTENANCE },
  { name: "Fatima Zahra",          email: "hk.worker1@loomstay.test",          role: UserRole.EMPLOYEE,             department: Department.HOUSEKEEPING },
  { name: "Amira Bensalem",        email: "hk.worker2@loomstay.test",          role: UserRole.EMPLOYEE,             department: Department.HOUSEKEEPING },
  { name: "Rim Chaari",            email: "hk.worker3@loomstay.test",          role: UserRole.EMPLOYEE,             department: Department.HOUSEKEEPING },
];

// ─── Room data ────────────────────────────────────────────────────────
const ROOMS_DATA = [
  { roomNumber: "101", floor: 1, type: "Simple",              status: RoomStatus.OCCUPIED },
  { roomNumber: "102", floor: 1, type: "Simple",              status: RoomStatus.AVAILABLE },
  { roomNumber: "103", floor: 1, type: "Double",              status: RoomStatus.CLEANING },
  { roomNumber: "104", floor: 1, type: "Double",              status: RoomStatus.AVAILABLE },
  { roomNumber: "201", floor: 2, type: "Double",              status: RoomStatus.OCCUPIED },
  { roomNumber: "202", floor: 2, type: "Double",              status: RoomStatus.AVAILABLE },
  { roomNumber: "203", floor: 2, type: "Suite Junior",        status: RoomStatus.OCCUPIED },
  { roomNumber: "204", floor: 2, type: "Suite Junior",        status: RoomStatus.MAINTENANCE },
  { roomNumber: "301", floor: 3, type: "Suite Deluxe",        status: RoomStatus.OCCUPIED },
  { roomNumber: "302", floor: 3, type: "Suite Deluxe",        status: RoomStatus.AVAILABLE },
  { roomNumber: "303", floor: 3, type: "Double",              status: RoomStatus.AVAILABLE },
  { roomNumber: "401", floor: 4, type: "Suite Présidentielle",status: RoomStatus.AVAILABLE },
];

// ─── Business day helper ──────────────────────────────────────────────
function todayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const IS_RESET = process.env.SEED_RESET === "true";

  console.log("╔═══════════════════════════════════════════╗");
  console.log("║        LoomStay — Seed Database           ║");
  console.log(`║  Mode : ${IS_RESET ? "RESET (wipe + recreate) ⚠️ " : "SAFE  (idempotent)         "}║`);
  console.log("╚═══════════════════════════════════════════╝\n");

  // ─── RESET: delete everything in cascade-safe order ───────────────
  if (IS_RESET) {
    console.log("⚠️  RESET MODE — Suppression de toutes les données...\n");
    await prisma.auditLog.deleteMany();
    await prisma.dailyCleaningTask.deleteMany();
    await prisma.workerShiftSchedule.deleteMany();
    await prisma.housekeepingTask.deleteMany();
    await prisma.interventionLog.deleteMany();
    await prisma.internalMessage.deleteMany();
    await prisma.guestStaffMessage.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.guestForm.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.hotelEvent.deleteMany();
    await prisma.hotelInfo.deleteMany();
    await prisma.currencyRate.deleteMany();
    await prisma.employeeProfile.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();
    console.log("   ✓ Base de données vidée.\n");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // ─── 1. USERS + EMPLOYEE PROFILES ─────────────────────────────────
  console.log("[1/7] Utilisateurs & profils employés...");

  const users: Record<string, any> = {};

  for (const acc of DEMO_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { name: acc.name, role: acc.role },
      create: {
        name: acc.name,
        email: acc.email,
        passwordHash,
        role: acc.role,
        isActive: true,
      },
    });
    users[acc.email] = user;
    console.log(`  → ${user.name} (${user.role})`);
  }

  const adminUser = users["admin@loomstay.test"];

  // Employee profiles
  for (const acc of DEMO_ACCOUNTS) {
    if (!acc.department) continue;
    const user = users[acc.email];
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: { department: acc.department, isAvailable: true },
      create: {
        userId: user.id,
        department: acc.department,
        isAvailable: true,
        createdById: adminUser.id,
      },
    });
  }
  console.log("  ✓ Profils créés.\n");

  // ─── 2. ROOMS ──────────────────────────────────────────────────────
  console.log("[2/7] Chambres...");
  const rooms: Record<string, any> = {};

  for (const r of ROOMS_DATA) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: { status: IS_RESET ? r.status : undefined }, // Only reset status on RESET mode
      create: { roomNumber: r.roomNumber, floor: r.floor, type: r.type, status: r.status },
    });
    rooms[r.roomNumber] = room;
    console.log(`  → Ch. ${room.roomNumber} (${room.type}, Étage ${room.floor}) [${room.status}]`);
  }
  console.log();

  // ─── 3. RESERVATIONS ───────────────────────────────────────────────
  console.log("[3/7] Réservations...");
  const today = new Date();

  const reservationsData = [
    {
      reservationNumber: "RES-001",
      guestFirstName: "Jean",        guestLastName: "Dupont",
      guestEmail: "jean.dupont@email.com", guestPhone: "+33612345678", nationality: "FR",
      checkInDate: today,              checkOutDate: addDays(today, 3),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "101",              adultsCount: 2, childrenCount: 1, totalGuests: 3,
    },
    {
      reservationNumber: "RES-002",
      guestFirstName: "Sarah",       guestLastName: "Johnson",
      guestEmail: "sarah.j@email.com", guestPhone: "+14155551234", nationality: "US",
      checkInDate: today,              checkOutDate: addDays(today, 5),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "203",              adultsCount: 1, childrenCount: 0, totalGuests: 1,
    },
    {
      reservationNumber: "RES-003",
      guestFirstName: "Yuki",        guestLastName: "Tanaka",
      guestEmail: "yuki.t@email.com", guestPhone: "+819012345678", nationality: "JP",
      checkInDate: today,              checkOutDate: addDays(today, 7),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "301",              adultsCount: 2, childrenCount: 0, totalGuests: 2,
    },
    {
      reservationNumber: "RES-004",
      guestFirstName: "Ahmed",       guestLastName: "Ben Ali",
      guestEmail: "ahmed.ba@email.com", guestPhone: "+21698765432", nationality: "TN",
      checkInDate: addDays(today, 1),  checkOutDate: addDays(today, 4),
      status: ReservationStatus.PENDING,
      roomNumber: "201",              adultsCount: 2, childrenCount: 0, totalGuests: 2,
    },
    {
      reservationNumber: "RES-005",
      guestFirstName: "Maria",       guestLastName: "Garcia",
      guestEmail: "maria.g@email.com", guestPhone: "+34612345678", nationality: "ES",
      checkInDate: addDays(today, 2),  checkOutDate: addDays(today, 6),
      status: ReservationStatus.PENDING,
      roomNumber: "302",              adultsCount: 2, childrenCount: 2, totalGuests: 4,
    },
    {
      reservationNumber: "RES-006",
      guestFirstName: "Marco",       guestLastName: "Rossi",
      guestEmail: "marco.r@email.com", guestPhone: "+39312345678", nationality: "IT",
      checkInDate: addDays(today, -3), checkOutDate: addDays(today, -1),
      status: ReservationStatus.CHECKED_OUT,
      roomNumber: "102",              adultsCount: 1, childrenCount: 0, totalGuests: 1,
    },
    {
      reservationNumber: "RES-007",
      guestFirstName: "Amina",       guestLastName: "El Fassi",
      guestEmail: "amina.ef@email.com", guestPhone: "+21222334455", nationality: "MA",
      checkInDate: addDays(today, -1), checkOutDate: addDays(today, 2),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "104",              adultsCount: 1, childrenCount: 0, totalGuests: 1,
    },
  ];

  const reservations: Record<string, any> = {};

  for (const r of reservationsData) {
    const room = rooms[r.roomNumber];
    if (!room) { console.log(`  ⚠️  Chambre ${r.roomNumber} introuvable, skipping ${r.reservationNumber}`); continue; }
    const res = await prisma.reservation.upsert({
      where: { reservationNumber: r.reservationNumber },
      update: {},
      create: {
        reservationNumber: r.reservationNumber,
        guestFirstName: r.guestFirstName, guestLastName: r.guestLastName,
        guestEmail: r.guestEmail,         guestPhone: r.guestPhone,
        nationality: r.nationality,
        checkInDate: r.checkInDate,       checkOutDate: r.checkOutDate,
        status: r.status,                 roomId: room.id,
        adultsCount: r.adultsCount,       childrenCount: r.childrenCount,
        totalGuests: r.totalGuests,
      },
    });
    reservations[r.reservationNumber] = res;
    console.log(`  → ${r.reservationNumber} — ${r.guestFirstName} ${r.guestLastName} (${r.status})`);
  }
  console.log();

  // ─── 4. HOTEL INFO + CURRENCY ──────────────────────────────────────
  console.log("[4/7] Infos hôtel & devises...");

  // Hotel info: safe upsert by title (deleteMany only in RESET mode)
  if (IS_RESET) await prisma.hotelInfo.deleteMany();

  const hotelInfos = [
    { title: "Piscine",               content: "La piscine extérieure est ouverte de 08h00 à 22h00 tous les jours. Accès inclus.",                                       type: "service" },
    { title: "Wi-Fi",                 content: "Wi-Fi gratuit partout dans l'hôtel.\n• Réseau : LoomStay_Guest\n• Mot de passe : bienvenue2024",                          type: "service" },
    { title: "Petit-déjeuner",        content: "Buffet servi de 06h30 à 10h30 au Restaurant Principal (Rez-de-chaussée, Salle Jasmin).",                                  type: "restaurant" },
    { title: "Room Service",          content: "Disponible 24h/24 — 7j/7.\nComposez le 0 depuis votre chambre ou utilisez notre application.",                            type: "restaurant" },
    { title: "Navette Aéroport",      content: "Navette gratuite toutes les heures entre 05h30 et 23h30.\nRéservation à la réception 2h à l'avance.",                     type: "transport" },
    { title: "Spa & Bien-être",       content: "Ouvert de 09h00 à 21h00.\nMassages, hammam, sauna disponibles sur réservation à la réception.",                           type: "service" },
    { title: "Parking",               content: "Parking sécurisé gratuit pour les résidents. Accès par badge fourni à l'accueil.",                                         type: "service" },
    { title: "Check-out",             content: "L'heure de départ standard est 12h00. Extension possible jusqu'à 14h00 sur demande (selon disponibilité, supplément).","type": "service" },
  ];

  for (const info of hotelInfos) {
    // Try to find by title; create if missing, skip if present (safe mode)
    const existing = await prisma.hotelInfo.findFirst({ where: { title: info.title } });
    if (!existing) {
      await prisma.hotelInfo.create({ data: info });
      console.log(`  → [NEW] ${info.title}`);
    } else {
      console.log(`  → [OK]  ${info.title}`);
    }
  }

  const currencyRates = [
    { currency: "EUR", rateToTnd: 3.35 },
    { currency: "USD", rateToTnd: 3.10 },
    { currency: "GBP", rateToTnd: 3.90 },
    { currency: "SAR", rateToTnd: 0.83 },
    { currency: "AED", rateToTnd: 0.84 },
  ];

  for (const rate of currencyRates) {
    await prisma.currencyRate.upsert({
      where: { currency: rate.currency },
      update: { rateToTnd: rate.rateToTnd },
      create: rate,
    });
    console.log(`  → 1 ${rate.currency} = ${rate.rateToTnd} TND`);
  }
  console.log();

  // ─── 5. HOTEL EVENTS ───────────────────────────────────────────────
  console.log("[5/7] Événements hôtel...");

  const futureEvents = [
    {
      title: "Soirée Jazz au bord de la piscine",
      description: "Rejoignez-nous pour une soirée musicale exceptionnelle avec le quartet Ahmad Slama.\nBoissons et cocktails inclus. Tenue correcte exigée.",
      eventDate: addDays(today, 2),
      isPublished: true,
    },
    {
      title: "Brunch du Dimanche",
      description: "Notre célèbre brunch dominical revient avec un buffet encore plus généreux.\nDe 10h00 à 14h00 — Salle Jasmin.",
      eventDate: addDays(today, 4),
      isPublished: true,
    },
    {
      title: "Cours de Yoga au lever du soleil",
      description: "Séance de yoga guidée sur la terrasse panoramique.\nTous niveaux bienvenus. Tapis fournis.\nRéservation à la réception.",
      eventDate: addDays(today, 1),
      isPublished: true,
    },
    {
      title: "Dîner Gastronomique — Chef Étoilé",
      description: "Soirée exceptionnelle avec le Chef Walid Marzouk, étoilé au Guide Michelin.\n7 services — Places limitées. Réservation obligatoire.",
      eventDate: addDays(today, 7),
      isPublished: true,
    },
    {
      title: "Nuit Blanche Cinéma",
      description: "Projection de films classiques en plein air sur la terrasse du 4ème étage.\nDe 21h00 à 02h00. Pop-corn et boissons servis.",
      eventDate: addDays(today, 10),
      isPublished: false, // Draft
    },
  ];

  for (const ev of futureEvents) {
    // Check by title to avoid duplicates
    const existing = await prisma.hotelEvent.findFirst({ where: { title: ev.title } });
    if (!existing) {
      await prisma.hotelEvent.create({
        data: { ...ev, createdById: adminUser.id },
      });
      console.log(`  → [NEW] ${ev.title} (${ev.isPublished ? "publié" : "brouillon"})`);
    } else {
      console.log(`  → [OK]  ${ev.title}`);
    }
  }
  console.log();

  // ─── 6. SAMPLE COMPLAINTS ─────────────────────────────────────────
  console.log("[6/7] Réclamations démo...");

  const res001 = reservations["RES-001"];
  const res002 = reservations["RES-002"];
  const res003 = reservations["RES-003"];
  const room101 = rooms["101"];
  const room203 = rooms["203"];
  const room301 = rooms["301"];

  const maint1 = users["maint.worker1@loomstay.test"];
  const hkWorker1 = users["hk.worker1@loomstay.test"];
  const maintManager = users["maintenance.manager@loomstay.test"];
  const hkManager = users["housekeeping.manager@loomstay.test"];

  const sampleComplaints = [
    {
      key: "COMP-DEMO-001",
      reservationId: res001?.id,
      roomId: room101?.id,
      originalMessage: "La climatisation de ma chambre ne fonctionne pas correctement, il fait très chaud.",
      normalizedMessageEn: "The air conditioning in my room is not working properly, it is very hot.",
      staffMessage: "Climatisation défaillante — intervention requise en urgence.",
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.IN_PROGRESS,
      assignedToId: maint1?.id,
      assignedById: maintManager?.id,
    },
    {
      key: "COMP-DEMO-002",
      reservationId: res002?.id,
      roomId: room203?.id,
      originalMessage: "La salle de bain n'a pas été nettoyée depuis mon arrivée.",
      normalizedMessageEn: "The bathroom has not been cleaned since my arrival.",
      staffMessage: "Nettoyage salle de bain chambre 203 requis.",
      category: ComplaintCategory.HOUSEKEEPING,
      status: ComplaintStatus.ASSIGNED,
      assignedToId: hkWorker1?.id,
      assignedById: hkManager?.id,
    },
    {
      key: "COMP-DEMO-003",
      reservationId: res003?.id,
      roomId: room301?.id,
      originalMessage: "Le robinet de la douche fuit abondamment.",
      normalizedMessageEn: "The shower faucet is leaking heavily.",
      staffMessage: "Fuite robinet douche — plomberie urgente.",
      category: ComplaintCategory.MAINTENANCE,
      status: ComplaintStatus.PENDING,
      assignedToId: null,
      assignedById: null,
    },
  ];

  for (const c of sampleComplaints) {
    if (!c.reservationId || !c.roomId) {
      console.log(`  ⚠️  Données manquantes pour ${c.key}, skipping`);
      continue;
    }
    // Use a tag in metadata to avoid duplicate complaints on re-seed
    const existing = await prisma.complaint.findFirst({
      where: { originalMessage: c.originalMessage, roomId: c.roomId },
    });
    if (!existing) {
      await prisma.complaint.create({
        data: {
          reservationId: c.reservationId,
          roomId: c.roomId,
          originalMessage: c.originalMessage,
          normalizedMessageEn: c.normalizedMessageEn,
          staffMessage: c.staffMessage,
          category: c.category,
          status: c.status,
          assignedToId: c.assignedToId,
          assignedById: c.assignedById,
        },
      });
      console.log(`  → [NEW] ${c.key} (${c.category} — ${c.status})`);
    } else {
      console.log(`  → [OK]  ${c.key}`);
    }
  }
  console.log();

  // ─── 7. SHIFTS + DAILY CLEANING TASKS ─────────────────────────────
  console.log("[7/7] Planning quarts & tâches quotidiennes...");

  const businessDay = todayMidnightUTC();

  // Today's shifts (upsert — safe to rerun)
  const shiftAssignments: Array<{ email: string; shift: WorkerShift }> = [
    { email: "maint.worker1@loomstay.test",  shift: WorkerShift.MORNING },
    { email: "maint.worker2@loomstay.test",  shift: WorkerShift.EVENING },
    { email: "maint.worker3@loomstay.test",  shift: WorkerShift.DAY_OFF },
    { email: "hk.worker1@loomstay.test",     shift: WorkerShift.MORNING },
    { email: "hk.worker2@loomstay.test",     shift: WorkerShift.MORNING },
    { email: "hk.worker3@loomstay.test",     shift: WorkerShift.EVENING },
  ];

  for (const s of shiftAssignments) {
    const worker = users[s.email];
    if (!worker) continue;
    const manager = [Department.MAINTENANCE].includes(
      DEMO_ACCOUNTS.find(a => a.email === s.email)?.department as Department
    ) ? maintManager : hkManager;

    await prisma.workerShiftSchedule.upsert({
      where: { workerId_businessDay: { workerId: worker.id, businessDay } },
      update: { shift: s.shift },
      create: { workerId: worker.id, businessDay, shift: s.shift, createdById: manager.id },
    });
    console.log(`  → Shift ${s.shift.padEnd(8)} — ${DEMO_ACCOUNTS.find(a => a.email === s.email)?.name}`);
  }

  // Daily cleaning tasks for MORNING shift workers (only if not yet assigned today)
  const dailyCleaningAssignments = [
    { roomNumber: "101", workerEmail: "hk.worker1@loomstay.test", note: "Ménage complet — client présent" },
    { roomNumber: "103", workerEmail: "hk.worker1@loomstay.test", note: "Ménage départ" },
    { roomNumber: "201", workerEmail: "hk.worker2@loomstay.test", note: "Ménage complet" },
    { roomNumber: "203", workerEmail: "hk.worker2@loomstay.test", note: "Ménage complet — signalement client" },
    { roomNumber: "301", workerEmail: "hk.worker2@loomstay.test", note: "Ménage standard" },
  ];

  for (const dc of dailyCleaningAssignments) {
    const room = rooms[dc.roomNumber];
    const worker = users[dc.workerEmail];
    if (!room || !worker) continue;

    const existing = await prisma.dailyCleaningTask.findFirst({
      where: { roomId: room.id, businessDay, status: { not: DailyCleaningStatus.SKIPPED } },
    });
    if (!existing) {
      await prisma.dailyCleaningTask.create({
        data: {
          roomId: room.id,
          workerId: worker.id,
          businessDay,
          note: dc.note,
          assignedById: hkManager.id,
          status: DailyCleaningStatus.ASSIGNED,
        },
      });
      console.log(`  → [NEW] Ch.${dc.roomNumber} → ${DEMO_ACCOUNTS.find(a => a.email === dc.workerEmail)?.name}`);
    } else {
      console.log(`  → [OK]  Ch.${dc.roomNumber} déjà assignée`);
    }
  }
  console.log();

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                   SEED TERMINÉ ✅                            ║");
  console.log("╠═══════════════════════════════════════════════════════════════╣");
  console.log("║  Comptes de démonstration (mot de passe identique)           ║");
  console.log("╠═══════════════════════════════════════════════════════════════╣");
  const accountRows = [
    ["Admin",               "admin@loomstay.test"],
    ["Réception",           "reception@loomstay.test"],
    ["Manager Maintenance", "maintenance.manager@loomstay.test"],
    ["Manager Ménage",      "housekeeping.manager@loomstay.test"],
    ["Ouvrier Maint. 1",    "maint.worker1@loomstay.test"],
    ["Ouvrier Maint. 2",    "maint.worker2@loomstay.test"],
    ["Ouvrier Maint. 3",    "maint.worker3@loomstay.test"],
    ["Ménage Worker 1",     "hk.worker1@loomstay.test"],
    ["Ménage Worker 2",     "hk.worker2@loomstay.test"],
    ["Ménage Worker 3",     "hk.worker3@loomstay.test"],
  ];
  for (const [role, email] of accountRows) {
    console.log(`║  ${role.padEnd(22)} ${email.padEnd(38)}║`);
  }
  console.log("╠═══════════════════════════════════════════════════════════════╣");
  console.log(`║  Mot de passe : ${DEMO_PASSWORD.padEnd(46)}║`);
  console.log("╠═══════════════════════════════════════════════════════════════╣");
  console.log("║  Safe seed   : npx ts-node prisma/seed.ts                    ║");
  console.log("║  Reset seed  : SEED_RESET=true npx ts-node prisma/seed.ts    ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
