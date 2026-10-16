# Northeastern Airways V3

Northeastern Airways V3 is an airline-booking demonstration that began as a university SQL database coursework project in 2025. The original Node.js application evolved into V2 with PostgreSQL and Docker, and this repository contains V3: a further-developed version with a refined interface, an interactive flight map, and a connected passenger booking and trip-management flow.

Search UK routes, reserve and confirm a demonstration trip, manage passenger bookings, and inspect database-backed flights on the map. The project retains its database-coursework foundations while exploring a more complete application experience.

This is a demonstration, not an operational airline service. Flights are fictional PostgreSQL records. Map positions are simulated in development and timetable-based estimates in production, not live aircraft tracking. Booking confirmation is always simulated: no card information is collected, no money is charged, and no real tickets are issued, regardless of the application environment.

GitHub hosts this project's source code. The instructions below run the application on your own computer; uploading the repository does not automatically deploy the application.

## Contents

- [Project history](#project-history)
- [Screenshots](#screenshots)
- [Requirements](#requirements)
- [First-time setup](#first-run-on-another-machine)
- [Restart and update the database](#run-again-and-keep-flights-current)
- [Demo accounts](#demo-accounts)
- [Try a booking](#try-a-booking)
- [Stop safely](#stop-and-preserve-local-data)
- [Back up and restore](#database-backup-and-restore)
- [Build and test](#checks)
- [Troubleshooting](#troubleshooting)
- [Publish the repository](#publish-the-repository-on-github)
- [Project structure](#structure)

## Project History

| Version | Background and development |
| --- | --- |
| **V1 (2025)** | The original Node.js application, created for university SQL database coursework. |
| **V2** | Revised to use PostgreSQL and Docker for the database environment. |
| **V3 (this repository)** | Builds on V2 with a more polished interface, improved flight-map interactions, a connected passenger booking/dashboard flow, and documented setup with a rolling demonstration timetable. |

V3 is a continuation of the original coursework project, not a separate commercial airline system. The version labels describe the project's development stages; they do not change the demonstration-only status of its flights and payments.

## Screenshots

### Homepage

![Northeastern Airways homepage with the flight search form](docs/screenshots/homepage.png)

### Flight Search Results

![Flight search results showing routes, departure times and fares](docs/screenshots/flight-search.png)

### Interactive Flight Map

![UK flight map with a selected flight and its details panel](docs/screenshots/flight-map.png)

### Booking Review

![Booking review with the selected itinerary and fare summary](docs/screenshots/booking-review.png)

### My Trips

![Passenger dashboard showing upcoming demonstration trips](docs/screenshots/my-trips.png)

### Sign In

![Northeastern Airways sign-in page](docs/screenshots/sign-in.png)

### Mobile Layout

<img src="docs/screenshots/mobile.png" alt="Northeastern Airways on mobile" width="300">

## Requirements

- Node.js 20 or newer, matching the repository's engine requirement.
- pnpm 9.15.0, matching `packageManager` in `package.json`.
- Docker with Docker Compose, running before database setup.
- Git to clone the repository.

PostgreSQL runs in Docker; the API and frontend run locally with Node. You do not need a separate PostgreSQL installation. Ports 5433, 3000 and 5173 must be available. The map needs internet access for OpenStreetMap tiles.

If pnpm is not installed, install the project's pinned version:

```sh
npm install --global pnpm@9.15.0
```

Check the tools before continuing:

```sh
node --version
pnpm --version
docker --version
docker compose version
git --version
```

Use Docker Desktop on Windows/macOS, or a Docker Engine installation with Compose on Linux. Start Docker and make sure it is running Linux containers for the PostgreSQL image.

## First Run On Another Machine

Clone the repository:

```sh
git clone https://github.com/cloutician/northeastern_airways.git
cd northeastern_airways
```

All remaining commands run from the repository root, the directory containing `package.json` and `docker-compose.yml`.

These setup commands work in PowerShell and Unix shells. On Windows, use PowerShell rather than Command Prompt for the `cp` commands:

```sh
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d --wait postgres
pnpm db:migrate
pnpm db:seed
pnpm dev:stack
```

Copy the environment templates only on a fresh clone; do not overwrite an existing local configuration. The example database URL uses the local Docker instance on port 5433. Real credentials and `.env` files must not be committed.

Keep that terminal open while using the application. Wait for both the API and Vite startup messages, then open:

| Service | Address |
| --- | --- |
| Web application | http://localhost:5173/ |
| API health check | http://localhost:3000/health |
| PostgreSQL connection | `localhost:5433`, database `northeastern_airways` |

The health check should return `{"ok":true}`. `docker compose ps` should show PostgreSQL as healthy. Docker only starts the database; `pnpm dev:stack` starts the API and website.

### Environment Configuration

The templates provide a working local demo configuration:

| File | Setting | Local value/purpose |
| --- | --- | --- |
| `apps/api/.env` | `NODE_ENV` | `development` for local setup and demo seeding; booking confirmation remains simulated in every environment |
| `apps/api/.env` | `PORT` | `3000` |
| `apps/api/.env` | `DATABASE_URL` | Docker PostgreSQL at `localhost:5433`; demo user/password `postgres`/`postgres` |
| `apps/api/.env` | `CORS_ORIGINS` | `http://localhost:5173` |
| `apps/api/.env` | `JWT_SECRET` | Development-only placeholder; use a unique random secret for any deployment |
| `apps/web/.env` | `VITE_API_URL` | `http://localhost:3000`; Vite's backend proxy target during development, direct browser API URL in production builds |

No Stripe or other payment-provider SDK is used. Legacy `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables are ignored and cannot enable real payments. Do not enter real card details or payment credentials anywhere in this demo. Restart the development processes after changing environment files.

The historical `/api/bookings/:id/confirm-payment` endpoint only confirms an authenticated passenger's own demo booking. It accepts no card details or payment fields. `/api/payments` explicitly reports simulated mode, no card collection and no charges. The retired `/api/payments/webhook` endpoint always returns HTTP 410 without parsing events or modifying records.

The first full seed creates airports, routes, aircraft, seats, demo accounts, and a timetable for the next 30 UK calendar dates, including today. No database dump from the original developer's computer is required. For example, running setup in December generates December dates, not a fixed October timetable.

The full seed also sets demo account passwords. Use it for initial setup, not routine date refreshes.

## Run Again And Keep Flights Current

After stopping the local development processes, restart with:

```sh
docker compose up -d --wait postgres
pnpm dev:stack
```

`dev:stack` builds the shared domain package, applies pending database migrations, safely extends the timetable to the next 30 days, then starts both the API and frontend. Existing flights, bookings, fares, users, and personnel schedule statuses are preserved by the timetable refresh. Duplicate refreshes do not create duplicate flights or schedules.

For a database-only refresh while the app is already running:

```sh
pnpm db:refresh
```

This refresh runs when requested or at startup; it is not a background scheduled task. If the app stays running for more than 30 days, run the refresh again. Seed generation is disabled in production; a hosted demonstration needs a separately maintained timetable and deployment-specific credentials.

To update an existing checkout after pulling new code:

```sh
git pull
pnpm install --frozen-lockfile
docker compose up -d --wait postgres
pnpm dev:stack
```

## Demo Accounts

All three accounts initially use password `Passw0rd!`:

| Role | Email |
| --- | --- |
| Passenger | passenger@northeastern-airways.test |
| Administrator | admin@northeastern-airways.test |
| Personnel | personnel@northeastern-airways.test |

These are public demonstration credentials, not deployment credentials. Do not expose a database containing these accounts as a real service. You can also register a new passenger account locally.

## Try A Booking

1. Open the application and choose **Sign in**, or sign in when prompted during booking.
2. Use the passenger demo account or register your own local passenger account.
3. Search for a route, for example Newquay (`NQY`) to Heathrow (`LHR`), on tomorrow's date. Seeded coverage includes today and the following 29 days.
4. Select an available outbound flight and, if using a return trip, a compatible return flight.
5. Choose **Review booking**, check the itinerary and fare, then choose **Reserve trip**.
6. Choose **Confirm demo booking**. This changes the demonstration booking status without requesting payment information, charging money or issuing a real ticket.
7. Open **My trips** to inspect the booking, resume pending checkout, or cancel a future trip.

The development map displays database-backed demo flights with simulated motion. It can show different flights from the date selected in the booking form; selecting a map plane inspects it, rather than booking it.

## Stop And Preserve Local Data

Stop the API/frontend with Ctrl+C in their terminal. Stop PostgreSQL with:

```sh
docker compose stop postgres
```

The current PostgreSQL image uses an anonymous Docker data volume. Normal stop/start and Compose's normal container recreation retain it, but `docker compose down` removes the container association and a subsequent `up` may use a new empty volume. Do not use `down`, `down -v`, volume pruning, or database-reset commands as routine shutdown commands. Back up important data before removing or replacing containers. A named-volume migration is recommended before a long-lived deployment; it has not been performed on the existing local database.

`pnpm db:reset`, `pnpm db:migrate:undo`, and `pnpm db:seed:undo` are destructive development tools, not update commands.

## Database Backup And Restore

Seeds reproduce the demonstration network and rolling timetable. They do not copy personal accounts, bookings, or staff changes from another installation. Back up the database when you need those records too.

With PostgreSQL running, create a backup. Use a new filename for each backup if you need to retain previous copies:

```sh
node -e "require('node:fs').mkdirSync('backups', { recursive: true })"
docker compose exec -T postgres pg_dump -U postgres -d northeastern_airways --format=custom --no-owner --no-privileges --file=/tmp/northeastern-airways.dump
docker compose cp postgres:/tmp/northeastern-airways.dump backups/northeastern-airways.dump
```

The archive is written inside the container and then copied out, avoiding binary-output redirection differences between shells. `backups/` is excluded from Git. Archives can contain personal data and password hashes; keep them private and transfer them securely, not through a public GitHub repository.

To restore on a different machine, first install dependencies, create the environment files and start PostgreSQL, but **do not run migrations, seeds, or the application against the target database yet**. The target must be an empty database, and the backup must be trusted. Do not use these restore commands against a populated database:

```sh
docker compose cp backups/northeastern-airways.dump postgres:/tmp/northeastern-airways.dump
docker compose exec -T postgres pg_restore -U postgres -d northeastern_airways --no-owner --no-privileges --single-transaction --exit-on-error /tmp/northeastern-airways.dump
pnpm dev:stack
```

The archive includes the schema and migration history. Startup applies any newer migrations and extends the demo timetable without replacing restored bookings. The transaction prevents a partially applied restore if PostgreSQL reports an error. Do not delete an existing database just to make space for a restore; retain a separate backup and plan that migration explicitly.

## Checks

```sh
pnpm build
pnpm test
```

API integration tests require a migrated, seeded PostgreSQL database. They create temporary test fixtures; use a development database, not a production database. Frontend tests cover geometry, route rendering, and details-panel output; they do not replace browser visual testing.

The build writes generated output to each package's `dist/` directory. It does not deploy the application. Continue using `pnpm dev:stack` for local demonstration. A production build changes the map mode, and a production API disables demo seeding, but booking confirmation remains strictly simulated in every environment.

### Command Reference

| Command | Purpose |
| --- | --- |
| `docker compose up -d --wait postgres` | Start the local database and wait until it is ready |
| `pnpm dev:stack` | Build shared code, migrate/refresh the database, and start API plus web |
| `pnpm db:migrate` | Apply pending schema migrations without generating data |
| `pnpm db:seed` | Initialize demonstration data and accounts; first-time setup only |
| `pnpm db:refresh` | Apply migrations and append missing flights/schedules for 30 dates |
| `pnpm build` | Type-check and build all application packages |
| `pnpm test` | Run frontend and database-backed API tests |
| `pnpm --filter @northeastern-airways/web test` | Run frontend tests without needing PostgreSQL |
| `docker compose ps` | Inspect database status |
| `docker compose logs --tail=100 postgres` | Inspect recent database logs |
| `docker compose stop postgres` | Stop the database without removing its container |

## Troubleshooting

### A Tool Is Not Found

Check the versions listed under [Requirements](#requirements). After installing Node, Git or Docker, open a new terminal so it picks up the updated executable paths. If `pnpm` is missing, run the pinned installation command above. If `docker compose` is unavailable, install a Docker distribution that includes the Compose plugin.

### Docker Cannot Connect Or PostgreSQL Is Unhealthy

Start Docker first, then run:

```sh
docker compose ps
docker compose logs --tail=100 postgres
```

Wait for PostgreSQL to be healthy before migrating or seeding. If the `--wait` option is not recognized, use a Compose installation that supports it; do not replace the readiness check with an arbitrary short delay.

### Database Connection Refused Or Wrong Password

The local API connects to port **5433**, not 5432. Port 5432 may belong to an unrelated PostgreSQL installation. Check `apps/api/.env` against the example and the running Docker configuration. The default local connection is:

```text
postgresql://postgres:postgres@localhost:5433/northeastern_airways
```

Changing the PostgreSQL password in Compose does not automatically change the password inside an already initialized data volume. Do not erase the volume to resolve a mismatch if it contains records you need to keep.

### An Environment Variable Is Missing

Make sure the files are named exactly `apps/api/.env` and `apps/web/.env`, not `.env.txt`. Run project commands from the repository root and restart the application after changing configuration. Never put server credentials in a `VITE_` variable: frontend variables are exposed to the browser.

### A Port Is Already In Use

You may already have an instance running. Check the existing application before starting another one, or stop the old development terminal with Ctrl+C. If you deliberately change a port, update its matching configuration too: the API port must match `VITE_API_URL`, and PostgreSQL's published port must match `DATABASE_URL`. Direct browser-to-API connections also require a matching `CORS_ORIGINS` entry; Vite's development proxy avoids that cross-origin connection. The frontend is configured to fail on an occupied port rather than silently start elsewhere.

### The Website Opens But Data Does Not Load

Check http://localhost:3000/health, confirm PostgreSQL is healthy, and read the API terminal output. Starting Vite alone is not enough; use `pnpm dev:stack`. During development, Vite forwards `/api` and `/socket.io` to `VITE_API_URL`, so that address must be reachable from the computer running Vite, not from the phone. For production builds that call a separate API directly, `CORS_ORIGINS` must match the web address you actually opened, including `localhost` versus `127.0.0.1`.

### Preview On A Phone

Keep the API running, then start a separate preview from the repository root:

```sh
pnpm --filter @northeastern-airways/web exec vite --host 0.0.0.0 --port 5174
```

Connect the phone to the same trusted Wi-Fi and open `http://<computer-LAN-IP>:5174`. Leave `VITE_API_URL` pointing to the computer's local API, for example `http://localhost:3000`. API requests and live WebSocket updates go through the preview, so the phone only needs access to port 5174. Allow that preview through the firewall on trusted private networks only; do not disable the firewall or forward this development server to the internet.

### No Flights Appear Or Search Has No Availability

On a new empty database, run `pnpm db:migrate` followed by `pnpm db:seed` once. On an initialized database, use `pnpm db:refresh` instead. Search tomorrow within the next 30 seeded dates. Production map mode may correctly display no planes when no scheduled flights are currently in the air; the development map uses simulated replay positions.

### The Shared Domain Package Cannot Be Found

Run `pnpm dev:stack`, which builds the shared package before starting the API. If running individual workspace commands manually, build it first with:

```sh
pnpm --filter @northeastern-airways/domain build
```

### Tests Fail On A Missing Table Or Missing Seeded Data

API integration tests need a prepared development database. Complete the first-time setup before running `pnpm test`. Do not run migrations or test fixtures against an unrelated or production database. Frontend-only tests can run without PostgreSQL using the command in the reference table.

## Publish The Repository On GitHub

### Pre-Publication Checklist

- Commit source, migrations, seeders, `pnpm-lock.yaml`, and `.env.example` templates. Do not commit `.env` files, database dumps, logs, `node_modules`, or generated builds. `.gitignore` excludes these local artifacts.
- Review the staged files for credentials and personal information. If a real secret has ever been committed, removing the file alone is not sufficient; rotate the secret and review repository history.
- Check permission to redistribute the aircraft/cabin Adobe Stock imagery and any other third-party assets. See [image credits](apps/web/public/img/IMAGE-CREDITS.md). An attribution file is not verification of redistribution rights.
- Choose a repository license before promising reuse rights. No project license has been selected here.
- Publishing source to GitHub is separate from deploying the app. GitHub Pages alone cannot run the Node API or PostgreSQL database.

### Initial Upload From A Local Folder

For a local copy that is not already a Git repository, run the following from the project root. If you cloned an existing repository, do not repeat initialization or add a second `origin`; use that repository's normal contribution workflow instead.

```sh
git init -b main
git add .
git status --short
git diff --cached --stat
git diff --cached
```

Inspect the staged file list and diff before committing. Confirm no actual `.env` files, secrets, private database archives, or unlicensed assets are staged. To unstage an accidentally added file before the first commit, use `git rm --cached -- PATH-TO-FILE`; this leaves the local file in place.

When the contents are ready:

```sh
git commit -m "Initial Northeastern Airways coursework application"
```

If Git asks for author details, set the name and email you intend to publish for this repository with `git config user.name "Your Name"` and `git config user.email "YOUR-PUBLIC-GIT-EMAIL"`, then retry the commit. These are placeholders, not account credentials.

The project's remote URL is shown below. Add it only when publishing the original local folder and no `origin` exists yet. A clone already has its remote configured. For your own fork or separate copy, create an **empty** GitHub repository without another README, license or `.gitignore`, and use your own repository URL instead:

```sh
git remote add origin https://github.com/cloutician/northeastern_airways.git
git push -u origin main
```

Authenticate through your configured Git/GitHub sign-in method when prompted; never put access tokens directly in the remote URL or README. These are manual publishing instructions only. None of the setup commands automatically creates a GitHub repository or uploads code.

GitHub displays the root README automatically, and the relative documentation and screenshot links continue to work in a clone. Commit screenshots and their README links together so the published README never points to missing files.

### Hosting Is A Separate Step

This guide is for cloning and running the project locally. A public hosted demonstration requires a Node-capable API host, PostgreSQL, a frontend host, HTTPS, deployment-specific URLs and secrets, explicit demonstration labelling and timetable maintenance. Running `pnpm build` or uploading source to GitHub does not provide those services. Do not expose the local development servers or public demo credentials as a production airline service. This application has no real-payment integration.

## Structure

- `apps/web`: React, Vite, Leaflet and passenger-facing UI.
- `apps/api`: Express, Sequelize, PostgreSQL, authentication and bookings.
- `packages/domain`: shared route-search algorithms.
- `apps/api/src/migrations`: database schema history.
- `apps/api/src/seeders`: initial demonstration data.
- `apps/api/src/db/seed-flight-schedule.cjs`: append-only rolling timetable generator.
- [docs/booking-flow.md](docs/booking-flow.md): booking-flow scope and detailed schedule behavior.
- [docs/screenshots/README.md](docs/screenshots/README.md): screenshot filenames and capture checklist.
