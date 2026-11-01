# 👻 GhostQueue

**Smart Queue Management & Waiting-Time Prediction Platform**

GhostQueue is a modern, real-time queue management system featuring sub-second telemetry, dynamic waiting-time prediction via PostgreSQL analytics, an operator counter terminal, an executive admin command center, and a public TV display wallboard.

---

## 🚀 Key Features

1. **Digital Queue Joining & Token Generation**
   - Instant guest or registered visitor check-in across multiple departments (Admissions, Accounts, Examinations, IT Helpdesk, Student Welfare).
   - Atomic database sequence generation preventing collision under high concurrency.
   - Prevention of duplicate active tokens per service desk.

2. **Sub-second Waiting-Time Prediction Engine**
   - Live predictive formula grounded in historical rolling service duration, active counter count, and queue rank.
   - Precision telemetry showing estimated wait time with confidence interval.
   - Real-time updates delivered via WebSockets (`Socket.io`) on every queue state change.

3. **Live Visitor Queue Tracker**
   - Real-time progress bar tracking rank in line (e.g. `#2 in line`, `1 person ahead`).
   - Push notifications and browser audio chime alert when token is called.
   - Interactive timeline audit of events (Joined -> Called -> In Service -> Completed).
   - One-click token cancellation or pass sharing.

4. **Operator Counter Terminal**
   - Counter status controls (Open / Break / Closed).
   - "Call Next Customer" trigger with instant visitor alert broadcast.
   - Live service elapsed stopwatch timer.
   - Service notes logging, customer skip/no-show handler.
   - Live department queue monitor.

5. **Executive Admin Command Center**
   - KPI metrics: Total visitors today, average wait times, average service duration, and prediction accuracy.
   - Interactive charts powered by Recharts (hourly throughput, service wait times).
   - Live queue table with filtering by service, status, and search.
   - Counter and operator assignment management.
   - One-click CSV report export.

6. **Public Waiting Hall TV Wallboard**
   - High-contrast, large-format kiosk view tailored for lobby TV monitors.
   - Large "Now Serving" counter cards with flashing announcement alerts.
   - "Up Next" queue status strip for all active departments.
   - Live digital clock and fullscreen mode.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, PostgreSQL, Socket.io, JWT Authentication, bcryptjs.
- **Frontend:** React 19, Vite, Recharts, Lucide Icons, Canvas-Confetti, Web Audio API.
- **Database:** PostgreSQL (with transaction locking `FOR UPDATE` for race-condition prevention).

---

## 🏃 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally on port 5432)

### 2. Backend Setup
```bash
cd backend
npm install
# Ensure PostgreSQL database 'ghostqueue' is created:
# createdb ghostqueue
npm run migrate
npm run seed
npm run test     # Verify all 12 test suites pass
npm run dev      # Runs backend server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Runs Vite development server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@ghostqueue.io` | `admin123` |
| **Operator** | `operator1@ghostqueue.io` | `operator123` |
| **Visitor** | `visitor@ghostqueue.io` | `visitor123` |

*Note: You can switch between demo roles instantly using the top navigation profile dropdown in the UI.*

