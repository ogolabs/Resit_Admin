# Resit — Internal Admin & Telemetry Dashboard Architecture

> **Resit Mission Control**: A dedicated, decoupled operations suite for end-to-end platform observability, merchant management, blockchain relayer supervision, infrastructure telemetry, and automated incident response.

---

## 1. Executive Summary & Topology

Resit operates as an npm monorepo with dedicated workspaces for specific domains. To protect the public customer receipt viewer (`/r/[receiptNumber]`) and cashier point-of-sale registers (`/workspace`) from administrative overhead and security risks, the admin dashboard is architected as an isolated Next.js application in `admin/`.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RESIT MONOREPO                                       │
│                                                                                        │
│   ┌────────────────────┐     ┌─────────────────────┐     ┌─────────────────────────┐   │
│   │     frontend/      │     │       landing/      │     │         admin/          │   │
│   │ (Merchants, POS,   │     │   (Marketing Site,  │     │ (System Telemetry,      │   │
│   │  Customer Receipts)│     │    Docs & Onboard)  │     │  Merchants, Relayers)   │   │
│   └─────────┬──────────┘     └─────────────────────┘     └────────────┬────────────┘   │
│             │                                                         │                │
│             └─────────────────────────┬───────────────────────────────┘                │
│                                       ▼                                                │
│                        SHARED CORE DATA & INFRASTRUCTURE                               │
│         MongoDB Atlas · Electroneum Smart Chain · Paystack / Stripe · Twilio / Zepto   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Architectural Rationale

1. **Security Isolation & Attack Surface Reduction**:
   - Administrative APIs, database inspection scripts, and merchant override controls are strictly decoupled from public consumer routes (`/r/[id]`, `/scan/[id]`).
   - If public routes experience traffic spikes or DDoS attempts, administrative monitoring and emergency controls remain completely accessible.
2. **Zero POS Disruption**:
   - Upgrades, database index maintenance, or telemetry feature deployments to `admin/` never trigger builds or potential runtime regressions for store registers.
3. **Monorepo Synergy**:
   - Configured as an npm workspace (`workspaces: ["frontend", "landing", "admin", "smart-contract"]`), allowing seamless reuse of TypeScript database types (`db-types.ts`), blockchain ABIs, and configuration constants.

---

## 2. Core Functional Modules

The admin platform is structured into five distinct operational portals:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                RESIT MISSION CONTROL                                   │
└───────────────────────────────────┬────────────────────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬────────────────┐
    ▼               ▼               ▼               ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐
