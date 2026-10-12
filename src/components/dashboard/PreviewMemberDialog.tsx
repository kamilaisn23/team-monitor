"use client";
import { useEffect, useRef, useState } from "react";
import type { DashboardMember } from "./DashboardClient";
import { Icon } from "@/components/ui/icon";
import { previewIssues } from "./preview-data";

export function PreviewMemberDialog({
  member,
  onClose,
}: {
  member: DashboardMember;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showIssues, setShowIssues] = useState(false);
  const memberIssues = previewIssues.filter(
    (issue) => issue.memberId === member.memberId,
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      aria-labelledby="preview-member-title"
      className="tm-preview-dialog"
    >
      <button
        className="tm-icon-button ml-auto"
        aria-label="Tutup profil"
        onClick={() => dialog.current?.close()}
      >
        <Icon name="close" />
      </button>
      <div className="tm-eyebrow">PROFIL CONTOH</div>
      <h2 id="preview-member-title">{member.name}</h2>
      <p>
        {member.role === "MANAGER" ? "Manager" : "Developer"} ·{" "}
        {member.isActive ? "Aktif" : "Nonaktif"}
      </p>
      <button
        type="button"
        className="tm-preview-member-stat tm-clickable-card w-full text-left"
        aria-label="Lihat daftar isu anggota"
        aria-expanded={showIssues}
        onClick={() => setShowIssues((value) => !value)}
      >
        <span>Seluruh isu contoh anggota</span>
        <strong>{memberIssues.length}</strong>
        <Icon name="chevron" />
      </button>
      {showIssues && (
        <div className="tm-detail-list mt-3">
          {memberIssues.length ? (
            memberIssues.map((issue) => (
              <div className="tm-detail-row" key={issue.id}>
                <span className="tm-detail-row-copy">
                  <strong>{issue.title}</strong>
                  <small>{issue.repository.name}</small>
                </span>
                <span className="tm-detail-age">{issue.ageDays} hari</span>
              </div>
            ))
          ) : (
            <p className="tm-detail-intro">
              Belum ada isu terbuka untuk anggota ini.
            </p>
          )}
        </div>
      )}
      <p className="mt-4">{member.teams.map((t) => t.name).join(" · ")}</p>
      <div className="tm-preview-note">
        Profil ini menggunakan data contoh untuk pratinjau desain.
      </div>
      <button
        className="tm-button tm-button-primary mt-5 w-full"
        onClick={() => dialog.current?.close()}
      >
        Kembali ke dasbor
      </button>
    </dialog>
  );
}
