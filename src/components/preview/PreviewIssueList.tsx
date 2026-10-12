"use client";
import { Icon } from "@/components/ui/icon";
import {
  previewMembers,
  type PreviewIssue,
} from "@/components/dashboard/preview-data";
import type { DashboardMember } from "@/components/dashboard/DashboardClient";

export function PreviewIssueList({
  issues,
  onMember,
}: {
  issues: PreviewIssue[];
  onMember: (member: DashboardMember) => void;
}) {
  return (
    <div className="tm-detail-list">
      {issues.length ? (
        issues.map((issue) => {
          const member = previewMembers.find(
            (m) => m.memberId === issue.memberId,
          )!;
          return (
            <button
              type="button"
              className="tm-detail-row"
              key={issue.id}
              onClick={() => onMember(member)}
              aria-label={`${issue.title}, lihat profil ${member.name}`}
            >
              <span className="tm-stat-icon tm-tone-blue">
                <Icon name="issue" width={18} height={18} />
              </span>
              <span className="tm-detail-row-copy">
                <strong>{issue.title}</strong>
                <small>
                  {issue.repository.name} · {member.name}
                </small>
              </span>
              <span className="tm-detail-age">{issue.ageDays} hari</span>
              <Icon name="chevron" width={16} height={16} />
            </button>
          );
        })
      ) : (
        <div className="tm-compact-empty">
          <Icon name="check" />
          <p>Tidak ada isu yang cocok dengan cakupan ini.</p>
        </div>
      )}
    </div>
  );
}
