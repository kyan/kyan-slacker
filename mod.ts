import "https://deno.land/std@0.161.0/dotenv/load.ts";
import { serve } from "server";
import { format } from "datetime";
import {
  addHarvestData,
  fetchHarvestTimeEntries,
  fetchHarvestUsers,
  HarvestTimeEntry,
} from "./src/harvest.ts";
import {
  Absence,
  addUsersToTimetasticData,
  fetchTimetasticHolidays,
  fetchTimetasticUsers,
} from "./src/timetastic.ts";
import {
  calculateSlackness,
  dateRange,
  distanceBetweenDays,
  jsonError,
  jsonSuccess,
  mergeUsers,
} from "./src/utils.ts";

export interface User {
  needsReminding: boolean;
  email: string;
  timetastic_id?: number;
  harvest_id?: number;
  first_name: string;
  last_name: string;
  absences?: Absence[];
  timeEntries?: HarvestTimeEntry[];
}

export interface BaseResults {
  [index: string]: {
    users: User[];
  };
}

async function handler(req: Request) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get("start_date") ||
    format(new Date(), "yyyy-MM-dd");
  const endDate = url.searchParams.get("end_date") ||
    format(new Date(), "yyyy-MM-dd");
  const token = req.headers.get("Authorization");
  const range = dateRange(startDate, endDate);

  if (token != `Bearer ${Deno.env.get("API_TOKEN")}`) {
    return jsonError(401, "Not Authorized!");
  }

  if (startDate > endDate) {
    return jsonError(422, "start_date must be before end_date");
  }

  if (distanceBetweenDays(startDate, endDate) > 14) {
    return jsonError(
      422,
      "You've picked too wide of a date range for the current implementation. Max 14 days",
    );
  }

  try {
    const timetasticUsers = await fetchTimetasticUsers();
    const harvestUsers = await fetchHarvestUsers();
    const userLookup = mergeUsers(harvestUsers, timetasticUsers);

    const timetasticHolidays = await fetchTimetasticHolidays(range);
    const harvestTimeEntries = await fetchHarvestTimeEntries(range);
    const baseResults = addUsersToTimetasticData(
      timetasticHolidays,
      userLookup,
    );

    addHarvestData(harvestTimeEntries, baseResults);
    calculateSlackness(baseResults);

    const result = {
      dates: baseResults,
    };

    return jsonSuccess(JSON.stringify(result));
  } catch (error) {
    return jsonError(500, error);
  }
}

serve(handler);
