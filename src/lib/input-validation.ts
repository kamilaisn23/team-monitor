export const memberRoles = ["ADMIN", "MANAGER", "DEVELOPER", "UNASSIGNED"] as const;
export type MemberRole = (typeof memberRoles)[number];
export interface MemberBody {
  name?: string;
  usernameGithub?: string | null;
  usernameGitlab?: string | null;
  role?: MemberRole;
  isActive?: boolean;
}

export function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}
export function validName(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && !!value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}
export function validEntityId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
function validUsername(value: unknown): boolean {
  return value === null || typeof value === "string" && value.length <= 100 && (value.trim() === "" || /^[A-Za-z0-9_.-]{1,100}$/.test(value.trim()));
}
export function validMemberBody(value: Record<string, unknown>, create = false): value is Record<string, unknown> & MemberBody {
  if (!Object.keys(value).length || !onlyKeys(value, ["name", "usernameGithub", "usernameGitlab", "role", "isActive"])) return false;
  return (!create || validName(value.name) && memberRoles.includes(value.role as MemberRole)) &&
    (value.name === undefined || validName(value.name)) &&
    (value.role === undefined || memberRoles.includes(value.role as MemberRole)) &&
    (value.usernameGithub === undefined || validUsername(value.usernameGithub)) &&
    (value.usernameGitlab === undefined || validUsername(value.usernameGitlab)) &&
    (value.isActive === undefined || typeof value.isActive === "boolean");
}
export function validTeamBody(value: Record<string, unknown>): value is Record<string, unknown> & { name: string } {
  return onlyKeys(value, ["name"]) && validName(value.name);
}
export function validRepositoryBody(value: Record<string, unknown>): value is Record<string, unknown> & { ignored?: boolean; teamIds?: string[] } {
  return !!Object.keys(value).length && onlyKeys(value, ["ignored", "teamIds"]) &&
    (value.ignored === undefined || typeof value.ignored === "boolean") &&
    (value.teamIds === undefined || Array.isArray(value.teamIds) && value.teamIds.length <= 100 && value.teamIds.every(validEntityId) && new Set(value.teamIds).size === value.teamIds.length);
}
export function validCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return year! >= 1900 && month! >= 1 && month! <= 12 && day! >= 1 && day! <= new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}
export function validMonth(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1900;
}
export class InputError extends Error {}
export function enumParameter<T extends string>(value: string, choices: readonly T[], field: string): T {
  if (!choices.includes(value as T)) throw new InputError(`Invalid ${field}`);
  return value as T;
}
export function positiveInteger(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new InputError("Pagination must use positive integers");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max) throw new InputError("Pagination is outside the supported range");
  return number;
}
