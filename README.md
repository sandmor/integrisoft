# 🌟 Integrisoft ERP

> A sleek, modular Enterprise Resource Planning (ERP) system to streamline your business operations.

**Integrisoft** unifies CRM, Projects, HR, Finance, Products, and Reporting into a single Next.js + TypeScript application with a modern, responsive UI powered by ShadCN and Tailwind CSS.

---

## 🚀 Key Features

- **Modular Architecture**: Pluggable dashboards for Clients, Projects, Employees, Finances, Products, and Reports.
- **Rich UI Components**: Built with ShadCN UI, Recharts, and Radix primitives for consistency and accessibility.
- **Real-time Data**: Redux Toolkit + RTK Query for efficient state management and caching.
- **Robust Backend**: Next.js API routes with Drizzle ORM for type-safe database queries on PostgreSQL.
- **Customizable Reports**: Pre-built and user-defined report templates with scheduling support.
- **Notifications & Activity Feed**: Track changes and alerts with an integrated notifications system.

## 📦 Modules Breakdown

- **CRM**: Clients, Contacts, Service Level Agreements, Interactions.
- **Projects**: Projects, Milestones, Tasks, Kanban, Metrics.
- **HR**: Employees, Departments, Positions, Skills, Roles & Permissions.
- **Finance**: Transactions, Budgets, Cost Centers, Reports & Dashboard.
- **Products**: Products, Versions, Dependencies, Technical Specs.
- **Reporting**: Saved Reports, Custom Builders, Scheduling & Exports.

## 🛠 Tech Stack

- Frontend: Next.js (App Router), React, TypeScript, ShadCN UI, Tailwind CSS
- State & API: Redux Toolkit, RTK Query
- Backend: Next.js API Routes (Route Handlers)
- Database: PostgreSQL, Drizzle ORM & Migrations
- Charts & Visuals: Recharts, Lucide Icons
- Testing & Data: Faker-driven test suites for development

## ⚡ Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/your-org/integrisoft.git
   cd integrisoft
   ```
2. Install dependencies:
   ```bash
   pnpm install
   # or npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update your database connection string
4. Apply database migrations using Drizzle Kit:
   ```bash
   npx drizzle-kit push
   ```
5. Start the development server:
   ```bash
   pnpm dev
   ```
6. Seed test data via API endpoint:
   ```bash
   curl http://localhost:3000/api/danger
   ```
7. Visit `http://localhost:3000`

## 📄 License

Distributed under the Mozila Public License (MPL) Version 2.0. See [LICENSE](LICENSE) for more information.
