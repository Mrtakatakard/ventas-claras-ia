import { useMemo } from 'react';
import { Invoice, Client, Product } from '@/lib/types';

interface DashboardMetricsProps {
    invoices: Invoice[];
    clients: Client[];
    products: Product[];
    isLoading: boolean;
}

interface ProductSales {
    product: string;
    sales: number;
}

interface ClientActivity {
    client: string;
    value: number;
}

export function useDashboardMetrics({ invoices, clients, products, isLoading }: DashboardMetricsProps) {
    return useMemo(() => {
        if (isLoading) return null;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const salesThisMonthDOP = invoices
            .filter(inv => {
                const issueDate = new Date(inv.issueDate);
                return ((inv.currency || 'DOP') === 'DOP') && issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + inv.total, 0);

        const salesThisMonthUSD = invoices
            .filter(inv => {
                const issueDate = new Date(inv.issueDate);
                return (inv.currency === 'USD') && issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + inv.total, 0);

        const activeClientsCount = clients.length;
        const productsCount = products.length;
        const pendingBalanceDOP = invoices.filter(inv => inv.status !== 'pagada' && (inv.currency || 'DOP') === 'DOP').reduce((sum, inv) => sum + inv.balanceDue, 0);
        const pendingBalanceUSD = invoices.filter(inv => inv.status !== 'pagada' && inv.currency === 'USD').reduce((sum, inv) => sum + inv.balanceDue, 0);

        // Product Sales Chart Data
        const productSalesMap = new Map<string, number>();
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                productSalesMap.set(item.productName, (productSalesMap.get(item.productName) || 0) + item.quantity);
            });
        });
        const productSales: ProductSales[] = Array.from(productSalesMap, ([product, sales]) => ({ product, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

        // Client Activity Chart Data
        const clientActivityDOPMap = new Map<string, number>();
        invoices.forEach(inv => {
            if (inv.currency === 'DOP' || !inv.currency) {
                clientActivityDOPMap.set(inv.clientName, (clientActivityDOPMap.get(inv.clientName) || 0) + inv.total);
            }
        });
        let clientActivityDOP: ClientActivity[] = Array.from(clientActivityDOPMap, ([client, value]) => ({ client, value }))
            .sort((a, b) => b.value - a.value);

        if (clientActivityDOP.length > 4) {
            const topClients = clientActivityDOP.slice(0, 4);
            const othersValue = clientActivityDOP.slice(4).reduce((sum, val) => sum + val.value, 0);
            clientActivityDOP = [...topClients, { client: 'Otros', value: othersValue }];
        }

        const clientActivityUSDMap = new Map<string, number>();
        invoices.forEach(inv => {
            if (inv.currency === 'USD') {
                clientActivityUSDMap.set(inv.clientName, (clientActivityUSDMap.get(inv.clientName) || 0) + inv.total);
            }
        });
        let clientActivityUSD: ClientActivity[] = Array.from(clientActivityUSDMap, ([client, value]) => ({ client, value }))
            .sort((a, b) => b.value - a.value);

        if (clientActivityUSD.length > 4) {
            const topClients = clientActivityUSD.slice(0, 4);
            const othersValue = clientActivityUSD.slice(4).reduce((sum, val) => sum + val.value, 0);
            clientActivityUSD = [...topClients, { client: 'Otros', value: othersValue }];
        }

        return {
            salesThisMonthDOP,
            salesThisMonthUSD,
            activeClientsCount,
            productsCount,
            pendingBalanceDOP,
            pendingBalanceUSD,
            productSales,
            clientActivityDOP,
            clientActivityUSD
        };
    }, [invoices, clients, products, isLoading]);
}
