
"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Users,
  ExternalLink,
  Briefcase,
  UserX,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/firebase/hooks"
import { getAllInvoicesForAdmin, getAllClientsForAdmin, getTeamMembers } from "@/lib/firebase/service"
import type { Invoice, Client, UserProfile } from "@/lib/types"

const chartConfig = {
  total: {
    label: "Ventas",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function AdminDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (role !== 'admin' && role !== 'superAdmin') {
        setDataLoading(false);
        return;
    };

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [invoicesData, clientsData, teamData] = await Promise.all([
          getAllInvoicesForAdmin(),
          getAllClientsForAdmin(),
          getTeamMembers(),
        ]);
        setInvoices(invoicesData);
        setClients(clientsData);
        setTeam(teamData);
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [role, authLoading]);

  const formatCurrency = (amount: number, currency?: 'DOP' | 'USD') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP' }).format(amount);
  }

  const dashboardData = useMemo(() => {
    if (dataLoading) return null;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // DOP Calculations
    const dopInvoices = invoices.filter(inv => (inv.currency || 'DOP') === 'DOP');
    const totalSalesDOP = dopInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingBalanceDOP = dopInvoices
      .filter(inv => inv.status !== 'pagada')
      .reduce((sum, inv) => sum + inv.balanceDue, 0);
    const salesThisMonthDOP = dopInvoices
      .filter(inv => {
        const [year, month] = inv.issueDate.split('-').map(Number);
        return year === currentYear && month - 1 === currentMonth;
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    // USD Calculations
    const usdInvoices = invoices.filter(inv => inv.currency === 'USD');
    const totalSalesUSD = usdInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingBalanceUSD = usdInvoices
      .filter(inv => inv.status !== 'pagada')
      .reduce((sum, inv) => sum + inv.balanceDue, 0);
    const salesThisMonthUSD = usdInvoices
      .filter(inv => {
        const [year, month] = inv.issueDate.split('-').map(Number);
        return year === currentYear && month - 1 === currentMonth;
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalClientsCount = clients.length;
    const totalUsersCount = team.length;
    
    const userSalesDOPThisMonth = new Map<string, number>();
    invoices
        .filter(inv => {
            const [year, month] = inv.issueDate.split('-').map(Number);
            return year === currentYear && month - 1 === currentMonth && (inv.currency || 'DOP') === 'DOP';
        })
        .forEach(inv => {
            if (inv.userId) {
              const currentSales = userSalesDOPThisMonth.get(inv.userId) || 0;
              userSalesDOPThisMonth.set(inv.userId, currentSales + inv.total);
            }
        });
    
    const allUserSales = team.map(user => ({
        id: user.id,
        name: user.name || 'Usuario Desconocido',
        email: user.email || '',
        totalSold: userSalesDOPThisMonth.get(user.id) || 0,
    }));

    const topSalespeopleThisMonth = [...allUserSales]
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

    const bottomSalespeopleThisMonth = [...allUserSales]
        .sort((a, b) => a.totalSold - b.totalSold)
        .slice(0, 5);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartDataMonths = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chartDataMonths.push({
            monthLabel: `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`,
            month: d.getMonth(),
            year: d.getFullYear(),
            total: 0,
        });
    }

    dopInvoices.forEach(invoice => {
        const [year, month] = invoice.issueDate.split('-').map(Number);
        const invoiceMonth = month - 1;
        const invoiceYear = year;
        
        const monthBucket = chartDataMonths.find(m => m.month === invoiceMonth && m.year === invoiceYear);

        if (monthBucket) {
            monthBucket.total += invoice.total;
        }
    });

    return {
      totalSalesDOP,
      totalSalesUSD,
      pendingBalanceDOP,
      pendingBalanceUSD,
      salesThisMonthDOP,
      salesThisMonthUSD,
      totalClientsCount,
      totalUsersCount,
      topSalespeopleThisMonth,
      bottomSalespeopleThisMonth,
      chartData: chartDataMonths,
    };
  }, [invoices, clients, team, dataLoading]);

  const pageLoading = authLoading || dataLoading;

  if (pageLoading) {
    return (
        <>
            <PageHeader title="Panel del Administrador" description="Un resumen de la actividad de ventas de toda la plataforma." />
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {Array.from({length: 8}).map((_, i) => (
                    <Card key={i}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-40 mt-1" /></CardContent></Card>
                ))}
            </div>
             <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-1/2"/></CardTitle>
                        <CardDescription><Skeleton className="h-4 w-3/4"/></CardDescription>
                    </CardHeader>
                    <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
                </Card>
                <div className="flex flex-col gap-4 md:gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-6 w-2/3"/></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-full"/></CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-8">
                            {Array.from({length: 3}).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="grid gap-1 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-5 w-20" /></div>))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-6 w-3/4"/></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-full"/></CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-8">
                            {Array.from({length: 3}).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="grid gap-1 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-5 w-20" /></div>))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
  }
  
  if (role !== 'admin' && role !== 'superAdmin') {
      return null;
  }

  return (
    <>
      <PageHeader
        title="Panel del Administrador"
        description="Un resumen de la actividad de ventas de toda la plataforma."
      >
        <Button asChild variant="outline" size="sm">
            <Link href="https://console.firebase.google.com/project/ventas-claras/analytics/events" target="_blank">
                <ExternalLink className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Ver Analíticas</span>
            </Link>
        </Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes (DOP)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.salesThisMonthDOP || 0, 'DOP')}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes (USD)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.salesThisMonthUSD || 0, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Pendiente (DOP)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(dashboardData?.pendingBalanceDOP || 0, 'DOP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Pendiente (USD)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(dashboardData?.pendingBalanceUSD || 0, 'USD')}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas Totales (DOP)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.totalSalesDOP || 0, 'DOP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas Totales (USD)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.totalSalesUSD || 0, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardData?.totalClientsCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardData?.totalUsersCount || 0}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes (Plataforma)</CardTitle>
            <CardDescription>
               Un resumen de las ventas en DOP de los últimos 6 meses en toda la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => formatCurrency(value as number, 'DOP')}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number, 'DOP')} />}
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 md:gap-8">
            <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                <CardTitle>Top Vendedores del Mes</CardTitle>
                <CardDescription>
                    Usuarios que generaron más ventas (DOP) este mes.
                </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/dashboard/team">
                    Ver Equipo
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
                </Button>
            </CardHeader>
            <CardContent className="grid gap-8">
                {dashboardData?.topSalespeopleThisMonth && dashboardData.topSalespeopleThisMonth.length > 0 ? (
                dashboardData.topSalespeopleThisMonth.map(user => (
                    <div key={user.id} className="flex items-center gap-4">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={`https://placehold.co/40x40.png`} alt="Avatar" data-ai-hint="person portrait" />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1 flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                        </p>
                    </div>
                    <div className="ml-auto font-medium">{formatCurrency(user.totalSold, 'DOP')}</div>
                    </div>
                ))
                ) : (
                <div className="text-center text-sm text-muted-foreground py-8">No hay ventas en DOP este mes.</div>
                )}
            </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                  <CardTitle>Vendedores con Menor Actividad</CardTitle>
                  <CardDescription>
                    Usuarios con menos ventas (DOP) este mes.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-8">
                {dashboardData?.bottomSalespeopleThisMonth && dashboardData.bottomSalespeopleThisMonth.length > 0 ? (
                  dashboardData.bottomSalespeopleThisMonth.map(user => (
                    <div key={user.id} className="flex items-center gap-4">
                      <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={`https://placehold.co/40x40.png`} alt="Avatar" data-ai-hint="person portrait" />
                        <AvatarFallback><UserX className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1 flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-muted-foreground">{formatCurrency(user.totalSold, 'DOP')}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">Todos los vendedores tuvieron actividad este mes.</div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </>
  )
}