│  Executive  │ │Infrastructure│ │  Merchant   │ │   Universal │ │   Incident     │
│    Pulse    │ │  Telemetry  │ │  Directory  │ │    Ledger   │ │   Stream &     │
│ (/dashboard)│ │(/infra)     │ │ (/merchants)│ │ (/records)  │ │  Diagnostics │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └────────────────┘
```

---

### Module 1: Executive Pulse & Platform Metrics (`/dashboard`)

The executive cockpit tracks macro-level business performance, monetization health, and retail volume across all registered merchants.

- **Financial & Monetization Metrics**:
  - **Monthly Recurring Revenue (MRR)**: Broken down by domestic (`NGN` via Paystack) and international (`USD` via Stripe).
  - **Universal Overage Revenue**: Total accrued excess operation charges (receipts & dispatches above plan tiers) and expansion charges (extra branches and cashier seats).
  - **Subscription Plan Distribution**: Interactive breakdown of Free, Starter 500, Growth 1,000, Business 2,500, and Scale 5,000 merchants.
  - **Payment Gateway Performance**: Real-time webhook success rates and settlement health for Paystack and Stripe.
- **Retail Sales & Platform Run-Rate**:
  - **Global Gross Merchandise Value (GMV)**: Total value of sales transactions recorded across the entire platform.
  - **Global Net Sales**: Sales after recorded discounts and voided transactions.
  - **Transaction Velocity**: Live chart of receipts issued per minute, hour, day, and month.
- **Logistics & Custody Overview**:
  - Total packages created (`PKG-XXXXXX`), currently in transit, delivered, and verified.
  - Platform dispute rate (`% of shipments flagged as Disputed`) with breakdown of top dispute reasons.

---

### Module 2: Infrastructure & System Telemetry (`/infrastructure`)

Provides deep operational diagnostics for the underlying databases, blockchain relayer engines, and third-party integrations.

#### 1. MongoDB Health & Telemetry
- **Connection Health**: Active connection pool size, readyState status, and connection lease latency.
- **Collection Volume**: Document counts and storage footprint for `users`, `receipts`, `shipments`, `branches`, and `teamMembers`.
- **Query Latencies**: Real-time monitoring of average read/write durations.
- **Index Health**: Detection of unindexed queries, collection scans (`COLLSCAN`), or indexing bottlenecks.

#### 2. Electroneum Relayer & Ledger Engine
- **Relayer Wallet Monitor**:
  - Live ETN gas balance of `relayerAccount`.
  - Automated threshold alerts when ETN balance drops below minimum reserves (e.g., `< 50 ETN`).
- **Nonce Synchronization State**:
  - Comparison of current EVM account nonce (`getTransactionCount`) vs. contract witness nonce (`userNonces`).
- **Unanchored Queue Depth**:
  - Count of finalized receipts and dispatches awaiting on-chain confirmation.
- **Autonomous Reconciler Control**:
  - Real-time status of the background reconciler (`reconcilePendingAnchors`).
  - Manual on-demand trigger to force an immediate ledger sweep.
  - Execution history log displaying processed, anchored, and failed counts.
- **RPC Benchmark**:
  - Latency and uptime monitoring across primary and fallback RPC endpoints (Official Electroneum vs. Ankr).

#### 3. Third-Party Integration Telemetry
- **Twilio**:
  - SMS delivery rate, verification OTP completion ratios, carrier error codes, and account balance.
- **ZeptoMail**:
  - Staff invitation email delivery rate, bounce notifications, and delivery latency.
- **Web3Auth**:
  - Authentication success rates across social, email OTP, and SMS login channels.

---

### Module 3: Merchant & Store Directory (`/merchants`)

Tools for inspecting individual store setups, troubleshooting cashier issues, and auditing merchant organizations.

- **Universal Merchant Directory**:
  - Search by Merchant Address (`0x...`), Store Display Name, Contact Email, Phone Number, or Business Handle (`@handle`).
  - Filter by Country (Nigeria vs. International), Subscription Tier, Operating Mode (`sales`, `dispatch`, `hybrid`), and Account Status.
- **Store Deep Inspector (`/merchants/[id]`)**:
  - **Profile Summary**: Full business identity, logo, verified contact channels, tax IDs, and bank account details.
  - **Branch Topology**: Configured outlets, assigned branch managers, active cashier counts, and physical addresses.
  - **Team Registry**: Roster of active and suspended team members, assigned roles (Branch Manager vs. Sales Rep), invitation dates, and last login timestamps.
  - **Quota & Billing Snapshot**: Real-time counter of `operationsThisMonth` vs. `baseLimit`, rollover quota, and pending overage fees.
- **Administrative Actions**:
  - Emergency account unlock / suspension.
  - Manual quota reconciliation / plan override.
  - Testnet vs. Mainnet credential verification.

---

### Module 4: Global Ledger & Custody Inspector (`/records`)

Centralized search and audit viewer across every transaction processed on the Resit network.

#### 1. Universal Receipt Registry (`/records/receipts`)
- Search across all merchants by `receiptNumber`, `receiptHash`, Customer Phone, or Cashier Address.
- **Audit Detail View**:
  - Itemized product line items with unit prices and totals.
  - Payment method (Cash, Bank Transfer, POS/Card, Credit) and settlement history for credit sales.
  - Permanent actor snapshots: `{ issuedBy, settledBy, voidedBy }`.
  - Cryptographic verification seal and Electroneum block explorer link.

#### 2. Universal Package & Dispatch Registry (`/records/shipments`)
- Search by Package Code (`PKG-XXXXXX`), tracking code, or shipper address.
- **Custody Timeline Viewer**:
  - Full state progression: `Created` &rarr; `InTransit` &rarr; `Delivered` &rarr; `Verified` / `Disputed`.
  - Operator stamps, timestamps, and on-chain transaction hashes for each event.
  - Dispute resolution viewer: inspect delivery proof timestamps, scratch-off verification status, and recorded customer notes.

---

### Module 5: Incident Stream & Error Diagnostics (`/incidents`)

Proactive monitoring and real-time alerts for system bugs, security anomalies, and fraud attempts.

- **Real-Time Error Stream**:
  - Live log of unhandled API route exceptions (500 errors).
  - Failed Paystack/Stripe webhook delivery attempts.
  - Relayer transaction revert reasons (e.g., gas spikes, contract reverts).
- **Security & Fraud Detection**:
  - **Brute-Force Detection**: Multiple failed staff 6-digit PIN attempts on `/workspace/login`.
  - **Void Spike Anomaly**: Flagging cashiers or branches with unusually high receipt void ratios.
  - **Rate Limit Triggers**: IP addresses hitting public scan routes (`/r/[id]`, `/scan/[id]`) above safety limits.

---

## 3. Security, Authentication & Access Control

Admin access is strictly gated with multiple defensive layers:

```
┌────────────────────────────────────────────────────────┐
│                     ADMIN REQUEST                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ 1. IP / Origin Guard      │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ 2. Admin Email Whitelist  │
              │    (ADMIN_EMAILS)         │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ 3. Encrypted HMAC Session │
              │    (8-Hour Expiry Cookie) │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ 4. Admin Audit Logger     │
              │    { action, admin, time }│
              └───────────────────────────┘
