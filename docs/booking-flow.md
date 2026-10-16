# Passenger Booking Flow

The React app now connects flight search, route selection, booking review, demo confirmation, and trip management.

## Try It

1. Start PostgreSQL with `docker compose up -d`.
2. Start the API and frontend with `pnpm dev:stack`. This first builds the shared package, applies pending migrations, and refreshes the rolling timetable. Follow the root `README.md` for initial empty-database setup.
3. Open http://localhost:5173 and search a future date.
4. Select an outbound flight and, for return trips, a compatible return.
5. Choose **Review booking**, then log in or create a passenger account. Flight selection survives authentication and page refresh.
6. Review the itinerary and server-calculated fare, then choose **Reserve trip**.
7. Choose **Confirm demo booking** to confirm the pending demonstration record. No payment details are requested.
8. Open **My trips** to filter bookings, resume pending checkout, view details, or cancel a future trip.

## Demo Schedule

Run `pnpm db:refresh` from the repository root to apply pending migrations and refresh the next 30 days of demo flight coverage. Run it again whenever the timetable needs extending. It is safe to repeat: existing flights, bookings, prices, and staff schedule statuses are preserved.

The shared implementation is `apps/api/src/db/seed-flight-schedule.cjs`. Both the original flight seeder in `apps/api/src/seeders/20260112120002-seed-flights.cjs` and `apps/api/src/scripts/seed-demo-flights.ts` call it. `pnpm db:seed:demo` and `pnpm db:seed:flights` refresh the timetable without first applying migrations; neither command deletes flights now.

For each route/date with no flights, the refresh inserts three staggered daily departures, interpreted in UK local time with daylight saving applied. It also inserts missing `FlightSchedules` records for the covered flights so the public status board has data. The public board shows up to 50 departures in the next 24 hours; the personnel endpoint still exposes the full schedule.

For a brand-new empty database, run migrations and the full seed set first (`pnpm db:migrate`, then `pnpm db:seed`). The full seed set also configures demo users and seats; it is not the routine refresh command. `pnpm db:reset` and seed undo commands remain destructive initialization/cleanup tools and are not needed for a refresh.

## Where The Displayed Flights Come From

Flight search, the map, and the status board read PostgreSQL records created by the seeders or application. These are fictional coursework/demo flight records, not a real airline feed.

- Development map: database flights currently in the air are preferred. Off-peak, upcoming departures within the next 24 hours are used. The plane positions run as a looping demo replay, independent of actual departure time.
- Production map: positions are estimated from departure/arrival times, with only flights in or immediately adjacent to their scheduled flight window displayed. They are still not GPS/ADS-B positions.
- Socket.IO pushes database-derived updates; it does not supply an external live aircraft tracking feed.
- Each map marker uses the database flight ID so recurring daily flight numbers do not overwrite one another.

A backup from the October schedule repair is stored locally under `backups/`, which is excluded from Git.

## Scope

- Bookings cover one signed-in passenger at the stored standard fare. Additional travellers, cabin pricing, seat selection, and check-in are not part of this update.
- No card details are collected, no money is charged, and no real tickets are issued. All confirmation and cancellation actions are simulations in every environment, including a hosted production-mode demonstration. No payment-provider SDK is installed, and old Stripe environment settings are ignored.
- The legacy payment webhook is permanently retired with HTTP 410 before request-body parsing. It cannot write booking or webhook-event records. Only the signed-in booking owner can use the historical `confirm-payment` route, which rejects payment details and only changes demo status.
- Existing payment-related database columns and the old webhook-event table are retained for migration compatibility; they do not enable a payment provider. New simulated confirmations do not create a Stripe payment-intent identifier. The historical `paid`/`refunded` database values are displayed as demo confirmation/cancellation, not real financial transactions.
- Fare and itinerary checks run again when reserving. Duplicate flights, departed flights, disconnected legs, and transfers shorter than one hour are rejected.
- Cancelled bookings cannot be confirmed again through demo checkout. Cancellation records a demo refund for paid bookings.
- Times on trip screens use Europe/London, including daylight saving time.

## Verification

`pnpm test` runs API tests, including the passenger lifecycle and authorization checks. Database integration tests need a migrated, seeded PostgreSQL database. The booking tests create and remove their own users, flights, and bookings.

Frontend visual verification was unavailable during implementation because browser access was declined. TypeScript, the production web build, API tests, and live local API requests were used for verification.
