import { format, serve } from "./deps.ts";
import {
  addHarvestData,
  fetchHarvestTimeEntries,
  fetchHarvestUsers,
  HarvestTimeEntry,
} from "./src/harvest.ts";
import {
  Absence,
  addTimetasticData,
  fetchTimetasticHolidays,
  fetchTimetasticUsers,
} from "./src/timetastic.ts";
import { calculateSlackness, mergeUsers } from "./src/utils.ts";

export interface User {
  needsReminding: boolean;
  email: string;
  timetastic_id?: number;
  harvest_id?: number;
  first_name: string;
  last_name: string;
  absence?: Absence;
  timeEntry?: HarvestTimeEntry;
}

async function handler(req: Request) {
  const url = new URL(req.url);
  const checkDate = url.searchParams.get("date") ||
    format(new Date(), "yyyy-MM-dd");
  const token = req.headers.get("Authorization");

  if (token != `Bearer ${Deno.env.get("API_TOKEN")}`) {
    return new Response("Not authorized", { status: 401 });
  }

  try {
    const harvestUsers = await fetchHarvestUsers();
    const timetasticUsers = await fetchTimetasticUsers();
    const timetasticHolidays = await fetchTimetasticHolidays(checkDate);
    const harvestTimeEntries = await fetchHarvestTimeEntries(checkDate);

    const userLookup = mergeUsers(harvestUsers, timetasticUsers);
    addTimetasticData(timetasticHolidays, userLookup);
    addHarvestData(harvestTimeEntries, userLookup);
    calculateSlackness(userLookup);

    const result = {
      date: checkDate,
      users: userLookup,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    return new Response(error, { status: 500 });
  }
}

serve(handler);
