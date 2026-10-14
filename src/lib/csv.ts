export type CsvValue = string | number | boolean | null | undefined;

// These exports are intended for people opening a report in a spreadsheet.
// A tab inside a quoted dangerous text cell prevents Excel formula evaluation;
// the tab remains part of the data for programmatic consumers.
const FORMULA_TEXT = /^(?:[\s\u0000-\u001f\u007f]*[=+@\-＝＋＠－]|[\u0000-\u001f\u007f])/u;

export function csvCell(value: CsvValue): string {
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("CSV numbers must be finite.");
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && FORMULA_TEXT.test(text)) text = "\t" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function serializeCsv(rows: readonly (readonly CsvValue[])[]): string {
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
