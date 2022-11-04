import { User } from "../mod.ts";
import { HUser } from "./harvest.ts";
import { TTUser } from "./timetastic.ts";

export function mergeUsers(a1: HUser[], a2: TTUser[]): User[] {
  return a2.map((v) => ({
    ...v,
    ...a1.find((sp) => {
      return sp.email === v.email ||
        (sp.first_name === v.first_name && sp.last_name === v.last_name) ||
        sp.last_name === v.last_name;
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

export function calculateSlackness(users: User[]) {
  users.forEach((user) => {
    // If the user is in the whitelist, ignore
    if (inWhiteList(user)) return;
    // If there is actually time logged we skip currently
    if (user?.timeEntry) return;
    // If the user has a specific sort of absence that means
    // we don't need to check
    if (user?.absence?.leaveType.includes("Meeting")) return;
    if (user?.absence?.leaveType.includes("Conferences")) return;
    if (user?.absence?.leaveType.includes("Holiday")) return;
    if (user?.absence?.leaveType.includes("Sick Leave")) return;
    if (user?.absence?.leaveType.includes("Maternity")) return;

    user.needsReminding = true;
  });
}
