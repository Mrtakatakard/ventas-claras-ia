
"use client"

import {
    Activity,
    CreditCard,
    FilePlus,
    FilePenLine,
    UserPlus,
    PackagePlus,
    Users,
    Package,
} from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from "recharts"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInvoices } from "@/hooks/useInvoices"
import { useClients } from "@/hooks/useClients"
import { useProducts } from "@/hooks/useProducts"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { formatCurrency } from "@/lib/utils"

export default function DashboardPage() {
    const { invoices, isLoadingInvoices } = useInvoices();
    const { clients, isLoadingClients } = useClients();
    const { products, isLoadingProducts } = useProducts();

    const loading = isLoadingInvoices || isLoadingClients || isLoadingProducts;

    const dashboardData = useDashboardMetrics({ invoices, clients, products, isLoading: loading });

    // Chart configurations
    const productChartConfig: ChartConfig = {
        sales: { label: "Ventas" },
        ...(dashboardData?.productSales.reduce((acc, item, index) => {
            const key = item.product.replace(/\s/g, '');
            return {
                ...acc,
                [key]: { label: item.product, color: `hsl(var(--chart-${index + 1}))` }
            }
        }, {}) || {})
    };

    const clientDOPChartConfig: ChartConfig = {
        value: { label: "Actividad (DOP)" },
        ...(dashboardData?.clientActivityDOP.reduce((acc, item, index) => {
            const key = item.client.replace(/\s/g, '');
            return { ...acc, [key]: { label: item.client, color: `hsl(var(--chart-${index + 1}))` } }
        }, {}) || {})
    };

    const clientUSDChartConfig: ChartConfig = {
        value: { label: "Actividad (USD)" },
        ...(dashboardData?.clientActivityUSD.reduce((acc, item, index) => {
            const key = item.client.replace(/\s/g, '');
            return { ...acc, [key]: { label: item.client, color: `hsl(var(--chart-${index + 1}))` } }
        }, {}) || {})
    };

    const COLORS = [
        "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
        "hsl(var(--chart-4))", "hsl(var(--chart-5))",
    ];


    if (loading) {
        return (
            <>
                <PageHeader title="Panel de Control" description="Un resumen de tu actividad de ventas." />
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><div className="text-xs text-muted-foreground pt-1"><Skeleton className="h-4 w-40 mt-1" /></div></CardContent></Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-40 mt-1" /></CardContent></Card>
                    ))}
                </div>
                <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-2">
                    <Card className="xl:col-span-1"><CardHeader><CardTitle><Skeleton className="h-6 w-3/5" /></CardTitle><CardDescription><Skeleton className="h-4 w-4/5" /></CardDescription></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                    <Card className="xl:col-span-1"><CardHeader><CardTitle><Skeleton className="h-6 w-3/5" /></CardTitle><CardDescription><Skeleton className="h-4 w-4/5" /></CardDescription></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Panel de Control"
                description="Un resumen de tu actividad de ventas."
            />
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-6">
                <Link href="/dashboard/invoices/create">
                    <Card className="bg-[hsl(var(--chart-3)/0.1)] hover:border-[hsl(var(--chart-3))] transition-all h-full flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Crear Factura</CardTitle>
                            <FilePlus className="h-4 w-4 text-[hsl(var(--chart-3))]" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Genera una nueva factura para un cliente.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/quotes/create">
                    <Card className="bg-[hsl(var(--chart-2)/0.2)] hover:border-primary transition-all h-full flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Crear Cotización</CardTitle>
                            <FilePenLine className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Prepara y envía una cotización formal.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/clients?action=create">
                    <Card className="bg-[hsl(var(--chart-4)/0.1)] hover:border-[hsl(var(--chart-4))] transition-all h-full flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Crear Cliente</CardTitle>
                            <UserPlus className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Añade un nuevo cliente a tu lista.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/products?action=create">
                    <Card className="bg-[hsl(var(--chart-1)/0.1)] hover:border-[hsl(var(--chart-1))] transition-all h-full flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Crear Producto</CardTitle>
                            <PackagePlus className="h-4 w-4 text-[hsl(var(--chart-1))]" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Agrega un nuevo producto a tu inventario.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {!dashboardData || (invoices.length === 0 && clients.length === 0) ? (
                <Card>
                    <CardContent className="pt-6 text-center h-24 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos suficientes para generar un resumen. ¡Crea tu primera factura!</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ventas del Mes (DOP)</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(dashboardData.salesThisMonthDOP, 'DOP')}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ventas del Mes (USD)</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(dashboardData.salesThisMonthUSD, 'USD')}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{dashboardData.activeClientsCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dashboardData.productsCount}</div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                        <Card>
                            <CardHeader><CardTitle>Productos Más Vendidos</CardTitle><CardDescription>Top 5 productos más vendidos (por unidades).</CardDescription></CardHeader>
                            <CardContent>
                                {dashboardData.productSales.length > 0 ? (
                                    <ChartContainer config={productChartConfig} className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={dashboardData.productSales} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                <CartesianGrid horizontal={false} />
                                                <YAxis dataKey="product" type="category" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                                <XAxis type="number" hide />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                                <Bar dataKey="sales" radius={5}>{dashboardData.productSales.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                ) : (<div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de ventas de productos.</div>)}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Clientes Más Activos</CardTitle><CardDescription>Distribución de ventas por cliente y moneda.</CardDescription></CardHeader>
                            <CardContent>
                                <Tabs defaultValue="dop" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="dop">Actividad (DOP)</TabsTrigger>
                                        <TabsTrigger value="usd">Actividad (USD)</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="dop">
                                        {dashboardData.clientActivityDOP.length > 0 ? (
                                            <ChartContainer config={clientDOPChartConfig} className="h-[350px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => `${name}: ${formatCurrency(value as number, 'DOP')}`} />} />
                                                        <Pie data={dashboardData.clientActivityDOP} dataKey="value" nameKey="client" innerRadius={80} strokeWidth={5}>{dashboardData.clientActivityDOP.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        ) : (<div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de actividad de clientes en DOP.</div>)}
                                    </TabsContent>
                                    <TabsContent value="usd">
                                        {dashboardData.clientActivityUSD.length > 0 ? (
                                            <ChartContainer config={clientUSDChartConfig} className="h-[350px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => `${name}: ${formatCurrency(value as number, 'USD')}`} />} />
                                                        <Pie data={dashboardData.clientActivityUSD} dataKey="value" nameKey="client" innerRadius={80} strokeWidth={5}>{dashboardData.clientActivityUSD.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        ) : (<div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de actividad de clientes en USD.</div>)}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </>
    )
}
