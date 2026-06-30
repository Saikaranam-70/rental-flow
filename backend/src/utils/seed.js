require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Agency = require('../models/Agency');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Rental = require('../models/Rental');
const logger = require('../config/logger');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB for seeding...');

  // Clear existing data
  await Promise.all([
    Agency.deleteMany({}),
    Customer.deleteMany({}),
    Inventory.deleteMany({}),
    Rental.deleteMany({}),
  ]);

  // Create demo agency
  const agency = await Agency.create({
    ownerName: 'Sai Karanam',
    email: 'demo@rentflow.in',
    password: 'Demo@1234',
    agencyName: 'Vizag Bike Rentals',
    phone: '9876543210',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    businessType: 'bike_rental',
    plan: 'pro',
    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isEmailVerified: true,
    settings: {
      whatsappEnabled: false,
      emailNotifications: true,
      overdueAlertDays: 0,
    },
  });

  logger.info(`✅ Agency created: ${agency.agencyName} (${agency._id})`);

  // Create inventory
  const inventoryData = [
    { name: 'Honda Activa 6G', brand: 'Honda', model: 'Activa 6G', year: 2022, color: 'Pearl White', category: 'scooter', fuelType: 'petrol', engineCC: 110, registrationNumber: 'AP31AB1234', dailyRate: 300, depositAmount: 2000, lateFeePerDay: 50, insuranceExpiryDate: new Date('2025-12-31'), pucExpiryDate: new Date('2025-06-30'), status: 'available' },
    { name: 'TVS Jupiter Classic', brand: 'TVS', model: 'Jupiter Classic', year: 2021, color: 'Royal Blue', category: 'scooter', fuelType: 'petrol', engineCC: 110, registrationNumber: 'AP31CD5678', dailyRate: 280, depositAmount: 1800, lateFeePerDay: 50, insuranceExpiryDate: new Date('2025-11-30'), pucExpiryDate: new Date('2025-08-31'), status: 'available' },
    { name: 'Royal Enfield Classic 350', brand: 'Royal Enfield', model: 'Classic 350', year: 2023, color: 'Gunmetal Grey', category: 'bike', fuelType: 'petrol', engineCC: 349, registrationNumber: 'AP31EF9012', dailyRate: 800, depositAmount: 5000, lateFeePerDay: 100, status: 'available' },
    { name: 'Maruti Swift Dzire', brand: 'Maruti', model: 'Swift Dzire', year: 2022, color: 'Silky Silver', category: 'car', fuelType: 'petrol', seatingCapacity: 5, registrationNumber: 'AP31GH3456', dailyRate: 1500, depositAmount: 10000, lateFeePerDay: 200, status: 'available' },
    { name: 'Bajaj Pulsar 150', brand: 'Bajaj', model: 'Pulsar 150', year: 2021, color: 'Black', category: 'bike', fuelType: 'petrol', engineCC: 150, registrationNumber: 'AP31KL1111', dailyRate: 400, depositAmount: 3000, lateFeePerDay: 75, status: 'available' },
    { name: 'Hero Cycle MTB', brand: 'Hero', model: 'Sprint', year: 2022, color: 'Red', category: 'cycle', fuelType: 'na', registrationNumber: 'N/A', dailyRate: 80, depositAmount: 500, lateFeePerDay: 20, status: 'available' },
    { name: 'Honda City 4th Gen', brand: 'Honda', model: 'City', year: 2021, color: 'Lunar Silver', category: 'car', fuelType: 'petrol', seatingCapacity: 5, registrationNumber: 'AP31IJ7890', dailyRate: 2000, depositAmount: 15000, lateFeePerDay: 300, status: 'maintenance' },
    { name: 'Mahindra Generator 5KVA', brand: 'Mahindra', model: 'PowerPro 5KVA', year: 2020, color: 'Yellow', category: 'other', fuelType: 'petrol', registrationNumber: 'N/A', dailyRate: 600, depositAmount: 4000, lateFeePerDay: 100, status: 'available' },
  ];

  const inventory = await Inventory.insertMany(
    inventoryData.map(i => ({ ...i, agencyId: agency._id }))
  );
  logger.info(`✅ ${inventory.length} inventory items created`);

  // Create customers
  const customerData = [
    { name: 'Ravi Shankar', phone: '9876543210', email: 'ravi@gmail.com', address: 'Dwaraka Nagar', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-1234', dlNumber: 'AP09-2019-1234567', totalRentals: 7, totalAmountPaid: 15600, source: 'walk_in' },
    { name: 'Priya Lakshmi', phone: '8765432109', email: 'priya@gmail.com', address: 'MVP Colony', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-5678', dlNumber: 'AP09-2020-7654321', totalRentals: 3, totalAmountPaid: 5400, source: 'whatsapp' },
    { name: 'Suresh Babu', phone: '7654321098', email: 'suresh@gmail.com', address: 'Gajuwaka', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-9012', isBlacklisted: true, blacklistReason: 'Returned vehicle damaged', totalRentals: 2, source: 'walk_in' },
    { name: 'Ananya Reddy', phone: '6543210987', email: 'ananya@gmail.com', address: 'Seethammadhara', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-3456', dlNumber: 'AP09-2021-3456789', totalRentals: 5, totalAmountPaid: 12000, source: 'referral' },
    { name: 'Kiran Kumar', phone: '9988776655', email: 'kiran@gmail.com', address: 'Madhurawada', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-7890', dlNumber: 'AP09-2018-9876543', totalRentals: 1, totalAmountPaid: 2400, source: 'phone' },
    { name: 'Lakshmi Prasad', phone: '9123456780', email: 'lakshmi@gmail.com', address: 'Rushikonda', city: 'Visakhapatnam', aadhaarNumber: 'XXXX-XXXX-2345', dlNumber: 'AP09-2022-2345678', totalRentals: 10, totalAmountPaid: 28000, source: 'walk_in' },
  ];

  const customers = await Customer.insertMany(
    customerData.map(c => ({ ...c, agencyId: agency._id }))
  );
  logger.info(`✅ ${customers.length} customers created`);

  // Create sample rentals
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const rentalData = [
    {
      customerId: customers[0]._id, inventoryId: inventory[0]._id,
      startDate: daysAgo(10), expectedReturnDate: daysAgo(3),
      totalDays: 7, dailyRate: 300, depositAmount: 2000,
      baseAmount: 2100, totalAmount: 2100, status: 'overdue',
      payments: [{ amount: 2000, method: 'cash', type: 'deposit', paidAt: daysAgo(10) }],
    },
    {
      customerId: customers[3]._id, inventoryId: inventory[3]._id,
      startDate: daysAgo(5), expectedReturnDate: daysFromNow(2),
      totalDays: 7, dailyRate: 1500, depositAmount: 10000,
      baseAmount: 10500, totalAmount: 10500, status: 'active',
      payments: [{ amount: 10000, method: 'upi', type: 'deposit', paidAt: daysAgo(5) }],
    },
    {
      customerId: customers[1]._id, inventoryId: inventory[7]._id,
      startDate: daysAgo(2), expectedReturnDate: daysFromNow(5),
      totalDays: 7, dailyRate: 600, depositAmount: 4000,
      baseAmount: 4200, totalAmount: 4200, status: 'active',
      payments: [{ amount: 4000, method: 'cash', type: 'deposit', paidAt: daysAgo(2) }],
    },
    {
      customerId: customers[0]._id, inventoryId: inventory[1]._id,
      startDate: daysAgo(20), expectedReturnDate: daysAgo(15),
      actualReturnDate: daysAgo(15), totalDays: 5,
      dailyRate: 280, depositAmount: 1800, depositReturned: 1800,
      baseAmount: 1400, totalAmount: 1400, status: 'returned',
      closedAt: daysAgo(15),
      payments: [
        { amount: 1800, method: 'cash', type: 'deposit', paidAt: daysAgo(20) },
        { amount: 1400, method: 'upi', type: 'rental', paidAt: daysAgo(15) },
        { amount: 1800, method: 'cash', type: 'refund', paidAt: daysAgo(15) },
      ],
    },
    {
      customerId: customers[4]._id, inventoryId: inventory[2]._id,
      startDate: daysAgo(8), expectedReturnDate: daysAgo(1),
      totalDays: 7, dailyRate: 800, depositAmount: 5000,
      baseAmount: 5600, totalAmount: 5600, status: 'overdue',
      payments: [{ amount: 5000, method: 'cash', type: 'deposit', paidAt: daysAgo(8) }],
    },
    {
      customerId: customers[5]._id, inventoryId: inventory[4]._id,
      startDate: daysAgo(30), expectedReturnDate: daysAgo(25),
      actualReturnDate: daysAgo(25), totalDays: 5,
      dailyRate: 400, depositAmount: 3000, depositReturned: 3000,
      baseAmount: 2000, totalAmount: 2000, status: 'returned',
      closedAt: daysAgo(25),
      payments: [
        { amount: 3000, method: 'cash', type: 'deposit', paidAt: daysAgo(30) },
        { amount: 2000, method: 'cash', type: 'rental', paidAt: daysAgo(25) },
        { amount: 3000, method: 'cash', type: 'refund', paidAt: daysAgo(25) },
      ],
    },
  ];

  // Update inventory status for active/overdue rentals
  await Inventory.findByIdAndUpdate(inventory[0]._id, { status: 'rented' });
  await Inventory.findByIdAndUpdate(inventory[3]._id, { status: 'rented' });
  await Inventory.findByIdAndUpdate(inventory[7]._id, { status: 'rented' });
  await Inventory.findByIdAndUpdate(inventory[2]._id, { status: 'rented' });

  for (const r of rentalData) {
    const count = await Rental.countDocuments({ agencyId: agency._id });
    const year = new Date().getFullYear().toString().slice(-2);
    const rentalNumber = `RF${year}${String(count + 1).padStart(4, '0')}`;
    await Rental.create({ ...r, agencyId: agency._id, rentalNumber });
  }

  logger.info(`✅ ${rentalData.length} rentals created`);
  logger.info('');
  logger.info('🎉 Seed complete!');
  logger.info('─────────────────────────────────');
  logger.info('  Login email : demo@rentflow.in');
  logger.info('  Password    : Demo@1234');
  logger.info('─────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
