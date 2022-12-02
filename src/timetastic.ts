import { BaseResults, User } from "../mod.ts";
import { dateRange, slugify } from "./utils.ts";
import groupBy from "groupBy";

export interface TimetasticUser {
  id: number;
  firstname: string;
  surname: string;
  email: string;
}

export interface TimetasticHoliday {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  startType: string;
  endType: string;
  reason: string;
  status: string;
  leaveType: string;
}

export interface Absence {
  id: number;
  userId: number;
  startType: string;
  endType: string;
  reason: string;
  status: string;
  leaveType: string;
}

export type TTUser = Omit<User, "harvest_id">;

const BASE_API_URL = "https://app.timetastic.co.uk/api";
const API_KEY = Deno.env.get("TIMETASTIC_KEY");
const options = {
  method: "GET",
  headers: {
    "content-type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

export async function fetchTimetasticHolidays(queryRange: string[]) {
  const url = new URL(`${BASE_API_URL}/holidays`);
  url.searchParams.set("NonArchivedUsersOnly", "true");
  url.searchParams.set("Start", queryRange[0]);
  url.searchParams.set("End", queryRange[queryRange.length - 1]);

  const timetasticRequest = new Request(url, options);

  try {
    const timetasticResponse = await fetch(timetasticRequest);
    const json = await timetasticResponse.json();
    const holidays: TimetasticHoliday[] = json.holidays;

    return holidays.reduce<{ [index: string]: Absence[] }>(function (r, a) {
      const absenceRange = dateRange(a.startDate, a.endDate);

      absenceRange.forEach((d) => {
        if (!queryRange.includes(d)) return;
        r[d] = r[d] || [];
        r[d].push({
          id: a.id,
          userId: a.userId,
          startType: a.startType,
          endType: a.endType,
          reason: a.reason,
          status: a.status,
          leaveType: a.leaveType,
        });
      });

      return r;
    }, Object.create(null));
  } catch (error) {
    console.error("fetching timetastic holidays:", error);
    throw new Error("fetching timetastic holidays!");
  }
}

export async function fetchTimetasticUsers() {
  const url = new URL(`${BASE_API_URL}/users`);
  const timetasticRequest = new Request(url, options);

  try {
    const timetasticResponse = await fetch(timetasticRequest);
    const timetasticUsers: TimetasticUser[] = await timetasticResponse.json();

    return timetasticUsers.map((user) => {
      const data: TTUser = {
        needsReminding: false,
        timetastic_id: user.id,
        email: user.email.toLowerCase(),
        first_name: slugify(user.firstname),
        last_name: slugify(user.surname),
      };

      return data;
    });
  } catch (error) {
    console.error("fetching timetastic users:", error);
    throw new Error("fetching timetastic users!");
  }
}

export function addUsersToTimetasticData(
  absences: { [index: string]: Absence[] },
  users: User[],
): BaseResults {
  // deno-lint-ignore no-explicit-any
  const data: any = {};
  const dates = Object.keys(absences);

  dates.forEach((date) => {
    data[date] = groupBy((a) => a.userId, absences[date]);

    users.forEach((user) => {
      if (!user.timetastic_id) return;
      data[date].users = data[date].users || [];

      const userDupe = { ...user };
      userDupe.absences = data[date][user.timetastic_id];
      data[date].users.push(userDupe);

      delete data[date][user.timetastic_id];
    });
  });

  return data;
}
