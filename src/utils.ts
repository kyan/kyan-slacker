import { BaseResults, User } from "../mod.ts";
import { HUser } from "./harvest.ts";
import { TTUser } from "./timetastic.ts";
import { format } from "datetime";

export function mergeUsers(a1: HUser[], a2: TTUser[]): User[] {
  return a2.map((v) => ({
    ...v,
    ...a1.find((sp) => {
      return (
        sp.email === v.email ||
        (sp.first_name === v.first_name && sp.last_name === v.last_name) ||
        sp.last_name === v.last_name
      );
    }),
  }));
}

const accentsMap: { [key: string]: string } = {
  a: "á|à|ã|â|À|Á|Ã|Â",
  e: "é|è|ê|É|È|Ê",
  i: "í|ì|î|Í|Ì|Î",
  o: "ó|ò|ô|õ|Ó|Ò|Ô|Õ",
  u: "ú|ù|û|ü|Ú|Ù|Û|Ü",
  c: "ç|Ç",
  n: "ñ|Ñ",
};

export function slugify(text: string) {
  return Object.keys(accentsMap).reduce(
    (acc, cur) => acc.replace(new RegExp(accentsMap[cur], "g"), cur),
    text,
  );
}

const userWhitelist = Deno.env.get("TIMETASTIC_WHITELIST")?.split(",");
const inWhiteList = (user: User) =>
  user.timetastic_id && userWhitelist?.includes(String(user.timetastic_id));

const absenceWhiteList = [
  "meeting / conferences",
  "holiday",
  "sick leave",
  "maternity",
  "paternity",
  "unpaid",
  "kyan",
  "day in lieu",
  "compassionate",
  "dependency",
  "paid leave",
  "xmas closure",
];

export function calculateSlackness(dataGroupByDate: BaseResults) {
  const dateKeys = Object.keys(dataGroupByDate);

  dateKeys.forEach((k) => {
    const lookup = dataGroupByDate[k];

    const results = [
      ...lookup.users.map((user) => {
        const leaveTypeNames = user?.absences?.map((a) =>
          a.leaveType.toLowerCase().trim()
        ) || [];
        const timeEntry = user?.timeEntries?.length || 0;

        // If the user is in the whitelist, ignore
        // If there is actually time logged we skip currently
        // Skip if the user is one of these leave types
        if (
          inWhiteList(user) ||
          timeEntry > 0 ||
          absenceWhiteList.some((r) => leaveTypeNames.includes(r))
        ) {
          return user;
        }

        user.needsReminding = true;

        return user;
      }),
    ].filter((n) => n.needsReminding);

    lookup.users = results;

    // remove any empty days
    if (lookup.users.length < 1) {
      delete dataGroupByDate[k];
    }
  });
}

export function dateRange(startDate: string, endDate: string, steps = 1) {
  const dateArray = [];
  const currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    const day = new Date(currentDate).getDay();

    // ignore weekends
    if (![6, 0].includes(day)) {
      dateArray.push(format(new Date(currentDate), "yyyy-MM-dd"));
    }

    // Use UTC date to prevent problems with time zones and DST
    currentDate.setUTCDate(currentDate.getUTCDate() + steps);
  }

  return dateArray;
}

export function distanceBetweenDays(start: string, end: string) {
  const oneDay = 1000 * 60 * 60 * 24;
  const diffInTime = new Date(end).getTime() - new Date(start).getTime();
  const diffInDays = Math.round(diffInTime / oneDay);

  return diffInDays;
}

export function jsonError(code: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status: code,
    headers: {
      "content-type": "application/json",
    },
  });
}

export function jsonSuccess(json: string) {
  return new Response(json, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
