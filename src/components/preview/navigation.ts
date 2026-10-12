export const previewSections = [
  "dashboard",
  "reports",
  "members",
  "teams",
  "repositories",
  "settings",
] as const;
export type PreviewSection = (typeof previewSections)[number];
export function getPreviewSection(value: unknown): PreviewSection {
  return typeof value === "string" &&
    (previewSections as readonly string[]).includes(value)
    ? (value as PreviewSection)
    : "dashboard";
}
export function previewHref(section: PreviewSection) {
  return section === "dashboard" ? "/preview" : `/preview?section=${section}`;
}
