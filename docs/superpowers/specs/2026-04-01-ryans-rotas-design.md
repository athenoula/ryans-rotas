# Ryan's Rotas — Design Spec

## Overview

A mobile-friendly static web app for managing 24-hour care rotas. Ryan receives care in two modes — Home and Away — each with distinct shift patterns. The app lets him mark Home/Away days on a yearly calendar, auto-generates monthly rotas with worker assignments, tracks contracted hours, and exports finished rotas as Excel or PDF for the care company to sign off.

**Architecture:** Single-page web app, no backend. Data stored in browser localStorage with JSON export/import for backup. Excel and PDF generated client-side.

## Care Packages

### Home (at home)
4 shifts per day, 2 workers during the day + 2 waking night workers:

| Shift | Default Time | Hours |
|-------|-------------|-------|
| Short Day | 09:00–18:00 | 9 |
| Long Day | 09:00–21:00 | 12 |
| Waking Night | 21:00–09:00 | 12 |
| Waking Night | 21:00–09:00 | 12 |

### Away (away from home)
4 shifts per day, 2 workers doing day + sleeping night:

| Shift | Default Time | Hours |
|-------|-------------|-------|
| Day Shift | 09:00–23:00 | 14 |
| Day Shift | 09:00–23:00 | 14 |
| Sleep Night | 23:00–09:00 | 10 |
| Sleep Night | 23:00–09:00 | 10 |

### Transition Days
Occasionally a day transitions between modes (e.g. arriving home mid-day). On these days Ryan manually adjusts shift times — the app allows time overrides on any shift slot.

## Data Model

### Worker
```
{
  id: string,
  name: string,
  team: "home" | "away" | "bank" | "adhoc",
  contractType: "maximum" | "minimum" | "away-linked" | "bank" | "adhoc",
  monthlyHours: number | null,       // null for bank/adhoc
  allowedShiftTypes: string[],        // which shift types they can work
  active: boolean
}
```

### Worker Contract Types
- **Maximum** (e.g. Karen Hughes, Alayo Obafemi — 150 hrs/month): Warn when approaching or exceeding target. Hours spread across Home days only — they don't work when Ryan is Away.
- **Minimum** (e.g. Kapil Kumar Kumar — 150 hrs/month base): Warn when under target. Happy to exceed contracted hours. If Away shifts aren't available, needs A/L or Home shifts to fill the month.
- **Away-linked** (e.g. Andrew Cockbill): No fixed monthly target. Hours are entirely determined by how many Away days are scheduled. Dashboard shows total hours worked but no over/under warnings.
- **Bank** (e.g. Karen Cockbill): No contracted hours. Regular worker who fills gaps as needed.
- **Ad hoc** (e.g. Ankita, Adekemi, Paige, Imogen): Temporary staff. Ryan enters their availability per month. No contract.

All contract details are configurable per worker in the Workers screen.

### Monthly Availability (Pre-Populate Form)
Before running auto-fill, Ryan enters per-worker availability for the month:
```
{
  workerId: string,
  month: string,                      // "2026-04"
  annualLeaveDays: number[],          // day numbers [7, 8, 9, ...]
  preferredShifts: [                  // shifts they want
    { day: number, shiftSlot: number }
  ],
  blockedShifts: [                    // shifts they can't do
    { day: number, shiftSlot: number }
  ]
}
```

### Day Plan
```
{
  date: string,                       // "2026-04-01"
  mode: "home" | "away",
  shifts: [
    {
      slotIndex: 0-3,
      shiftType: string,              // "shortDay", "longDay", "wakingNight", "dayShift", "sleepNight"
      startTime: string,              // "09:00" (defaults from template, overridable)
      endTime: string,                // "18:00"
      hours: number,                  // calculated from times
      assignedWorker: string | null,  // worker ID or null for "TO COVER"
    }
  ]
}
```

### Monthly Rota
```
{
  month: string,                      // "2026-04"
  days: DayPlan[],
  version: string,                    // "V1", "V2" etc.
  status: "draft" | "final"
}
```

### Year Calendar
```
{
  year: number,
  days: {
    [date: string]: "home" | "away"   // "2026-04-01": "home"
  }
}
```

## Screens

### 1. Year Planner
A 12-month calendar view. Each day is tappable to toggle between Home (blue) and Away (amber). Shows monthly summaries (X Home days, Y Away days). This is the starting point — Ryan maps out the year, then generates monthly rotas from it.

### 2. Monthly Rota
The main working screen. A table with columns:

| Date | Short / Day | Long / Day | Waking / Sleep | Waking / Sleep |

- All days in chronological order
- Each date cell shows the day number, weekday, and a HOME (blue) or AWAY (amber) badge
- Each shift cell shows the time range and assigned worker name
- "TO COVER" gaps shown in red
- Home rows have a blue-tinted background, Away rows amber-tinted
- Tap a worker name to reassign from a dropdown of eligible workers
- Tap a time to override the default hours
- Month navigation arrows at the top with Home/Away day counts
- **Auto-Fill button** at the top generates all shifts and assignments

