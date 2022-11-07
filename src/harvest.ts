import { User } from "../mod.ts";
import { slugify } from "./utils.ts";

export interface HarvestUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface HarvestTimeEntry {
  spent_date: string;
  hours: number;
  notes: string;
  user: {
    id: number;
    name: string;
  };
}

export type HUser = Omit<User, "timetastic_id">;

const BASE_API_URL = "https://api.harvestapp.com/v2";
const API_KEY = Deno.env.get("HARVEST_KEY");
const ACCOUNT_ID = Deno.env.get("HARVEST_ACCOUNT_ID");
const options = {
  method: "GET",
  headers: {
    "content-type": "application/json",
    "Accept": "application/json",
    "Harvest-Account-Id": `${ACCOUNT_ID}`,
    "Authorization": `Bearer ${API_KEY}`,
  },
};

export async function fetchHarvestTimeEntries(
  date: string,
  data: HarvestTimeEntry[] = [],
  nextLink?: string,
): Promise<HarvestTimeEntry[]> {
  let url: URL;

  if (nextLink) {
    url = new URL(nextLink);
  } else {
    url = new URL(`${BASE_API_URL}/time_entries`);
    url.searchParams.set("from", date);
    url.searchParams.set("to", date);
  }

  const harvestRequest = new Request(url, options);

  try {
    const harvestResponse = await fetch(harvestRequest);
    const json = await harvestResponse.json();
    const timeEntries: HarvestTimeEntry[] = json.time_entries;

    const requestResult = timeEntries.map((entry) => {
      const item: HarvestTimeEntry = {
        spent_date: entry.spent_date,
        hours: entry.hours,
        notes: entry.notes,
        user: {
          id: entry.user.id,
          name: entry.user.name,
        },
      };

      return item;
    });

    const results = [...data, ...requestResult];

    if (json.links.next) {
      return await fetchHarvestTimeEntries(date, results, json.links.next);
    } else {
      return results;
    }
  } catch (error) {
    console.error("fetching harvest users:", error);
    throw new Error("fetching harvest users!");
  }
}

export async function fetchHarvestUsers() {
  const url = new URL(`${BASE_API_URL}/users`);
  url.searchParams.set("is_active", "true");

  const harvestRequest = new Request(url, options);

  try {
    const harvestResponse = await fetch(harvestRequest);
    const json = await harvestResponse.json();
    const users: HarvestUser[] = json.users;

    return users.map((user: HarvestUser) => {
      const data: HUser = {
        needsReminding: false,
        harvest_id: user.id,
        email: user.email.toLowerCase(),
        first_name: slugify(user.first_name),
        last_name: slugify(user.last_name),
      };

      return data;
    });
  } catch (error) {
    console.error("fetching harvest users:", error);
    throw new Error("fetching harvest users!");
  }
}

export function addHarvestData(timeEntries: HarvestTimeEntry[], users: User[]) {
  timeEntries.forEach((entry) => {
    // find user in users list
    const userIndex = users.findIndex((user) =>
      user.harvest_id === entry.user.id
    );
    // if not found then ignore
    if (userIndex === -1) return;

    users[userIndex].timeEntry = entry;
  });
}
