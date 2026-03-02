import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleApiService } from '../services/googleApiService';
import type { Goal, OneTimeExpense, RecurringExpense, EMIPayment } from '../types';

export const GOALS_QUERY_KEY = ['goals'];
export const ONE_TIME_EXPENSES_QUERY_KEY = ['oneTimeExpenses'];
export const RECURRING_EXPENSES_QUERY_KEY = ['recurringExpenses'];
export const EMI_PAYMENTS_QUERY_KEY = ['emiPayments'];

export function useGoals(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: GOALS_QUERY_KEY,
        queryFn: async (): Promise<Goal[]> => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getGoals();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useOneTimeExpenses(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: ONE_TIME_EXPENSES_QUERY_KEY,
        queryFn: async (): Promise<OneTimeExpense[]> => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getOneTimeExpenses();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useRecurringExpenses(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: RECURRING_EXPENSES_QUERY_KEY,
        queryFn: async (): Promise<RecurringExpense[]> => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getRecurringExpenses();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useEMIPayments(activeHouseholdId: string | undefined) {
    return useQuery({
        queryKey: EMI_PAYMENTS_QUERY_KEY,
        queryFn: async (): Promise<EMIPayment[]> => {
            if (!activeHouseholdId) return [];
            return await googleApiService.getEMIPayments();
        },
        enabled: !!activeHouseholdId,
    });
}

export function useAddGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (goal: Partial<Goal> & { goalName: string; targetAmount: number }) => {
            await googleApiService.addGoal(goal);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
        }
    });
}

export function useAddOneTimeExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (expense: Partial<OneTimeExpense> & { category: string; amount: number; spender: string }) => {
            await googleApiService.addOneTimeExpense(expense);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ONE_TIME_EXPENSES_QUERY_KEY });
        }
    });
}

export function useUpdateRecurringExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (expense: Partial<RecurringExpense> & { expenseName: string; amount: number; frequency: string; startDate: string }) => {
            await googleApiService.updateRecurringExpense(expense);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RECURRING_EXPENSES_QUERY_KEY });
        }
    });
}

export function useLogEmiPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payment: Partial<EMIPayment> & { emiId: string; amountPaid: number }) => {
            await googleApiService.logEmiPayment(payment);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMI_PAYMENTS_QUERY_KEY });
        }
    });
}