### 3. Pre-Populate Form
Accessed before running auto-fill (or from a button on the Monthly Rota screen). For each worker:
- Calendar-style day picker to mark annual leave days
- Shift preference selector: pick specific days and shift slots they want
- Blocked shift selector: pick specific days and shift slots they can't do

### 4. Hours Dashboard
Table showing all workers for the selected month:

| Worker | Team | Contract | Target Hrs | Actual Hrs | Weekly Avg | Status |

- **Status** colour-coded:
  - Green: on track
  - Amber: approaching limit (maximum) or under target (minimum)
  - Red: over limit (maximum) or significantly under (minimum)
- Updates live as the rota is edited
- Filterable by team

### 5. Workers
CRUD screen for managing the team:
- Add/edit/deactivate workers
- Set: name, team, contract type, monthly hours target, allowed shift types
- Deactivated workers hidden from assignment but kept for historical data

### 6. Export
- **Excel export**: formatted to match Ryan's current spreadsheet layout — columns for Date, Shift, Hours, Service Type, Name. Includes a summary table with per-worker totals matching the format in the existing rota spreadsheets.
- **PDF export**: clean printable version of the monthly rota with the same data.
- Both generated client-side (SheetJS for Excel, jsPDF for PDF).

### 7. Settings / Backup
- **JSON export**: download all app data (workers, year calendar, all rotas) as a single JSON file
- **JSON import**: restore from a backup file
- **Shift template config**: edit default shift times if they ever change

## Auto-Fill Algorithm

When Ryan hits "Auto-Fill Shifts" for a month:

1. **Read Year Planner** — get Home/Away status for each day of the month.

2. **Generate shift slots** — create 4 slots per day using the correct template (Home or Away shifts with default times).

3. **Apply pre-populate data:**
   - Mark A/L days — worker unavailable on those days.
   - Lock in preferred shifts — assign these first.
   - Block out blocked shifts — worker cannot be assigned to these.

4. **Assign Away days** — Andrew Cockbill and Kapil Kumar Kumar automatically fill all 4 Away slots (2 day + 2 sleep night each).

5. **Assign Home days** — cycle through available workers:
   - Short Day and Long Day: Home team + Bank workers
   - Waking Nights: Bank + Ad hoc workers
   - Selection order: prefer workers who are further from their hours target
   - **3-day consecutive limit**: no Home worker gets more than 3 days in a row (soft limit — Ryan can manually override to 4 after auto-fill)

6. **Track running hours** — as each assignment is made, update the worker's monthly total. Skip workers approaching their maximum (for "maximum" contract types).

7. **Leave "TO COVER"** — any slot that can't be filled within constraints gets marked "TO COVER" in red.

8. Ryan reviews and manually tweaks assignments, times, or overrides as needed.

## Tech Stack

- **HTML/CSS/JavaScript** — single-page app, no framework (keeps it simple and fast)
- **localStorage** — persistent data storage in the browser
- **SheetJS (xlsx)** — client-side Excel generation
- **jsPDF** — client-side PDF generation
- **Responsive CSS** — mobile-first, works on phone and desktop
- Bottom tab navigation on mobile (Year | Rota | Hours | Workers), top nav on desktop

## File Structure
```
ryans-rotas/
  index.html              # Single entry point
  src/
    css/
      styles.css          # All styles, mobile-first responsive
    js/
      app.js              # App initialisation, routing, navigation
      data.js             # Data model, localStorage read/write, JSON import/export
      workers.js          # Workers screen logic
      yearPlanner.js      # Year planner screen logic
      monthlyRota.js      # Monthly rota screen, shift editing
      prePopulate.js      # Pre-populate form (A/L, preferences, blocks)
      autoFill.js         # Auto-fill algorithm
      hoursDashboard.js   # Hours tracking screen
      export.js           # Excel and PDF generation
    lib/
      xlsx.mini.min.js    # SheetJS library
      jspdf.min.js        # jsPDF library
```

## Current Workers (Initial Data)

| Name | Team | Contract Type | Monthly Hours |
|------|------|--------------|---------------|
| Karen Hughes | Home | Maximum | 150 |
| Alayo Obafemi | Home | Maximum | 150 |
| Andrew Cockbill | Away | Away-linked | — (hours determined by Away days) |
| Kapil Kumar Kumar | Away | Minimum | 150 |
| Karen Cockbill | Bank | Bank | — |
| Ankita | Ad hoc | Ad hoc | — |
| Adekemi | Ad hoc | Ad hoc | — |
| Paige | Ad hoc | Ad hoc | — |
| Imogen Parkinson | Ad hoc | Ad hoc | — |

## Export Format

The Excel export matches Ryan's existing rota format:

| Date | Shift | Hours | Service Type | Name |
|------|-------|-------|-------------|------|
| 1st | 0900-1800 | 9 | Short Day | TO COVER |
| | 0900-2100 | 12 | Long Day | Karen Hughes |
| | 2100-0900 | 12 | Waking Night | Alayo Obafemi |
| | 2100-0900 | 12 | Waking Night | Ankita |

Plus a summary table at the bottom with per-worker totals broken down by shift type (Long, Short, Night, Away Day, Night Visit).
