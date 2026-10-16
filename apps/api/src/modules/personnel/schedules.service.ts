import { Aircraft, Airport, Flight, FlightSchedule, Path } from "../../models/index.js";
import { emitFlightStatusUpdate } from "../../realtime/io.js";
import { Op } from "sequelize";

const flightDetailInclude = {
  model: Flight,
  include: [
    {
      model: Path,
      include: [
        { model: Airport, as: "fromAirport" },
        { model: Airport, as: "toAirport" },
      ],
    },
    { model: Aircraft },
  ],
};

export async function listSchedules() {
  return FlightSchedule.findAll({
    include: [flightDetailInclude],
    order: [["scheduledDeparture", "ASC"]],
  });
}

export async function listBoardSchedules(now = new Date()) {
  return FlightSchedule.findAll({
    where: { scheduledDeparture: { [Op.between]: [now, new Date(now.getTime() + 86400000)] } },
    include: [flightDetailInclude],
    order: [["scheduledDeparture", "ASC"], ["id", "ASC"]],
    limit: 50,
  });
}

export async function createSchedule(body: {
  flightId: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  flightPlanOrigin?: string;
  flightPlanDestination?: string;
  terminal?: string;
  gate?: string;
  status?: string;
}) {
  const flight = await Flight.findByPk(body.flightId);
  if (!flight) return null;

  const schedule = await FlightSchedule.create({
    flightId: body.flightId,
    scheduledDeparture: new Date(body.scheduledDeparture),
    scheduledArrival: new Date(body.scheduledArrival),
    flightPlanOrigin: body.flightPlanOrigin ?? null,
    flightPlanDestination: body.flightPlanDestination ?? null,
    terminal: body.terminal ?? null,
    gate: body.gate ?? null,
    status: body.status ?? "Scheduled",
  });

  return FlightSchedule.findByPk(schedule.id, {
    include: [flightDetailInclude],
  });
}

export async function updateScheduleStatus(scheduleId: string, status: string) {
  const schedule = await FlightSchedule.findByPk(scheduleId, {
    include: [flightDetailInclude],
  });
  if (!schedule) return null;
  await schedule.update({ status });
  const reloaded = await FlightSchedule.findByPk(scheduleId, {
    include: [flightDetailInclude],
  });
  emitFlightStatusUpdate(reloaded?.get({ plain: true }) ?? null);
  return reloaded;
}

export async function deleteSchedule(scheduleId: string) {
  const schedule = await FlightSchedule.findByPk(scheduleId);
  if (!schedule) return false;
  await schedule.destroy();
  return true;
}
