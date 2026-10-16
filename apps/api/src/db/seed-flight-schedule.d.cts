import type { QueryInterface, Transaction } from "sequelize";

declare function seedFlightSchedule(
  queryInterface: QueryInterface,
  options?: { days?: number; now?: Date; transaction?: Transaction },
): Promise<{ startDate: string; endDate: string; addedFlights: number; addedSchedules: number }>;

export = seedFlightSchedule;
