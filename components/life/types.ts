import type { FinanceData, Shift } from "@/lib/finance";
import type {
  Task,
  PersonalEvent,
  PersonalGoal,
  Subscription,
  Payslip,
} from "@/lib/life-model";
export type LifeDraft =
  | { kind: "task"; value?: Task; date?: string }
  | { kind: "event"; value?: PersonalEvent; date?: string }
  | { kind: "personal-goal"; value?: PersonalGoal }
  | { kind: "subscription"; value?: Subscription }
  | { kind: "payslip"; value?: Payslip }
  | { kind: "targets"; month: string }
  | { kind: "goal-progress"; value: PersonalGoal }
  | { kind: "milestone"; value: PersonalGoal; milestoneId?: string };
export type LifeProps = {
  data: FinanceData;
  now: Date;
  busy: boolean;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  onEdit: (draft: LifeDraft) => void;
  onNavigate?: (tab: string) => void;
  onShift?: (shift: Shift) => void;
  month: string;
};
