# 🏍️ RentFlow CRM — Complete Deployment Guide

> Production-ready SaaS CRM for Indian rental agencies  
> Stack: MongoDB · Node.js/Express · React/Vite · Cloudinary · BullMQ · Twilio

---

## 📁 Project Structure

```
rentflow/
├── backend/          ← Node.js + Express API
│   ├── src/
│   │   ├── models/       ← Mongoose schemas (Agency, Customer, Inventory, Rental, AlertLog, Staff)
│   │   ├── controllers/  ← Business logic
│   │   ├── routes/       ← API routes
│   │   ├── middleware/   ← Auth, error handler, tenant guard
│   │   ├── jobs/         ← BullMQ queues + cron + WhatsApp handlers
│   │   ├── config/       ← DB, Redis, Cloudinary, Logger
│   │   └── utils/        ← AppError, catchAsync, email, seed
│   ├── .env.example
│   └── package.json
│
└── frontend/         ← React + Vite + Tailwind
    ├── src/
    │   ├── pages/        ← Dashboard, Rentals, Customers, Inventory, Payments, Reports, Settings
    │   ├── components/   ← Layout, UI, Rental modals
    │   ├── api/          ← Axios + all API service functions
    │   ├── store/        ← Zustand auth store
    │   └── utils/        ← Helpers (fmt, fmtDate, etc.)
    └── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd rentflow/backend
npm install
cp .env.example .env
# Fill in your credentials in .env

# Start MongoDB locally or use Atlas connection string
npm run dev        # starts on port 5000

# Seed demo data
npm run seed
# Login: demo@rentflow.in / Demo@1234
```

### 2. Frontend Setup

```bash
cd rentflow/frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:5000/api

npm run dev        # starts on port 5173
```

---

## ☁️ Production Deployment

### Backend → Render.com

1. Create new **Web Service** on Render
2. Connect your GitHub repo, set root to `rentflow/backend`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add all environment variables from `.env.example`
6. Set `NODE_ENV=production`

### Frontend → Vercel

1. Import repo on Vercel, set root to `rentflow/frontend`
2. Framework: Vite
3. Add env variable: `VITE_API_URL=https://your-render-url.onrender.com/api`
4. Deploy

### Redis → Upstash (Free tier)

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy the Redis URL to `REDIS_URL` in backend env

### MongoDB → Atlas (Free tier)

1. Create cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user, whitelist IPs (or allow all: `0.0.0.0/0`)
3. Copy connection string to `MONGODB_URI`

### Cloudinary (Free tier)

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Copy Cloud Name, API Key, API Secret to `.env`

---

## 🔌 External Services Setup

### Twilio WhatsApp (Overdue Alerts)
1. Create Twilio account → get Account SID + Auth Token
2. Enable WhatsApp sandbox or apply for WhatsApp Business API
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` in `.env`
4. Enable WhatsApp in agency Settings → Notifications

### Gmail SMTP (Email Notifications)
1. Enable 2FA on Gmail → Generate App Password
2. Set `SMTP_USER=your@gmail.com`, `SMTP_PASS=your_app_password`

### Razorpay (Subscription Billing)
1. Create account at [razorpay.com](https://razorpay.com)
2. Get API keys from Dashboard → Settings → API Keys
3. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

---

## 🗂️ API Endpoints Reference

```
POST   /api/auth/register          Register agency
POST   /api/auth/login             Login
POST   /api/auth/refresh           Refresh JWT
POST   /api/auth/forgot-password   Send reset email
GET    /api/auth/me                Get current user

GET    /api/rentals/dashboard      Dashboard stats
GET    /api/rentals                List rentals (filters: status, customerId)
POST   /api/rentals                Create rental
POST   /api/rentals/:id/payment    Record payment
POST   /api/rentals/:id/return     Process return
POST   /api/rentals/:id/extend     Extend rental
DELETE /api/rentals/:id            Cancel rental

GET    /api/customers              List customers (search, blacklist filter)
POST   /api/customers              Add customer
GET    /api/customers/:id          Customer profile + rental history
PUT    /api/customers/:id          Update customer
POST   /api/customers/:id/blacklist Toggle blacklist
POST   /api/customers/:id/upload-id Upload ID proof to Cloudinary

GET    /api/inventory              List fleet (status, category filters)
POST   /api/inventory              Add item
PUT    /api/inventory/:id          Update item
POST   /api/inventory/:id/photo    Upload vehicle photo
POST   /api/inventory/:id/maintenance Log service

GET    /api/payments               All payments with aggregation
GET    /api/reports/overview       Analytics (monthly revenue, top customers, etc.)
GET    /api/reports/export/rentals CSV export
GET    /api/reports/export/customers CSV export

GET    /api/agency/profile         Agency details
PUT    /api/agency/profile         Update profile/settings
POST   /api/agency/logo            Upload logo

GET    /api/staff                  List staff
POST   /api/staff/invite           Invite staff member
DELETE /api/staff/:id              Remove staff

GET    /api/alerts                 Alert history
POST   /api/alerts/send-overdue    Manual overdue alert
```

---

## 🔐 Security Features

- JWT access tokens (7 day) + refresh tokens (30 day)
- Multi-tenant isolation — every query filtered by `agencyId`
- Rate limiting (100 req/15min global, 20 req/15min auth routes)
- Helmet.js security headers
- MongoDB sanitization (prevent injection)
- HPP (HTTP Parameter Pollution protection)
- Password hashing with bcrypt (12 rounds)
- Signed Cloudinary uploads only
- Role-based permissions for staff
- Plan-based feature gating

---

## ⚡ Automated Jobs (BullMQ + node-cron)

| Job | Schedule | Action |
|-----|----------|--------|
| Overdue Check | 9:00 AM IST daily | Mark active rentals past due as overdue + queue WhatsApp alerts |
| Due Reminder | 8:00 AM IST daily | Alert customers returning tomorrow |
| Alert Processor | On-demand | Send WhatsApp / Email via Twilio / Nodemailer |

---

## 💰 Pricing Plans

| Plan | Price | Limits |
|------|-------|--------|
| Free | ₹0 | 20 rentals/month, 1 user, no alerts |
| Basic | ₹499/mo | Unlimited rentals, 1 user, WhatsApp alerts, CSV export |
| Pro | ₹999/mo | Unlimited, 5 staff, all alerts, full reports |
| Enterprise | Custom | Unlimited, custom integrations |

---

## 🏗️ Models Overview

| Model | Key Fields |
|-------|-----------|
| `Agency` | Owner, plan, settings, JWT methods |
| `Staff` | agencyId, role, permissions |
| `Customer` | agencyId, ID proofs (Cloudinary URLs), blacklist, tier |
| `Inventory` | agencyId, dailyRate, deposit, photos, insurance/PUC dates |
| `Rental` | agencyId, customerId, inventoryId, payments[], extensions[], alerts[] |
| `AlertLog` | rentalId, type, channel, status, Twilio SID |

---

## 🧪 Demo Account

After running `npm run seed`:

```
URL:      http://localhost:5173
Email:    demo@rentflow.in
Password: Demo@1234
```

Pre-loaded with: 6 customers · 8 fleet items · 6 rentals (2 overdue, 2 active, 2 returned)

---

Built with ❤️ by Sai Karanam — RentFlow CRM
