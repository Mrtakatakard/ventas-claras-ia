"use client"

import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  LineChart,
  Settings,
  Menu,
  Package,
  FileText,
  FilePenLine,
  LogOut,
  Loader2,
  Bell,
  BookUser,
  CalendarClock,
  Archive,
  X,
  ArrowUp,
  Crown,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/firebase/hooks"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { getProducts, getInvoices } from "@/lib/firebase/service"
import type { Product } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Breadcrumb } from "@/components/breadcrumb"

const userNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Panel de Control" },
  { href: "/dashboard/clients", icon: Users, label: "Clientes" },
  { href: "/dashboard/products", icon: Package, label: "Productos" },
  { href: "/dashboard/quotes", icon: FilePenLine, label: "Cotizaciones" },
  { href: "/dashboard/invoices", icon: FileText, label: "Facturas" },
  { href: "/dashboard/accounts-receivable", icon: BookUser, label: "Cuentas por Cobrar" },
  { href: "/dashboard/reports", icon: LineChart, label: "Reportes" },
]

const adminNavItems = [
  { href: "/dashboard/admin", icon: LayoutDashboard, label: "Panel de Admin" },
  { href: "/dashboard/team", icon: Users, label: "Gestionar Equipo" },
  { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
]


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, role, userId, planId } = useAuth();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [followUps, setFollowUps] = useState<{ clientName: string; clientId: string; productName: string; restockDate: string; }[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // This state is for an admin to toggle between admin and user views
  const [viewAsAdmin, setViewAsAdmin] = useState(true);

  const isActualAdmin = role === 'admin' || role === 'superAdmin';

  // Determine which navigation items to show
  // If user is an admin, the view can be toggled. Otherwise, it's always user view.
  const navItems = isActualAdmin && viewAsAdmin ? adminNavItems : userNavItems;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    // If the user is not an admin, ensure they are not seeing the admin view.
    if (!isActualAdmin) {
      setViewAsAdmin(false);
    }
  }, [user, loading, router, isActualAdmin]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return;
      try {
        const products = await getProducts(userId);
        const lowStock = products.filter(p => {
          const stock = p.batches?.reduce((acc, b) => acc + b.stock, 0) || 0;
          return stock <= (p.notificationThreshold ?? 10);
        });
        setLowStockProducts(lowStock);

        const invoices = await getInvoices(userId)
        const productsMap = new Map(products.map(p => [p.id, p]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const upcoming: { clientName: string; clientId: string; productName: string; restockDate: string; }[] = [];

        invoices.forEach(invoice => {
          if (invoice.items) {
            invoice.items.forEach(item => {
              if (item.followUpStatus === 'pendiente') {
                const product = productsMap.get(item.productId);
                let restockDate = '';
                if (product?.restockTimeDays && product.restockTimeDays > 0) {
                  const numberOfPeople = item.numberOfPeople || 1;
                  const quantity = item.quantity || 1;
                  if (numberOfPeople > 0) {
                    const durationInDays = Math.floor((product.restockTimeDays * quantity) / numberOfPeople);
                    const [year, month, day] = invoice.issueDate.split('-').map(Number);
                    const utcSaleDate = new Date(Date.UTC(year, month - 1, day));
                    utcSaleDate.setUTCDate(utcSaleDate.getUTCDate() + durationInDays);
                    restockDate = utcSaleDate.toISOString().split('T')[0];

                    const parts = restockDate.split('-');
                    if (parts.length === 3) {
                      const restockDateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      if (restockDateObj >= today && restockDateObj <= sevenDaysFromNow) {
                        upcoming.push({
                          clientName: invoice.clientName,
                          clientId: invoice.clientId,
                          productName: item.productName,
                          restockDate: restockDate
                        });
                      }
                    }
                  }
                }
              }
            });
          }
        });
        setFollowUps(upcoming.sort((a, b) => new Date(a.restockDate).getTime() - new Date(b.restockDate).getTime()));

      } catch (error) {
        console.error("Failed to fetch notifications data:", error);
      }
    };

    if (role === 'user' || (isActualAdmin && !viewAsAdmin)) {
      fetchNotifications();
      const intervalId = setInterval(fetchNotifications, 60000); // every minute
      return () => clearInterval(intervalId);
    }
  }, [userId, role, isActualAdmin, viewAsAdmin]);


  const handleSignOut = async () => {
    await signOut(auth);
  }

  const handleDismissNotification = (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedNotifications(prev => new Set(prev).add(notificationId));
  };

  useEffect(() => {
    const contentEl = contentAreaRef.current;

    const handleScroll = () => {
      const scrollY = window.scrollY || contentEl?.scrollTop || 0;
      if (scrollY > 300) {
        setIsScrollButtonVisible(true);
      } else {
        setIsScrollButtonVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    contentEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      contentEl?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const capitalizeFirstLetter = (string: string | undefined) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <p>Cargando tu espacio de trabajo...</p>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null;
  }

  const getActiveLinkClass = (itemHref: string) => {
    // Exact match for the two dashboards
    if (itemHref === "/dashboard" || itemHref === "/dashboard/admin") {
      return pathname === itemHref ? "bg-secondary text-primary" : "";
    }
    // Starts with for other nested routes
    return pathname.startsWith(itemHref) ? "bg-secondary text-primary" : "";
  }

  const activeFollowUps = followUps.filter(f => !dismissedNotifications.has(`follow-${f.clientId}-${f.productName}-${f.restockDate}`));
  const activeLowStock = lowStockProducts.filter(p => !dismissedNotifications.has(`stock-${p.id}`));
  const totalNotifications = activeFollowUps.length + activeLowStock.length;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Logo />
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary",
                    getActiveLinkClass(item.href)
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div ref={contentAreaRef} className="flex flex-col md:overflow-y-auto">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <VisuallyHidden>
                <SheetHeader>
                  <SheetTitle>Menú de Navegación</SheetTitle>
                </SheetHeader>
              </VisuallyHidden>
              <div className="mt-4">
                <Logo />
              </div>
              <nav className="grid gap-2 text-lg font-medium mt-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      getActiveLinkClass(item.href) && "text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1 flex justify-end items-center gap-4">
            {isActualAdmin && (
              <div className="flex items-center gap-2">
                <Label htmlFor="role-switch" className="text-sm font-medium">Vista de Admin</Label>
                <Switch
                  id="role-switch"
                  checked={viewAsAdmin}
                  onCheckedChange={setViewAsAdmin}
                  aria-label="Toggle Admin View"
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  {totalNotifications > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{totalNotifications}</Badge>
                  )}
                  <span className="sr-only">Toggle notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[350px]">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {totalNotifications > 0 ? (
                    <>
                      {activeFollowUps.length > 0 && (
                        <>
                          {activeFollowUps.map((followUp) => {
                            const notificationId = `follow-${followUp.clientId}-${followUp.productName}-${followUp.restockDate}`;
                            return (
                              <DropdownMenuItem key={notificationId} asChild>
                                <Link href={`/dashboard/clients/${followUp.clientId}`} className="items-start relative group/notification w-full">
                                  <CalendarClock className="mr-2 mt-1 h-4 w-4 flex-shrink-0" />
                                  <div className="flex-1 flex flex-col pr-6">
                                    <span>Seguimiento: <span className="font-semibold">{followUp.clientName}</span></span>
                                    <span className="text-xs text-muted-foreground">{followUp.productName} - Vence: {followUp.restockDate}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-6 rounded-full opacity-0 group-hover/notification:opacity-100"
                                    onClick={(e) => handleDismissNotification(notificationId, e)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Descartar</span>
                                  </Button>
                                </Link>
                              </DropdownMenuItem>
                            )
                          })}
                        </>
                      )}
                      {activeLowStock.length > 0 && (
                        <>
                          {activeFollowUps.length > 0 && <DropdownMenuSeparator />}
                          {activeLowStock.map(product => {
                            const notificationId = `stock-${product.id}`;
                            return (
                              <DropdownMenuItem key={notificationId} asChild>
                                <Link href="/dashboard/products" className="items-start relative group/notification w-full">
                                  <Archive className="mr-2 mt-1 h-4 w-4 flex-shrink-0" />
                                  <div className="flex-1 flex flex-col pr-6">
                                    <span>Stock Bajo: <span className="font-semibold">{product.name}</span></span>
                                    <span className="text-xs text-muted-foreground">
                                      {(product.batches?.reduce((acc: number, b: any) => acc + b.stock, 0) || 0) === 0 ? 'Agotado' : `${product.batches?.reduce((acc: number, b: any) => acc + b.stock, 0) || 0} unidades restantes.`}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-6 rounded-full opacity-0 group-hover/notification:opacity-100"
                                    onClick={(e) => handleDismissNotification(notificationId, e)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Descartar</span>
                                  </Button>
                                </Link>
                              </DropdownMenuItem>
                            )
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay notificaciones nuevas.
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer">
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar>
                      <AvatarImage src={user.photoURL ?? ''} alt="Avatar de usuario" />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                  {planId === 'pro' && (
                    <Badge variant="default" className="absolute -top-1 -right-1 h-auto px-1.5 py-0.5 text-[10px] font-bold pointer-events-none ring-2 ring-background">
                      PRO
                    </Badge>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <div className="flex flex-col">
                    <span>{user.email}</span>
                    <span className="text-xs text-muted-foreground">Plan: {capitalizeFirstLetter(planId)}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <span>Cambiar de Plan (Próximamente)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>Configuración</DropdownMenuItem>
                <DropdownMenuItem disabled>Soporte</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6 bg-background">
          <Breadcrumb />
          {children}
        </main>
        {isScrollButtonVisible && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-lg z-50"
            size="icon"
            aria-label="Volver arriba"
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  )
}
