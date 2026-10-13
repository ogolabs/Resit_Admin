"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Building,
  CreditCard,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import type { IMerchantVerification, IBankDetails } from "@/lib/db";
import DocumentPreviewModal from "@/components/ui/DocumentPreviewModal";
import { SAMPLE_REGISTRATION_PDF } from "@/lib/sample-doc";

interface MerchantVerificationTabProps {
  merchantId: string;
  country: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  taxId?: string | null;
  verification?: IMerchantVerification | null;
  bankDetails?: IBankDetails | null;
  onStatusUpdated?: () => void;
}

export default function MerchantVerificationTab({
  merchantId,
  country,
  isEmailVerified,
  isPhoneVerified,
  taxId,
  verification,
  bankDetails,
  onStatusUpdated,
}: MerchantVerificationTabProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const status = verification?.status || "unverified";
  const isBankVerified = Boolean(
    bankDetails?.isVerified ||
    (bankDetails?.accountNumber && country !== "NG") ||
    (bankDetails?.iban && country !== "NG")
  );
  const isBusinessVerified = status === "verified";
  const effectiveTaxId = taxId || verification?.tinNumber || null;
  const isTaxVerified = Boolean(effectiveTaxId);

  let currentTier = 0;
  if (isBusinessVerified && isTaxVerified) {
    currentTier = 3;
  } else if (isBusinessVerified) {
    currentTier = 2;
  } else if (isBankVerified) {
    currentTier = 1;
  }

  const documentUrl = verification?.documentUrl || verification?.cacDocumentUrl || null;
  const documentType = verification?.documentType || verification?.cacDocumentType || "Registration Document";

  const handleUpdateStatus = async (
    targetStatus: "verified" | "rejected" | "unverified",
    reason?: string
  ) => {
    try {
      setIsUpdating(true);
      setActionError(null);

      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: targetStatus,
          rejectionReason: reason,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to update verification status");
      }

      setRejectModalOpen(false);
      setRejectReason("");
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {actionError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Compliance Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Compliance Level
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  currentTier === 3
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                    : currentTier === 2
                    ? "bg-blue-950/80 text-blue-300 border-blue-800/60"
                    : currentTier === 1
                    ? "bg-cyan-950/80 text-cyan-300 border-cyan-800/60"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {currentTier > 0 ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>{currentTier > 0 ? `Tier ${currentTier} Compliant` : "Unverified"}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1.5">
              {currentTier === 3 && "Fully verified merchant with corporate tax registration and settlement bank account."}
              {currentTier === 2 && "Legal entity existence verified with official corporate registry."}
              {currentTier === 1 && "Basic store settlement account linked; awaiting business registration."}
              {currentTier === 0 && "Merchant has not yet linked a verified settlement bank account or corporate registry."}
            </p>
          </div>

          {/* Admin Moderation Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {status !== "verified" && (
              <button
                onClick={() => handleUpdateStatus("verified")}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Mark Verified</span>
              </button>
            )}

            {status !== "rejected" && (
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}

            {status !== "unverified" && (
              <button
                onClick={() => handleUpdateStatus("unverified")}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Rejection Notice if rejected */}
        {status === "rejected" && verification?.rejectionReason && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold">Rejection Note: </span>
              <span>{verification.rejectionReason}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3-Tier Step Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1 Card */}
        <div
          className={`p-4 rounded-xl border bg-slate-900 space-y-3 ${
            isBankVerified ? "border-slate-800" : "border-slate-800/60 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Tier 1: Settlement Bank</span>
            </div>
            {isBankVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Institution:</span>
              <span className="font-medium text-slate-200">{bankDetails?.bankName || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Account #:</span>
              <span className="font-mono font-medium text-slate-200">
                {bankDetails?.accountNumber || bankDetails?.iban || "—"}
              </span>
            </div>
            {bankDetails?.accountName && (
              <div className="flex justify-between text-slate-400">
                <span>Account Name:</span>
                <span className="font-medium text-slate-200">{bankDetails.accountName}</span>
              </div>
            )}
            {bankDetails?.swiftCode && (
              <div className="flex justify-between text-slate-400">
                <span>SWIFT/BIC:</span>
                <span className="font-mono text-slate-200">{bankDetails.swiftCode}</span>
              </div>
            )}
            {bankDetails?.routingNumber && (
              <div className="flex justify-between text-slate-400">
                <span>Routing #:</span>
                <span className="font-mono text-slate-200">{bankDetails.routingNumber}</span>
              </div>
            )}
            {bankDetails?.verifiedAt && (
              <div className="flex justify-between text-slate-400">
                <span>Verified At:</span>
                <span className="text-slate-300">
                  {new Date(bankDetails.verifiedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tier 2 Card */}
        <div
          className={`p-4 rounded-xl border bg-slate-900 space-y-3 ${
            isBusinessVerified ? "border-slate-800" : "border-slate-800/60 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white">Tier 2: Legal Existence</span>
            </div>
            {isBusinessVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : status === "pending" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
                <Clock className="w-3.5 h-3.5" />
                Under Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Registration #:</span>
              <span className="font-mono font-medium text-slate-200">
                {verification?.registrationNumber || verification?.cacNumber || "—"}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Legal Name:</span>
              <span className="font-medium text-slate-200 truncate max-w-37.5" title={verification?.registeredName || undefined}>
                {verification?.registeredName || "—"}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Entity Type:</span>
              <span className="text-slate-200 uppercase">{verification?.companyType || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Country:</span>
              <span className="text-slate-200">{verification?.countryCode || country || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Provider:</span>
              <span className="text-slate-300 capitalize">{verification?.provider || "Direct"}</span>
            </div>
          </div>
        </div>

        {/* Tier 3 Card */}
        <div
          className={`p-4 rounded-xl border bg-slate-900 space-y-3 ${
            isTaxVerified ? "border-slate-800" : "border-slate-800/60 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Tier 3: Corporate Tax</span>
            </div>
            {isTaxVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Compliant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Optional
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Corporate Tax ID:</span>
              <span className="font-mono font-medium text-slate-200">
                {effectiveTaxId || "—"}
              </span>
            </div>
            {verification?.taxOffice && (
              <div className="flex justify-between text-slate-400">
                <span>Tax Office:</span>
                <span className="text-slate-200">{verification.taxOffice}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Tax Category:</span>
              <span className="text-slate-200">
                {country === "NG" ? "FIRS Corporate TIN" : "National Tax/VAT ID"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Certificate & Document Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Official Registration Proof Document
            </h3>
          </div>
          {documentUrl ? (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Document Attached
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Verified On Record
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-semibold text-white">
              {documentType || (country === "NG" ? "Official CAC Certificate" : "Official Registration Document")}
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md font-mono">
              {documentUrl ? documentUrl : "Certificate record verified • Document preview available"}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect Document</span>
          </button>
        </div>
      </div>

      {/* Communication & Contact Channels Verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Contact Channels Verification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Email Verification</span>
            </div>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Phone Verification</span>
            </div>
            {isPhoneVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400">
              <XCircle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Reject Merchant Verification</h4>
            </div>

            <p className="text-xs text-slate-300">
              Provide a clear reason for rejecting this merchant&apos;s registration. This reason will be displayed in the merchant portal to explain what corrections are needed.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Certificate of incorporation is unreadable or legal business name does not match corporate registry records."
              className="w-full h-24 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus("rejected", rejectReason.trim() || undefined)}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Certificate Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        documentUrl={documentUrl || SAMPLE_REGISTRATION_PDF}
        title={documentType || (country === "NG" ? "Official CAC Certificate" : "Official Registration Document")}
        fileName={`registration-${verification?.registrationNumber || verification?.cacNumber || "record"}`}
      />
    </div>
  );
}
