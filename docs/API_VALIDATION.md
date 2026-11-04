# API input validation

Authentication, role checks and externally-managed write restrictions run before validation. Denied requests do not reach database mutations or sync workers.

Report JSON and CSV endpoints share `parseReportQuery`:

- Supply a real `YYYY-MM` month or both real `YYYY-MM-DD` start/end dates in order. Supported years are 1900–9999; nonexistent dates and partial ranges return JSON 400.
- Platform: all/github/gitlab; grouping: member/team; sorting uses the documented report columns and asc/desc. Unknown enum values return 400.
- Page: integer 1–1,000,000; limit: integer 1–100. NaN, infinity, decimals, negative values and oversized values return 400.
- Team/repository IDs: at most 128 ASCII letters, digits, hyphens or underscores. Member-name search is limited to 200 characters without controls. Identity scope from the session is applied independently of these filters.

JSON mutation handlers use `readJsonObject`. The streaming reader enforces a **32 KiB UTF-8 byte limit**, including chunked bodies, and stops reading over the limit. Oversized bodies return JSON 413. Malformed UTF-8/JSON, arrays/scalars/null, unexpected fields, and invalid field types return 400.

Member/team names must be nonblank text up to 200 characters without controls. Usernames are optional strings up to 100 characters (letters/digits/underscore/dot/hyphen), empty strings or null; clearing a username stores null. Role and boolean fields are checked at runtime; strings such as `"false"` are not converted to booleans.

Repository updates accept a boolean `ignored` and/or up to 100 unique team IDs. Missing team IDs are rejected before the relation transaction; concurrent foreign-key failures produce a redacted error. Settings require integer numeric values: lowMax/mediumMax 1–10,000 with lowMax < mediumMax, and staleDays 1–36,500.

Follow-up notes retain their separate 2,000-character limit and optimistic revision checks. Their JSON body also follows the streaming size limit and field whitelist.

Validation smoke tests verify malformed values fail before queries/mutations, valid leap-day WIB ranges, byte limits versus character counts, valid CRUD requests, relation failures without database details, and authorization precedence. This contract covers the report and listed mutation handlers; other specialized query endpoints keep their individual contracts.
