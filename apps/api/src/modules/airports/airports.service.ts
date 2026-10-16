import { Airport } from "../../models/index.js";

export async function listAirports() {
  return Airport.findAll({ order: [["code", "ASC"]] });
}
