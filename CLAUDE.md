# Ryan's Rotas

## Project Overview
A mobile-friendly static web app for managing 24-hour care rotas. No backend — localStorage for data, JSON backup, client-side Excel/PDF export.

## Tech Stack
- Vanilla HTML/CSS/JavaScript (ES modules)
- SheetJS (xlsx) for Excel export
- jsPDF + AutoTable for PDF export
- No build step — just serve the files

## Running Locally
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Running Tests
Open `tests/test-runner.html` in a browser (via the local server).

## Project Structure
```
index.html              # Entry point
src/css/styles.css      # All styles
src/js/app.js           # Routing and navigation
src/js/data.js          # Data layer (localStorage)
src/js/shiftTemplates.js # Shift definitions
src/js/workers.js       # Workers CRUD screen
src/js/yearPlanner.js   # Year calendar screen
src/js/monthlyRota.js   # Monthly rota screen
src/js/prePopulate.js   # Availability form
src/js/autoFill.js      # Auto-fill algorithm
src/js/hoursDashboard.js # Hours tracking
src/js/export.js        # Excel, PDF, backup
```

## Key Design Decisions
- No framework — keeps it simple, no build step
- localStorage — single user, no server needed
- Fixed teams: Away team (Andrew + Kapil) auto-assigned, Home team cycled with constraints
- 3-day consecutive limit for home workers (soft — can override manually)
- Contract types: maximum, minimum, away-linked, bank, adhoc
