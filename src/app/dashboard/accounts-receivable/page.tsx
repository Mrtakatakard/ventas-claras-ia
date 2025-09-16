
'use client'

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { MoreHorizontal, Eye, Search, ChevronsUpDown, ArrowUp, ArrowDown, DollarSign, ChevronsLeft, ArrowLeft, ArrowRight, ChevronsRight, CreditCard } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/hooks";
import { getAccountsReceivableFromFunction } from "@/lib/firebase/service";
import type { Invoice } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AddPaymentForm } from "@/components/add-payment-form"

type SortKey = keyof Invoice;

export default function AccountsReceivablePage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const clientNameFromQuery = searchParams.get('clientName');
    if (clientNameFromQuery) {
        setFilter(clientNameFromQuery);
    }
  }, [searchParams]);

  const fetchInvoices = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch only receivable invoices directly from the optimized Cloud Function
      const receivableInvoices = await getAccountsReceivableFromFunction();
      setInvoices(receivableInvoices);
    } catch (error: any) {
       console.error("Error fetching accounts receivable:", error);
       toast({ title: "Error", description: error.message || "No se pudieron cargar las cuentas por cobrar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
  }, [userId, fetchInvoices]);
  
  const handleOpenPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    fetchInvoices();
  };

  useEffect(() => {
    if (!isPaymentDialogOpen) {
      setSelectedInvoice(null);
    }
  }, [isPaymentDialogOpen]);

  const formatCurrency = (num: number, currency: 'DOP' | 'USD' = 'DOP') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pagada": return "default";
      case "pendiente": return "secondary";
      case "parcialmente pagada": return "secondary";
      case "vencida": return "destructive";
      default: return "outline";
    }
  }
  
  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const { sortedInvoices, totalReceivableDOP, totalReceivableUSD } = useMemo(() => {
    let sortableItems = [...invoices].filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(filter.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(filter.toLowerCase()) ||
      invoice.status.toLowerCase().includes(filter.toLowerCase())
    );

    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            let comparison = 0;
            if (sortConfig.key === 'issueDate' || sortConfig.key === 'dueDate' || sortConfig.key === 'createdAt') {
                const dateA = aValue ? new Date(aValue as any).getTime() : 0;
                const dateB = bValue ? new Date(bValue as any).getTime() : 0;
                comparison = dateA - dateB;
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }

    const totalDOP = invoices
      .filter(inv => inv.currency === 'DOP' || !inv.currency)
      .reduce((sum, inv) => sum + inv.balanceDue, 0);
    
    const totalUSD = invoices
      .filter(inv => inv.currency === 'USD')
      .reduce((sum, inv) => sum + inv.balanceDue, 0);

    return { 
        sortedInvoices: sortableItems, 
        totalReceivableDOP: totalDOP,
        totalReceivableUSD: totalUSD
    };
  }, [invoices, filter, sortConfig]);
  
  const { paginatedInvoices, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = sortedInvoices.slice(startIndex, endIndex);
    const total = Math.ceil(sortedInvoices.length / rowsPerPage);
    return { paginatedInvoices: paginated, totalPages: total > 0 ? total : 1 };
  }, [sortedInvoices, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  if (loading) {
     return (
        <>
            <PageHeader title="Cuentas por Cobrar" description="Facturas pendientes de pago." />
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent></Card>
            </div>
            <Card className="mt-4"><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </>
    )
  }

  return (
    <>
      <PageHeader title="Cuentas por Cobrar" description="Un resumen de todas tus facturas pendientes de pago." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total por Cobrar (DOP)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalReceivableDOP, 'DOP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total por Cobrar (USD)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalReceivableUSD, 'USD')}</div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por #, cliente o estado..."
                className="w-full pl-8"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                   <Button variant="ghost" onClick={() => handleSort('invoiceNumber')} className="-ml-4">
                      Factura #
                      {sortConfig.key === 'invoiceNumber' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                </TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => handleSort('clientName')} className="-ml-4">
                      Cliente
                      {sortConfig.key === 'clientName' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                   <Button variant="ghost" onClick={() => handleSort('dueDate')} className="-ml-4">
                      Fecha Venc.
                      {sortConfig.key === 'dueDate' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                </TableHead>
                <TableHead className="text-right">
                   <Button variant="ghost" onClick={() => handleSort('balanceDue')} className="ml-auto -mr-4 flex">
                      Balance Pend.
                      {sortConfig.key === 'balanceDue' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button variant="ghost" onClick={() => handleSort('status')} className="-ml-4">
                      Estado
                      {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell">{invoice.dueDate}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.balanceDue, invoice.currency)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={getStatusVariant(invoice.status)}>{capitalizeFirstLetter(invoice.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú de acciones</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/invoices/${invoice.id}`}><Eye className="mr-2 h-4 w-4"/>Ver Detalles</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPaymentDialog(invoice)}>
                             <CreditCard className="mr-2 h-4 w-4"/>Realizar Pago
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                     ¡Felicidades! No tienes cuentas por cobrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {sortedInvoices.length} facturas pendientes en total.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-end lg:gap-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Filas por página</p>
                <Select
                  value={`${rowsPerPage}`}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={`${rowsPerPage}`} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Ir a la primera página</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <span className="sr-only">Ir a la última página</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                  <DialogDescription>
                      {selectedInvoice 
                          ? `Ingresa los detalles del pago para la factura ${selectedInvoice.invoiceNumber}.` 
                          : ""
                      }
                  </DialogDescription>
              </DialogHeader>
              {selectedInvoice && (
                  <AddPaymentForm 
                      invoice={selectedInvoice}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setIsPaymentDialogOpen(false)}
                  />
              )}
          </DialogContent>
      </Dialog>
    </>
  )
}
