
export type Plan = 'FREE' | 'PREMIUM' | 'FAMILY';

export interface UserDTO {
  id: string;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  plan: Plan;
}

export interface BudgetStats {
  daysRemaining: number;
  dailyLimit: number;
  spentToday: number;
  remainingInLimit: number;
  totalSpentThisMonth: number;
  totalIncome: number;
}

export interface ExpenseDTO {
  id: string;
  amount: number;
  category: string;
  note?: string;
  spentAt: string;
}

export interface GoalDTO {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: any;
}
