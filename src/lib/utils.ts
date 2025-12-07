import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(num: number, currency?: 'DOP' | 'USD') {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency || 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}
