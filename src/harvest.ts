import groupBy from "https://deno.land/x/denodash@0.1.3/src/collection/groupBy.ts";
import { BaseResults, User } from "../mod.ts";
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
  user?: {
    id: number;
    name: string;
  };
  userID?: number | undefined;
}

export type HUser = Omit<User, "timetastic_id">;

const BASE_API_URL = "https://api.harvestapp.com/v2";
const API_KEY = Deno.env.get("HARVEST_KEY");
const ACCOUNT_ID = Deno.env.get("HARVEST_ACCOUNT_ID");
const options = {
  method: "GET",
  headers: {
    "content-type": "application/json",
    Accept: "application/json",
    "Harvest-Account-Id": `${ACCOUNT_ID}`,
    Authorization: `Bearer ${API_KEY}`,
  },
};

export async function fetchHarvestTimeEntries(
  queryRange: string[],
  data: HarvestTimeEntry[] = [],
  nextLink?: string,
): Promise<HarvestTimeEntry[]> {
  let url: URL;

  if (nextLink) {
    url = new URL(nextLink);
  } else {
    url = new URL(`${BASE_API_URL}/time_entries`);
    url.searchParams.set("from", queryRange[0]);
    url.searchParams.set("to", queryRange[queryRange.length - 1]);
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
        userID: entry.user?.id,
      };

      return item;
    });

    const results = [...data, ...requestResult];

    if (json.links.next) {
      return await fetchHarvestTimeEntries(
        queryRange,
        results,
        json.links.next,
      );
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

export function addHarvestData(
  timeEntries: HarvestTimeEntry[],
  dataGroupByDate: BaseResults,
) {
  const groupTimeEntries = groupBy((a) => a.spent_date, timeEntries);
  const timeEntryKeys = Object.keys(groupTimeEntries);

  timeEntryKeys.forEach((k) => {
    const entries = groupTimeEntries[k];
    const lookup = dataGroupByDate[k];

    if (!lookup) return;

    lookup.users = [
      ...lookup.users.map((user) => {
        user.timeEntries = entries.filter(
          (e) => e.spent_date === k && e.userID === user.harvest_id,
        );

        return user;
      }),
    ];
  });
}
