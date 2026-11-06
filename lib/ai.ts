import { z } from "zod";
import {
  totals,
  recordedMonthTransactions,
  goalSaved,
  type FinanceData,
} from "./finance";
export const aiSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    consent: z.boolean(),
    context: z
      .object({
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        currency: z.enum(["ILS", "USD", "EUR", "GBP"]),
        income: z.number().min(0).max(1e14),
        expenses: z.number().min(0).max(1e14),
        recordedSavings: z.number().min(0).max(1e14),
      })
      .optional(),
  })
  .refine(
    (v) => v.consent === Boolean(v.context),
    "Financial context requires explicit permission for this request",
  );
export function aiPayload(
  message: string,
  data: FinanceData,
  month: string,
  consent: boolean,
) {
  const sum = totals(recordedMonthTransactions(data.transactions, month));
  return {
    message,
    consent,
    ...(consent
      ? {
          context: {
            month,
            currency: data.profile.currency,
            income: sum.income,
            expenses: sum.expenses,
            recordedSavings: data.goals.reduce((n, g) => n + goalSaved(g), 0),
          },
        }
      : {}),
  };
}
