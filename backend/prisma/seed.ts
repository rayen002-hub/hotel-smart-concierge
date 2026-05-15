import { PrismaClient, UserRole, Department, RoomStatus, ReservationStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "Password123!";

async function main() {
  console.log("=== SEEDING DATABASE ===\n");

  // -----------------------------------------------------------
  // 1. USERS
  // -----------------------------------------------------------
  console.log("[1/5] Creation des utilisateurs...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const usersData = [
    { name: "Admin",                email: "admin@hotel.test",                role: UserRole.ADMIN },
    { name: "Reception",            email: "reception@hotel.test",            role: UserRole.RECEPTIONIST },
    { name: "Maintenance Manager",  email: "maintenance.manager@hotel.test",  role: UserRole.MAINTENANCE_MANAGER },
    { name: "Housekeeping Manager", email: "housekeeping.manager@hotel.test", role: UserRole.HOUSEKEEPING_MANAGER },
    { name: "Maintenance Worker 1", email: "maintenance.worker1@hotel.test",  role: UserRole.EMPLOYEE },
    { name: "Maintenance Worker 2", email: "maintenance.worker2@hotel.test",  role: UserRole.EMPLOYEE },
    { name: "Housekeeping Worker 1",email: "housekeeping.worker1@hotel.test", role: UserRole.EMPLOYEE },
    { name: "Housekeeping Worker 2",email: "housekeeping.worker2@hotel.test", role: UserRole.EMPLOYEE },
  ];

  const users: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
    users[u.email] = user;
    console.log(`  -> ${user.name} (${user.role})`);
  }

  // -----------------------------------------------------------
  // 2. EMPLOYEE PROFILES
  // -----------------------------------------------------------
  console.log("\n[2/5] Creation des profils employes...");

  const profilesData = [
    { email: "maintenance.manager@hotel.test",  department: Department.MAINTENANCE },
    { email: "housekeeping.manager@hotel.test", department: Department.HOUSEKEEPING },
    { email: "maintenance.worker1@hotel.test",  department: Department.MAINTENANCE },
    { email: "maintenance.worker2@hotel.test",  department: Department.MAINTENANCE },
    { email: "housekeeping.worker1@hotel.test", department: Department.HOUSEKEEPING },
    { email: "housekeeping.worker2@hotel.test", department: Department.HOUSEKEEPING },
    { email: "reception@hotel.test",            department: Department.RECEPTION },
  ];

  for (const p of profilesData) {
    const user = users[p.email];
    const adminUser = users["admin@hotel.test"];

    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        department: p.department,
        isAvailable: true,
        createdById: adminUser.id,
      },
    });
    console.log(`  -> ${user.name} (${p.department})`);
  }

  // -----------------------------------------------------------
  // 3. ROOMS
  // -----------------------------------------------------------
  console.log("\n[3/5] Creation des chambres...");

  const roomsData = [
    { roomNumber: "101", floor: 1, type: "Single" },
    { roomNumber: "102", floor: 1, type: "Single" },
    { roomNumber: "103", floor: 1, type: "Double" },
    { roomNumber: "201", floor: 2, type: "Double" },
    { roomNumber: "202", floor: 2, type: "Double" },
    { roomNumber: "203", floor: 2, type: "Suite" },
    { roomNumber: "301", floor: 3, type: "Suite" },
    { roomNumber: "302", floor: 3, type: "Double" },
    { roomNumber: "303", floor: 3, type: "Single" },
    { roomNumber: "401", floor: 4, type: "Suite Presidentielle" },
  ];

  const rooms: Record<string, any> = {};

  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {},
      create: {
        roomNumber: r.roomNumber,
        floor: r.floor,
        type: r.type,
        status: RoomStatus.AVAILABLE,
      },
    });
    rooms[r.roomNumber] = room;
    console.log(`  -> Chambre ${room.roomNumber} (${room.type}, Etage ${room.floor})`);
  }

  // -----------------------------------------------------------
  // 4. RESERVATIONS
  // -----------------------------------------------------------
  console.log("\n[4/5] Creation des reservations...");

  const today = new Date();
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const reservationsData = [
    {
      reservationNumber: "RES-2026-001",
      guestFirstName: "Jean",
      guestLastName: "Dupont",
      guestEmail: "jean.dupont@email.com",
      guestPhone: "+33612345678",
      nationality: "FR",
      checkInDate: today,
      checkOutDate: addDays(today, 3),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "101",
    },
    {
      reservationNumber: "RES-2026-002",
      guestFirstName: "Sarah",
      guestLastName: "Johnson",
      guestEmail: "sarah.j@email.com",
      guestPhone: "+14155551234",
      nationality: "US",
      checkInDate: today,
      checkOutDate: addDays(today, 5),
      status: ReservationStatus.CHECKED_IN,
      roomNumber: "203",
    },
    {
      reservationNumber: "RES-2026-003",
      guestFirstName: "Ahmed",
      guestLastName: "Ben Ali",
      guestEmail: "ahmed.ba@email.com",
      guestPhone: "+21698765432",
      nationality: "TN",
      checkInDate: addDays(today, 1),
      checkOutDate: addDays(today, 4),
      status: ReservationStatus.PENDING,
      roomNumber: "201",
    },
    {
      reservationNumber: "RES-2026-004",
      guestFirstName: "Maria",
      guestLastName: "Garcia",
      guestEmail: "maria.g@email.com",
      guestPhone: "+34612345678",
      nationality: "ES",
      checkInDate: addDays(today, 2),
      checkOutDate: addDays(today, 6),
      status: ReservationStatus.PENDING,
      roomNumber: "301",
    },
    {
      reservationNumber: "RES-2026-005",
      guestFirstName: "Marco",
      guestLastName: "Rossi",
      guestEmail: "marco.r@email.com",
      guestPhone: "+39312345678",
      nationality: "IT",
      checkInDate: addDays(today, -2),
      checkOutDate: addDays(today, -1),
      status: ReservationStatus.CHECKED_OUT,
      roomNumber: "102",
    },
  ];

  for (const r of reservationsData) {
    const room = rooms[r.roomNumber];
    await prisma.reservation.upsert({
      where: { reservationNumber: r.reservationNumber },
      update: {},
      create: {
        reservationNumber: r.reservationNumber,
        guestFirstName: r.guestFirstName,
        guestLastName: r.guestLastName,
        guestEmail: r.guestEmail,
        guestPhone: r.guestPhone,
        nationality: r.nationality,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        status: r.status,
        roomId: room.id,
      },
    });
    console.log(`  -> ${r.reservationNumber} - ${r.guestFirstName} ${r.guestLastName} (${r.status})`);
  }

  // -----------------------------------------------------------
  // 5. HOTEL INFO & CURRENCY RATES
  // -----------------------------------------------------------
  console.log("\n[5/5] Creation des infos hotel et taux de change...");

  const hotelInfos = [
    { title: "Horaires de la piscine",  content: "La piscine est ouverte de 08h00 a 22h00 tous les jours.",                type: "service" },
    { title: "Wi-Fi",                   content: "Le Wi-Fi est gratuit dans tout l'hotel. Reseau : Hotel_Guest",            type: "service" },
    { title: "Petit-dejeuner",          content: "Le petit-dejeuner est servi de 06h30 a 10h30 au restaurant principal.",    type: "restaurant" },
    { title: "Room Service",            content: "Le room service est disponible 24h/24. Appelez le 0 depuis votre chambre.",type: "restaurant" },
    { title: "Navette aeroport",        content: "Navette gratuite toutes les heures de 06h00 a 23h00.",                    type: "transport" },
    { title: "Spa et bien-etre",        content: "Le spa est ouvert de 09h00 a 21h00. Reservation a la reception.",         type: "service" },
  ];

  for (const info of hotelInfos) {
    await prisma.hotelInfo.create({ data: info });
    console.log(`  -> ${info.title}`);
  }

  const currencyRates = [
    { currency: "EUR", rateToTnd: 3.35 },
    { currency: "USD", rateToTnd: 3.10 },
    { currency: "GBP", rateToTnd: 3.90 },
  ];

  for (const rate of currencyRates) {
    await prisma.currencyRate.upsert({
      where: { currency: rate.currency },
      update: { rateToTnd: rate.rateToTnd },
      create: rate,
    });
    console.log(`  -> 1 ${rate.currency} = ${rate.rateToTnd} TND`);
  }

  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`\nIdentifiants de connexion :`);
  console.log(`  Email : admin@hotel.test`);
  console.log(`  Mot de passe : ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
