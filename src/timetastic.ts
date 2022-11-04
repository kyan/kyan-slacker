import { User } from "../mod.ts";
import { slugify } from "./utils.ts";

export interface TimetasticUser {
  id: number;
  firstname: string;
  surname: string;
  email: string;
}

export interface TimetasticHoliday {
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
    "Accept": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  },
};

export async function fetchTimetasticHolidays(date: string) {
  const url = new URL(`${BASE_API_URL}/holidays`);
  url.searchParams.set("NonArchivedUsersOnly", "true");
  url.searchParams.set("Start", date);
  url.searchParams.set("End", date);

  const timetasticRequest = new Request(url, options);

  try {
    const timetasticResponse = await fetch(timetasticRequest);
    const json = await timetasticResponse.json();
    const holidays: TimetasticHoliday[] = json.holidays;

    return holidays.map((holiday: TimetasticHoliday) => {
      const data: TimetasticHoliday = {
        userId: holiday.userId,
        startType: holiday.startType,
        endType: holiday.endType,
        reason: holiday.reason,
        status: holiday.status,
        leaveType: holiday.leaveType,
      };

      return data;
    });
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

export function addTimetasticData(
  holidays: TimetasticHoliday[],
  users: User[],
) {
  holidays.forEach((holiday) => {
    // find user in users list
    const userIndex = users.findIndex((user) =>
      user.timetastic_id === holiday.userId
    );
    // if not found then ignore
    if (userIndex === -1) return;

    users[userIndex].holiday = holiday;
  });
}
