"use client";
import type { Transaction } from "@/lib/finance";
export function ConfirmRecurring({
  transaction,
  onConfirm,
  busy,
  he,
}: {
  transaction: Transaction;
  onConfirm: (t: Transaction) => Promise<void>;
  busy: boolean;
  he: boolean;
}) {
  return (
    <button
      className="secondary"
      disabled={busy}
      onClick={() => void onConfirm(transaction)}
    >
      {he ? "אישור שהתקבלה / שולמה" : "Confirm received / paid"}
    </button>
  );
}
