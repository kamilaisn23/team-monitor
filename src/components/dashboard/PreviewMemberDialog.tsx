"use client";
import { useEffect, useRef } from "react";
import type { DashboardMember } from "./DashboardClient";
import { Icon } from "@/components/ui/icon";

export function PreviewMemberDialog({
  member,
  onClose,
}: {
  member: DashboardMember;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
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
      <div className="tm-preview-member-stat">
        <span>Isu terbuka dalam cakupan</span>
        <strong>{member.currentLoad}</strong>
      </div>
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
