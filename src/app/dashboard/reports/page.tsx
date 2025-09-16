

'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, ListFilter, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/firebase/hooks"
import { getInvoices, getClients, getClientTypes } from "@/lib/firebase/service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Invoice, Client, ClientType } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface BreakdownItem {
  name: string;
  salesDOP: number;
  salesUSD: number;
  profitDOP: number;
  profitUSD: number;
  pendingDOP: number;
  pendingUSD: number;
}

interface ReportData {
  summary: {
    totalSalesDOP: number;
    totalSalesUSD: number;
    totalProfitDOP: number;
    totalProfitUSD: number;
    totalPendingDOP: number;
    totalPendingUSD: number;
  };
  byProduct: BreakdownItem[];
  byClient: BreakdownItem[];
  byClientType: BreakdownItem[];
}

type TimeRange = 'week' | 'month' | 'year' | 'all';

export default function ReportsPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    const formatCurrency = (num: number, currency: 'DOP' | 'USD' = 'DOP') => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(num);
    };

    const fetchReportData = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const [allInvoices, allClients, allClientTypes] = await Promise.all([
                getInvoices(userId),
                getClients(userId),
                getClientTypes(userId)
            ]);

            const now = new Date();
            const filteredInvoices = allInvoices.filter(invoice => {
                const issueDate = new Date(invoice.issueDate);
                if (timeRange === 'all') return true;
                if (timeRange === 'year') return issueDate.getFullYear() === now.getFullYear();
                if (timeRange === 'month') return issueDate.getFullYear() === now.getFullYear() && issueDate.getMonth() === now.getMonth();
                if (timeRange === 'week') {
                    const oneWeekAgo = new Date(now);
                    oneWeekAgo.setDate(now.getDate() - 7);
                    return issueDate >= oneWeekAgo;
                }
                return false;
            });

            if (filteredInvoices.length === 0) {
               setReportData(null);
               setLastUpdated(new Date());
               setLoading(false);
               return;
            }
            
            const calculateInvoiceProfit = (invoice: Invoice): number => {
                const netSubtotal = invoice.subtotal - (invoice.discountTotal || 0);
                const totalCost = invoice.items.reduce((totalProfit, item) => {
                    if (typeof item.unitCost !== 'number') {
                        return totalProfit;
                    }
                    return totalProfit + (item.unitCost * item.quantity);
                }, 0);
                return netSubtotal - totalCost;
            };

            const summary = {
                totalSalesDOP: filteredInvoices.filter(inv => (inv.currency || 'DOP') === 'DOP').reduce((sum, inv) => sum + (inv.subtotal - (inv.discountTotal || 0)), 0),
                totalSalesUSD: filteredInvoices.filter(inv => inv.currency === 'USD').reduce((sum, inv) => sum + (inv.subtotal - (inv.discountTotal || 0)), 0),
                totalProfitDOP: filteredInvoices.filter(inv => (inv.currency || 'DOP') === 'DOP').reduce((sum, inv) => sum + calculateInvoiceProfit(inv), 0),
                totalProfitUSD: filteredInvoices.filter(inv => inv.currency === 'USD').reduce((sum, inv) => sum + calculateInvoiceProfit(inv), 0),
                totalPendingDOP: filteredInvoices.filter(inv => (inv.currency || 'DOP') === 'DOP').reduce((sum, inv) => sum + inv.balanceDue, 0),
                totalPendingUSD: filteredInvoices.filter(inv => inv.currency === 'USD').reduce((sum, inv) => sum + inv.balanceDue, 0),
            };

            const productMap = new Map<string, Omit<BreakdownItem, 'name'>>();
            filteredInvoices.forEach(inv => {
                inv.items.forEach(item => {
                    const current = productMap.get(item.productName) || { salesDOP: 0, salesUSD: 0, pendingDOP: 0, pendingUSD: 0, profitDOP: 0, profitUSD: 0 };
                    const itemNetTotal = (item.finalPrice ?? item.unitPrice) * item.quantity;
                    const itemCost = (item.unitCost ?? 0) * item.quantity;
                    const itemProfit = itemNetTotal - itemCost;
                    const itemProportionOfTotal = inv.total > 0 ? ((itemNetTotal / (inv.subtotal - (inv.discountTotal || 0))) * inv.balanceDue) : 0;

                    if ((inv.currency || 'DOP') === 'DOP') {
                        current.salesDOP += itemNetTotal;
                        current.profitDOP += itemProfit;
                        if(inv.balanceDue > 0) current.pendingDOP += itemProportionOfTotal;
                    } else {
                        current.salesUSD += itemNetTotal;
                        current.profitUSD += itemProfit;
                        if(inv.balanceDue > 0) current.pendingUSD += itemProportionOfTotal;
                    }
                    productMap.set(item.productName, current);
                });
            });
            const byProduct = Array.from(productMap, ([name, data]) => ({ name, ...data }))
              .sort((a, b) => (b.salesDOP + b.salesUSD) - (a.salesDOP + a.salesUSD));


            const clientMap = new Map<string, Omit<BreakdownItem, 'name'>>();
            filteredInvoices.forEach(inv => {
                const current = clientMap.get(inv.clientName) || { salesDOP: 0, salesUSD: 0, pendingDOP: 0, pendingUSD: 0, profitDOP: 0, profitUSD: 0 };
                const profit = calculateInvoiceProfit(inv);
                const netSubtotal = inv.subtotal - (inv.discountTotal || 0);

                 if ((inv.currency || 'DOP') === 'DOP') {
                    current.salesDOP += netSubtotal;
                    current.pendingDOP += inv.balanceDue;
                    current.profitDOP += profit;
                } else {
                    current.salesUSD += netSubtotal;
                    current.pendingUSD += inv.balanceDue;
                    current.profitUSD += profit;
                }
                clientMap.set(inv.clientName, current);
            });
            const byClient = Array.from(clientMap, ([name, data]) => ({ name, ...data }))
              .sort((a, b) => (b.salesDOP + b.salesUSD) - (a.salesDOP + a.salesUSD));


            const clientTypeMap = new Map<string, Omit<BreakdownItem, 'name'>>();
            const clientTypesInfo = new Map(allClientTypes.map(ct => [ct.id, ct.name]));
            const clientIdToTypeMap = new Map(allClients.map(c => [c.id, clientTypesInfo.get(c.clientTypeId) || 'Sin Asignar']));

            filteredInvoices.forEach(inv => {
                const clientTypeName = clientIdToTypeMap.get(inv.clientId) || 'Sin Asignar';
                const current = clientTypeMap.get(clientTypeName) || { salesDOP: 0, salesUSD: 0, pendingDOP: 0, pendingUSD: 0, profitDOP: 0, profitUSD: 0 };
                const profit = calculateInvoiceProfit(inv);
                const netSubtotal = inv.subtotal - (inv.discountTotal || 0);

                 if ((inv.currency || 'DOP') === 'DOP') {
                    current.salesDOP += netSubtotal;
                    current.pendingDOP += inv.balanceDue;
                    current.profitDOP += profit;
                } else {
                    current.salesUSD += netSubtotal;
                    current.pendingUSD += inv.balanceDue;
                    current.profitUSD += profit;
                }
                clientTypeMap.set(clientTypeName, current);
            });
            const byClientType = Array.from(clientTypeMap, ([name, data]) => ({ name, ...data }))
              .sort((a, b) => (b.salesDOP + b.salesUSD) - (a.salesDOP + a.salesUSD));


            setReportData({ summary, byProduct, byClient, byClientType });
            setLastUpdated(new Date());

        } catch (error) {
            console.error("Error fetching report data", error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (userId) {
            fetchReportData();
        }
    }, [userId, timeRange]);
    
    const timeRangeLabels: Record<TimeRange, string> = {
        week: 'Últimos 7 días',
        month: 'Este Mes',
        year: 'Este Año',
        all: 'Histórico'
    };

    const handleExportPDF = async () => {
        if (!reportData) return;
        const { default: jsPDF } = await import("jspdf");
        await import("jspdf-autotable");

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(`Reporte de Ventas - ${timeRangeLabels[timeRange]}`, 14, 22);
        doc.setFontSize(12);
        doc.text(`Fecha de Exportación: ${new Date().toLocaleDateString()}`, 14, 30);
        
        (doc as any).autoTable({
            startY: 40,
            head: [['Métrica de Resumen', 'Valor']],
            body: [
                ["Total Ventas Netas (DOP)", formatCurrency(reportData.summary.totalSalesDOP, 'DOP')],
                ["Total Ventas Netas (USD)", formatCurrency(reportData.summary.totalSalesUSD, 'USD')],
                ["Ganancia Total (DOP)", formatCurrency(reportData.summary.totalProfitDOP, 'DOP')],
                ["Ganancia Total (USD)", formatCurrency(reportData.summary.totalProfitUSD, 'USD')],
                ["Balance Pendiente (DOP)", formatCurrency(reportData.summary.totalPendingDOP, 'DOP')],
                ["Balance Pendiente (USD)", formatCurrency(reportData.summary.totalPendingUSD, 'USD')],
            ],
            theme: 'grid',
        });
        
        const addSection = (title: string, data: BreakdownItem[]) => {
            const startY = (doc as any).lastAutoTable.finalY + 15;
            if (startY > 250) {
                doc.addPage();
                (doc as any).lastAutoTable.finalY = 10;
            }
            doc.setFontSize(14);
            doc.text(title, 14, (doc as any).lastAutoTable.finalY + 10);
            (doc as any).autoTable({
                startY: (doc as any).lastAutoTable.finalY + 15,
                head: [['Nombre', 'Ventas (DOP)', 'Ventas (USD)', 'Ganancia (DOP)', 'Ganancia (USD)', 'Pendiente (DOP)', 'Pendiente (USD)']],
                body: data.map(item => [
                    item.name,
                    formatCurrency(item.salesDOP, 'DOP'),
                    formatCurrency(item.salesUSD, 'USD'),
                    formatCurrency(item.profitDOP, 'DOP'),
                    formatCurrency(item.profitUSD, 'USD'),
                    formatCurrency(item.pendingDOP, 'DOP'),
                    formatCurrency(item.pendingUSD, 'USD'),
                ]),
                theme: 'striped',
            });
        }
        
        addSection('Reporte por Productos', reportData.byProduct);
        addSection('Reporte por Clientes', reportData.byClient);
        addSection('Reporte por Tipos de Cliente', reportData.byClientType);

        doc.save(`reporte_ventas_${timeRange}.pdf`);
    };

    const handleExportExcel = async () => {
        if (!reportData) return;
        const XLSX = await import('xlsx');
        
        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: `Reporte de Ventas ${timeRangeLabels[timeRange]}`,
            Author: "Ventas Claras",
            CreatedDate: new Date()
        };

        const summaryData = [
            { Métrica: "Total Ventas Netas (DOP)", Valor: reportData.summary.totalSalesDOP },
            { Métrica: "Total Ventas Netas (USD)", Valor: reportData.summary.totalSalesUSD },
            { Métrica: "Ganancia Total (DOP)", Valor: reportData.summary.totalProfitDOP },
            { Métrica: "Ganancia Total (USD)", Valor: reportData.summary.totalProfitUSD },
            { Métrica: "Balance Pendiente (DOP)", Valor: reportData.summary.totalPendingDOP },
            { Métrica: "Balance Pendiente (USD)", Valor: reportData.summary.totalPendingUSD },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

        const productData = reportData.byProduct.map(p => ({
            'Producto': p.name, 'Ventas (DOP)': p.salesDOP, 'Ventas (USD)': p.salesUSD, 'Ganancia (DOP)': p.profitDOP, 'Ganancia (USD)': p.profitUSD, 'Pendiente (DOP)': p.pendingDOP, 'Pendiente (USD)': p.pendingUSD,
        }));
        const wsProduct = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(wb, wsProduct, "Por Producto");
        
        const clientData = reportData.byClient.map(c => ({
            'Cliente': c.name, 'Ventas (DOP)': c.salesDOP, 'Ventas (USD)': c.salesUSD, 'Ganancia (DOP)': c.profitDOP, 'Ganancia (USD)': c.profitUSD, 'Pendiente (DOP)': c.pendingDOP, 'Pendiente (USD)': c.pendingUSD,
        }));
        const wsClient = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(wb, wsClient, "Por Cliente");
        
        const clientTypeData = reportData.byClientType.map(ct => ({
            'Tipo de Cliente': ct.name, 'Ventas (DOP)': ct.salesDOP, 'Ventas (USD)': ct.salesUSD, 'Ganancia (DOP)': ct.profitDOP, 'Ganancia (USD)': ct.profitUSD, 'Pendiente (DOP)': ct.pendingDOP, 'Pendiente (USD)': ct.pendingUSD,
        }));
        const wsClientType = XLSX.utils.json_to_sheet(clientTypeData);
        XLSX.utils.book_append_sheet(wb, wsClientType, "Por Tipo de Cliente");

        XLSX.writeFile(wb, `reporte_ventas_${timeRange}.xlsx`);
    };

    if (loading) {
        return (
         <div className="flex flex-col gap-8">
            <PageHeader title="Reportes" description="Analiza el rendimiento de tus ventas." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({length: 4}).map((_, i) => (
                    <Card key={i}>
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-10 w-1/2" /></CardContent>
                    </Card>
                ))}
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-10 w-96" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
             </Card>
         </div>
       )
    }
    
    const renderBreakdownTable = (title: string, data: BreakdownItem[]) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{title.split(' ').pop()}</TableHead>
                                <TableHead className="text-right">Ventas (DOP)</TableHead>
                                <TableHead className="text-right">Ventas (USD)</TableHead>
                                <TableHead className="text-right">Ganancia (DOP)</TableHead>
                                <TableHead className="text-right">Ganancia (USD)</TableHead>
                                <TableHead className="text-right">Pendiente (DOP)</TableHead>
                                <TableHead className="text-right">Pendiente (USD)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length > 0 ? data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.salesDOP, 'DOP')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.salesUSD, 'USD')}</TableCell>
                                    <TableCell className={cn("text-right", item.profitDOP >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(item.profitDOP, 'DOP')}</TableCell>
                                    <TableCell className={cn("text-right", item.profitUSD >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(item.profitUSD, 'USD')}</TableCell>
                                    <TableCell className="text-right text-destructive">{formatCurrency(item.pendingDOP, 'DOP')}</TableCell>
                                    <TableCell className="text-right text-destructive">{formatCurrency(item.pendingUSD, 'USD')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">No hay datos para este período.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-8">
            <PageHeader 
              title="Reportes" 
              description={
                lastUpdated 
                ? `Datos para: ${timeRangeLabels[timeRange]}. Actualizado: ${lastUpdated.toLocaleString()}`
                : "Analiza el rendimiento de tus ventas."
              }
            >
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchReportData} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="ml-2 hidden sm:inline">Actualizar</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="gap-1"><ListFilter className="h-3.5 w-3.5" /><span>{timeRangeLabels[timeRange]}</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filtrar por Período</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setTimeRange('week')}>Semanal</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTimeRange('month')}>Mensual</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTimeRange('year')}>Anual</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setTimeRange('all')}>Total Histórico</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button className="gap-1"><Download className="h-3.5 w-3.5" /><span>Exportar</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Opciones de Exportación</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleExportPDF}>Exportar a PDF</DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleExportExcel}>Exportar a Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </PageHeader>

            {reportData ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Ventas Netas (DOP)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalSalesDOP, 'DOP')}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Ventas Netas (USD)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalSalesUSD, 'USD')}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Ganancia (DOP)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary.totalProfitDOP, 'DOP')}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Ganancia (USD)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary.totalProfitUSD, 'USD')}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Pendiente (DOP)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.totalPendingDOP, 'DOP')}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Pendiente (USD)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(reportData.summary.totalPendingUSD, 'USD')}</p></CardContent></Card>
                </div>

                <Tabs defaultValue="products" className="w-full">
                  <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="products">Por Producto</TabsTrigger>
                    <TabsTrigger value="clients">Por Cliente</TabsTrigger>
                    <TabsTrigger value="clientTypes">Por Tipo de Cliente</TabsTrigger>
                  </TabsList>
                  <TabsContent value="products" className="mt-4">
                    {renderBreakdownTable('Reporte por Productos', reportData.byProduct)}
                  </TabsContent>
                  <TabsContent value="clients" className="mt-4">
                    {renderBreakdownTable('Reporte por Clientes', reportData.byClient)}
                  </TabsContent>
                  <TabsContent value="clientTypes" className="mt-4">
                    {renderBreakdownTable('Reporte por Tipos de Cliente', reportData.byClientType)}
                  </TabsContent>
                </Tabs>
            </>
            ) : (
                <Card>
                    <CardContent className="pt-6 text-center h-24 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos de facturación para el período seleccionado.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