```

1. **Isolated Authentication Flow**:
   - Admins authenticate via a dedicated email OTP or passkey flow completely separate from merchant Web3Auth.
   - Authorized admin emails must exist in the environment whitelist (`ADMIN_EMAILS="ops@resit.co,cto@resit.co"`).
2. **Stateless Encrypted Sessions**:
   - Generates an HTTP-only, secure, same-site `admin_session` cookie signed with `ADMIN_SESSION_SECRET` (strict 8-hour expiry).
3. **Immutable Admin Audit Logging**:
   - Any state-altering action performed by an administrator (quota reset, store suspension, relayer sweep) writes an immutable record to the `admin_audit_logs` collection:
     ```ts
     interface IAdminAuditLog {
       adminEmail: string;
       action: "quota_reset" | "merchant_suspend" | "reconcile_sweep" | "plan_override";
       targetId: string;
       metadata?: Record<string, unknown>;
       ipAddress: string;
       userAgent: string;
       timestamp: Date;
     }
     ```
4. **Read-Only by Default**:
   - Lookups and telemetry are strictly read-only. Mutating actions require explicit two-step confirmation modals with required operational notes.

---

## 4. UI Design System & Aesthetic Standards

Adheres strictly to the fintech-grade design standards defined in `BRANDING.md` and `AGENTS.md`:

- **Design Philosophy**: Crisp, calm, high-density fintech operations interface (reminiscent of Stripe Dashboard and Linear).
- **Color Palette**:
  - Light mode: Solid surfaces (`bg-white`, `bg-slate-50`), subtle borders (`border-slate-200/80`).
  - Dark mode: Fintech dark slate (`bg-slate-950`, `bg-slate-900/80`), subtle borders (`border-slate-800/80`).
  - Brand accents: Resit Deep Navy, Brand Blue (`#2563EB`), Emerald for success/verified, Rose for errors/disputes.
  - **Strict Prohibitions**: Zero gradients (`bg-linear-to-*`), zero heavy drop shadows (`shadow-2xl`), zero amber colors, zero emojis.
- **Typography & Iconography**:
  - Typography: Clean display typography (`Outfit` / `Inter`), high-density tabular numbers (`font-mono` for hashes, addresses, and timestamps).
  - Icons: Exclusive use of `lucide-react` (e.g. `Activity`, `Server`, `ShieldCheck`, `ShoppingBag`, `Truck`, `AlertTriangle`). Zero sparkles or Unicode emojis.
- **Mobile Responsiveness**:
  - Full touch-friendly responsiveness down to 375px width, enabling on-call emergency monitoring from a smartphone.

---

## 5. Implementation Roadmap

### Phase 1: Workspace Scaffold & Admin Auth Gate
- Initialize `admin/` workspace in monorepo root (`npm init -w admin`).
- Configure Next.js 16 (App Router), TypeScript (`strict: true`), Tailwind CSS v4, and Lucide icons.
- Build the secure Admin Auth Gate: email OTP login, session cookie signing, and route protection middleware.
- Create the core layout shell: navigation sidebar, status badge header, theme toggle.

### Phase 2: Executive Pulse & Infrastructure Telemetry
- Build `/dashboard`: Real-time platform MRR, sales velocity, plan breakdown, and volume counters.
- Build `/infrastructure`:
  - MongoDB connection pool stats, collection counts, and query latency gauges.
  - Relayer ETN balance monitor, nonce sync status, and unanchored queue gauge.
  - Autonomous reconciler trigger button and execution history log.
  - Twilio, ZeptoMail, Paystack, and Stripe service status cards.

### Phase 3: Universal Merchant & Records Directory
- Build `/merchants`: Searchable merchant catalog with deep store inspector (branches, staff, quota usage, overrides).
- Build `/records/receipts`: Universal receipt lookup with line-item inspector and audit snapshots.
- Build `/records/shipments`: Universal custody timeline and dispute inspector.

### Phase 4: Incident Stream & Automated Alerting
- Build `/incidents`: Real-time error feed, failed webhook retry logs, and security anomaly monitors.
- Implement immutable admin audit logging for all mutating operations.
