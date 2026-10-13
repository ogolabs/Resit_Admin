"use client";

import React, { useEffect, useMemo } from "react";
import { X, ExternalLink, Download, FileText } from "lucide-react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string | null;
  title?: string;
  fileName?: string;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  documentUrl,
  title = "Official Document",
  fileName = "document",
}: DocumentPreviewModalProps) {
  // Convert base64 data URL to a clean browser Blob URL so PDF viewers work natively
  const { blobUrl, isPdf } = useMemo(() => {
    if (!documentUrl) return { blobUrl: null, isPdf: false };

    if (documentUrl.startsWith("http://") || documentUrl.startsWith("https://")) {
      const isPdfUrl = documentUrl.toLowerCase().endsWith(".pdf");
      return { blobUrl: documentUrl, isPdf: isPdfUrl };
    }

    if (documentUrl.startsWith("data:")) {
      const isPdfData = documentUrl.includes("application/pdf");
      try {
        const parts = documentUrl.split(",");
        if (parts.length < 2) return { blobUrl: null, isPdf: isPdfData };
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : isPdfData ? "application/pdf" : "image/png";
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: mimeType });
        const createdBlobUrl = URL.createObjectURL(blob);
        return { blobUrl: createdBlobUrl, isPdf: isPdfData };
      } catch {
        return { blobUrl: null, isPdf: isPdfData };
      }
    }

    return { blobUrl: null, isPdf: false };
  }, [documentUrl]);

  // Cleanup blob URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Handle document download
  const handleDownload = () => {
    if (!documentUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl || documentUrl;
    const ext = isPdf ? ".pdf" : ".png";
    a.download = fileName.endsWith(ext) ? fileName : `${fileName}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle opening in a full separate tab
  const handleOpenNewTab = () => {
    const targetUrl = blobUrl || documentUrl;
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen || !documentUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/60 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Official verified document on record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-3 sm:p-4 bg-slate-950/60 overflow-auto flex items-center justify-center min-h-75">
          {isPdf ? (
            blobUrl ? (
              <iframe
                src={blobUrl}
                title={title}
                className="w-full h-[68vh] rounded-xl border border-slate-800 bg-white"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  Could not render PDF preview directly.
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  Download PDF to View
                </button>
              </div>
            )
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={documentUrl}
              alt={title}
              className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl border border-slate-800 shadow-xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
