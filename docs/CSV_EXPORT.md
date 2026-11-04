# CSV reports

The server report route and browser preview export use the same serializer in `src/lib/csv.ts`. Every field is quoted, quotes are doubled, record separators are CRLF, and UTF-8 output includes a BOM. Commas and multiline text stay inside their field.

Text beginning with a formula prefix (including leading whitespace, control characters, and full-width variants) is prefixed with a tab inside the quoted field. This policy follows the Excel-focused mitigation in [OWASP CSV Injection guidance](https://community.owasp.org/attacks/CSV_Injection). Ordinary names and trusted numeric counts retain their values.

These files are intended for people reading reports in spreadsheets. The tab remains part of a dangerous text value if a program imports the CSV. Spreadsheet applications differ and saving/reopening can change interpretation; this is not a universal safe interchange format for arbitrary spreadsheet engines. For future machine-to-machine integrations, provide a typed JSON export rather than removing the guard from this report serializer.

`scripts/csv-smoke.mjs` checks round-trip field boundaries, formula prefixes, controls, Unicode, quotes, line breaks, and numbers. `scripts/read-access-smoke.mjs` verifies the server route applies the serializer to member names.
