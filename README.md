<p align="center">
  <img src="./public/aligne-app-thumbnail.webp" alt="Aligne App" width="900"/>
</p>

# Aligne - Dental Management System
 
![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)
![tRPC](https://img.shields.io/badge/tRPC-11.17-2D3748?style=flat&logo=trpc)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat&logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql)
 
---
 
## Table of Contents
 
- [Introduction](#introduction)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quickstart](#quickstart)
---
 
## Introduction
 
Aligne is a comprehensive dental practice management system built for modern clinics. It handles patient records, appointments, treatments, invoicing with automatic tax calculation and provides a clean, intuitive interface for daily operations.
 
The system is designed for the Aligne clinic in Bosnia and Herzegovina, with full support for Bosnian language and local business requirements.
 
---
 
## Tech Stack
 
### Frontend
- **Next.js 15.2** - React framework with App Router
- **React 19.0** - UI library
- **TypeScript 5.0** - Type safety
- **Tailwind CSS 4.0** - Styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **TanStack Query** - Data fetching and caching
- **tRPC** - End-to-end typesafe APIs
 
### Backend
- **tRPC 11.17** - Type-safe API layer
- **Prisma 5.22** - ORM for database access
- **NextAuth 4.24** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Schema validation
- **Puppeteer** - PDF generation for invoices
 
### Database
- **PostgreSQL** - Primary database (Neon cloud hosting)
 
### Testing
- **Jest 30.4** - Unit testing
- **Playwright 1.59** - End-to-end testing
- **ts-jest** - TypeScript Jest preprocessor
 
---
 
## Features
 
### Patient Management
- Complete patient profiles with personal information, contact details, and medical history
- Anamnesis tracking (allergies, anesthesia history, medications, diseases)
- Odontogram for detailed tooth condition tracking
- Visit notes for documenting patient interactions
 
### Appointment Scheduling
- Calendar-based appointment booking
- Appointment status tracking (Scheduled, Waiting, In Progress, Completed, Cancelled)
- Reason for visit documentation
- Real-time availability management
 
### Treatment Management
- Treatment recording with diagnosis and therapy
- Treatment plan creation with multiple planned procedures
- Treatment status tracking (Planned, Completed, Invoiced)
- Link treatments to invoices for billing
 
### Invoicing
- Automatic invoice number generation
- 17% PDV tax calculation (subtotal, tax amount, total)
- Invoice status management (Draft, Paid, Unpaid)
- PDF invoice generation with professional layout
- Price list management for services
 
### User Management
- Role-based access control (Master, Staff)
- Secure authentication with `NextAuth`
- Password hashing with `bcrypt`
 
### Dashboard
- Overview of daily operations
- Quick access to patients, appointments, and invoices
- Statistics and analytics
 
---
 
## Quickstart
 
### Prerequisites
- Node.js 20+ 
- PostgreSQL database
- npm or pnpm
 
### Installation
 
1. Clone the repository
```bash
git clone <repository-url>
cd dental-clinic-management-system
```
2. Install dependencies
```bash
npm install
# or
pnpm install
```
3. Set up environment variables.
Create a new file named `.env` in the root of your project and add the following content:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/aligne"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```
4. Run database migrations
```bash
npx prisma migrate dev
```
5. Generate Prisma client
```bash
npx prisma generate
```
6. Run the Project
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.


   
