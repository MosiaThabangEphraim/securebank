# SecureBank

A full-stack digital banking web application with customizable real-time fraud detection. Users configure their own rules - velocity limits, spend caps, unusual hours, duplicate detection — and every transaction is scored instantly. Built with React, .NET 10, and Supabase.

---

## Architecture

### Frontend — React + TypeScript
The frontend handles everything the user sees and interacts with:
- Multi-step registration with duplicate email, phone, and ID validation
- Login, logout, and password reset flows
- Dashboard with live account balances and recent transactions
- Account management - create, close, and reopen accounts
- Virtual card management - issue cards, block, freeze, and toggle spending controls (contactless, online, international)
- Transfer money to own accounts or saved beneficiaries
- Fraud rules settings - each user configures their own detection thresholds
- Review zone - inspect and action flagged transactions
- Dispute portal - report fraud and track case status and SLA deadlines
- Real-time alert panel with sound notifications and unread badge
- Edit profile, change password, and manage beneficiaries

### Backend — .NET 10 ASP.NET Core API
The API is the backbone of all business logic and data operations:
- JWT authentication - validates every request against Supabase's RS256 public keys (JWKS)
- Accounts - create, close, reopen, and delete accounts with balance enforcement
- Cards - issue cards, update status (active/blocked/frozen), and toggle spending settings
- Transactions - execute transfers, enforce balance checks, update sender and receiver balances atomically
- Fraud scoring - scores every transaction in real time against the user's configured rules
- Fraud cases - open dispute cases, assign case numbers, set SLA deadlines
- Alerts - create, retrieve, mark as read, and mark all as read
- Beneficiaries - add and remove saved payees
- Fraud preferences - store and retrieve each user's custom fraud detection rules
- Registration availability check - validates email (against `auth.users`), phone, and ID uniqueness before signup

### Supabase
Supabase handles everything that requires a managed backend service:
- **Auth** - user signup, email confirmation, login, logout, and password reset
- **Database** - PostgreSQL database hosting all tables (profiles, accounts, cards, transactions, fraud cases, alerts, beneficiaries, fraud preferences)
- **Realtime** - live alert delivery to the frontend the moment a new alert is inserted into the database
- **Storage** - profile picture uploads

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
git clone https://github.com/MosiaThabangEphraim/securebank.git
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
