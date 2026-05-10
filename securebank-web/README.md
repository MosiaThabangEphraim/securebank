# SecureBank

A full-stack online banking web application with customizable fraud detection rules, real-time alerts, and complete transaction management — built with React, TypeScript, and Supabase.

---

## Key Feature — Customizable Fraud Detection

SecureBank's core differentiator is its **configurable fraud flagging engine**. Users can define their own fraud rules based on:

- Transaction amount thresholds
- International transaction flags
- Velocity checks (too many transactions in a short period)
- Specific merchant categories
- Custom combinations of conditions

When a transaction matches a fraud rule, it is automatically flagged, a fraud case is opened, the transaction is blocked or marked disputed, and the user is alerted in real time — with an audio cue and an in-app notification.

Flagged transactions go through a **Review Zone** where they can be approved or rejected, keeping the user in full control.

---

## Features

- **Fraud Detection Engine** — Configurable rules that evaluate every transaction in real time
- **Review Zone** — Approve or reject flagged transactions before they are processed
- **Dispute Portal** — Manage disputed transactions and track their resolution
- **Real-time Alerts** — In-app notification system with unread counts and grouping by date
- **Transaction Management** — Send money, internal transfers, view full history with filters
- **Card Management** — View, freeze, and delete cards
- **Account Management** — Multiple accounts with running balances
- **Beneficiary Management** — Save and manage payment recipients
- **Login History** — Track every sign-in attempt on the account
- **Security Settings** — Change email, change password (with re-authentication), update profile picture
- **Analytics** — Spending overview and transaction trends

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend & Auth | Supabase (PostgreSQL, Row Level Security, Realtime) |
| Icons | Lucide React |
| Routing | React Router v6 |
| Notifications | React Hot Toast |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/SecureBank.git
cd SecureBank/securebank-web
npm install
```

### Environment Variables

Create a `.env` file in the `securebank-web` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Screenshots

> _Coming soon_

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/      # Transaction modal, fraud alert banner
│   ├── layout/         # Sidebar, TopBar, AppShell
│   └── shared/         # Reusable modals and UI components
├── contexts/           # Auth context
├── hooks/              # useAuth, useTransactions, useAlerts, etc.
├── lib/                # Supabase client, utility functions
├── pages/              # All route-level pages
└── types/              # TypeScript interfaces
```

---

## Author

**Mosia Thabang Ephraim**  
Third-year Computer Science student  
[GitHub](https://github.com/YOUR_USERNAME)
