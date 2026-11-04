import { wibDateRange, wibMonthRange } from "./wib";
import { InputError, enumParameter, positiveInteger, validCalendarDate, validEntityId, validMonth } from "./input-validation";

const sortColumns = ["name", "role", "issuesCreated", "issuesAssigned", "issuesResolved", "issuesStillOpen"] as const;
export function parseReportQuery(params: URLSearchParams) {
  const month = params.get("month"), first = params.get("start"), last = params.get("end");
  let dates: { start: Date; end: Date }, rangeLabel: string;
  if (params.has("start") || params.has("end")) {
    if (!validCalendarDate(first) || !validCalendarDate(last) || first > last) throw new InputError("start/end must be valid YYYY-MM-DD dates in order");
    dates = wibDateRange(first, last); rangeLabel = `${first}_to_${last}`;
  } else {
    if (!validMonth(month)) throw new InputError("month must be a valid YYYY-MM value, or supply start+end");
    dates = wibMonthRange(month); rangeLabel = month;
  }
  const repositoryId = params.get("repositoryId"), teamId = params.get("teamId"), nameFilter = params.get("name");
  if (repositoryId && !validEntityId(repositoryId) || teamId && !validEntityId(teamId)) throw new InputError("Invalid team/repository ID");
  if (nameFilter && (nameFilter.length > 200 || /[\u0000-\u001f\u007f]/.test(nameFilter))) throw new InputError("name search must be at most 200 characters without controls");
  const platform = enumParameter((params.get("platform") || "all").toLowerCase(), ["all", "github", "gitlab"], "platform");
  const groupBy = enumParameter(params.get("groupBy") || "member", ["member", "team"], "groupBy");
  const sortCol = enumParameter(params.get("sort") || "issuesResolved", sortColumns, "sort");
  const sortDir = enumParameter(params.get("sortDir") || "asc", ["asc", "desc"], "sortDir");
  const page = positiveInteger(params.get("page"), 1, 1_000_000), limit = positiveInteger(params.get("limit"), 10, 100);
  return { ...dates, rangeLabel, repositoryId, teamId, nameFilter, platform, groupBy, sortCol, sortDir, page, limit, skip: (page - 1) * limit };
}
