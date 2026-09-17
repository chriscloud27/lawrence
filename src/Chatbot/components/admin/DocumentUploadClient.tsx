"use client";

// v2 document upload, ported as a prototype surface. There is no storage bucket
// and no extraction pipeline behind it — files picked here are held in component
// state and go nowhere. The banner says so rather than letting the UI imply a
// capability that does not exist.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Plus } from "lucide-react";
import { ProgressStepper } from "@/components/admin/forms/ProgressStepper";
import { INTAKE_FLOW_STEPS } from "@/lib/admin/form-options";
import { BTN_PRIMARY, CARD_WRAPPER, FOOTER_NOTE, LINK_BTN } from "@/components/admin/ui";

interface PickedFile {
  id: string;
  name: string;
  size: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadClient({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [
      ...prev,
      ...Array.from(list).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: formatSize(file.size),
      })),
    ]);
  };

  return (
    <div className="w-full py-lw-2xl">
      <div className={CARD_WRAPPER}>
        <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={1} />

        <div className="mb-lw-lg rounded-lw-lg border-l-[3px] border-lw-warning bg-lw-bg-subtle px-lw-base py-lw-md text-[13px] leading-relaxed text-lw-text">
          Prototype only — there is no upload backend yet. Files chosen here stay in the browser.
        </div>

        <p className="mb-lw-lg text-base text-lw-text-secondary">
          Share anything you&apos;ve already gathered — school brochures, notes from other
          consultants, voice memos, emails from school contacts.
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-lw-sm rounded-lw-lg border-2 border-dashed p-lw-lg text-center transition-colors ${
            dragOver
              ? "border-lw-accent bg-lw-accent-subtle"
              : "border-lw-border bg-lw-bg-subtle hover:border-lw-accent hover:bg-lw-accent-subtle"
          }`}
        >
          <Upload size={32} className="text-lw-text-muted" />
          <div className="text-base font-medium text-lw-text">Drag files here or tap to browse</div>
          <div className="text-[13px] text-lw-text-muted">
            PDFs, Word docs, images, voice notes, emails
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        <div className="mt-lw-base flex flex-col gap-lw-sm">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-lw-md rounded-lw bg-lw-bg-card px-lw-base py-lw-md"
            >
              <FileText size={20} className="shrink-0 text-lw-text-muted" />
              <div className="flex-1 truncate text-sm text-lw-text">{file.name}</div>
              <div className="shrink-0 text-[13px] text-lw-text-muted">{file.size}</div>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
                aria-label={`Remove ${file.name}`}
                className="-my-lw-sm -mr-lw-sm shrink-0 cursor-pointer p-lw-sm text-lw-text-muted max-[560px]:h-12 max-[560px]:w-12"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className={LINK_BTN} onClick={() => inputRef.current?.click()}>
          <Plus size={16} />
          Add more files
        </button>

        <button
          type="button"
          className={`${BTN_PRIMARY} mt-lw-sm w-full`}
          onClick={() => router.push(`/admin/parents/${leadId}/next-step`)}
        >
          Continue
        </button>

        <div className={FOOTER_NOTE}>Powered by Lawrence</div>
      </div>
    </div>
  );
}
