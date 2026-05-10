# SecureBank

A full-stack digital banking web application built with React, .NET, and Supabase. Designed for secure, modern banking with real-time fraud detection and dispute management.

---

## Features

- **Authentication** — Secure sign up and login via Supabase Auth with email confirmation
- **Accounts** — Create, close, and reopen multiple bank accounts
- **Cards** — Issue virtual cards, block/freeze, and control spending settings
- **Transactions** — Internal transfers and beneficiary payments with real-time balance updates
- **Fraud Detection** — AI-powered fraud scoring on every transaction
- **Dispute Portal** — Report fraudulent transactions and track case status
- **Alerts** — Real-time notifications with sound for every new alert
- **Beneficiaries** — Save and manage payees for quick transfers
- **Settings** — Edit profile, change password, and configure fraud detection rules

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend API | .NET 10, ASP.NET Core, Entity Framework Core |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT / RS256) |
| Real-time | Supabase Realtime (PostgreSQL change streams) |

---

## Project Structure

```
SecureBank/
├── SecureBank.API/        # .NET REST API
│   ├── Controllers/       # API endpoints
│   ├── Models/            # Entities and DTOs
│   ├── Services/          # Business logic
│   └── Data/              # EF Core DbContext
│
├── securebank-web/        # React frontend
│   ├── src/
│   │   ├── pages/         # Route pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # API client, utilities
│
└── supabase/              # Supabase config and edge functions
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [.NET SDK](https://dotnet.microsoft.com) 10+
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/SecureBank.git
cd SecureBank
```

### 2. Configure the API

Create `SecureBank.API/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Your Supabase PostgreSQL connection string"
  },
  "Jwt": {
    "Secret": "Your JWT secret",
    "Issuer": "https://YOUR_PROJECT.supabase.co/auth/v1",
    "Audience": "authenticated"
  }
}
```

### 3. Run the API

```bash
cd SecureBank.API
dotnet run
```

API runs at `http://localhost:5093`

### 4. Configure the frontend

Create `securebank-web/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:5093/api
```

### 5. Run the frontend

```bash
cd securebank-web
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Security

- Passwords handled entirely by Supabase Auth
- JWT tokens validated against Supabase JWKS on every API request
- Duplicate email, phone, and ID checked before registration
- All API endpoints require authentication except `/api/auth/check`
- Database credentials and secrets are never committed to the repository
