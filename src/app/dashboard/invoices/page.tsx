

'use client'

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { MoreHorizontal, PlusCircle, Trash2, Eye, Search, ChevronsUpDown, ArrowUp, ArrowDown, Edit, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, CreditCard, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/hooks";
import { getInvoices } from "@/lib/firebase/service";
import { invoiceApi } from "@/lib/api/invoiceApi";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AddPaymentForm } from "@/components/add-payment-form"
import { WhatsAppMessageModal } from "@/components/whatsapp-message-modal";

type SortKey = keyof Invoice;

export default function InvoicesPage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'invoiceNumber', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getInvoices(userId);
      setInvoices(data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
  }, [userId]);

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

  const handleDelete = async (id: string) => {
    try {
      await invoiceApi.delete(id);
      setInvoices(invoices.filter((invoice) => invoice.id !== id));
      toast({
        title: "Factura eliminada",
        description: "La factura ha sido eliminada correctamente.",
      });
    } catch (error: any) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    }
  }

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

  const sortedInvoices = useMemo(() => {
    let sortableItems = [...invoices].filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(filter.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(filter.toLowerCase()) ||
      invoice.status.toLowerCase().includes(filter.toLowerCase())
    );

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

    return sortableItems;
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

  return (
    <>
      <PageHeader title="Facturas" description="Gestiona las facturas de tus clientes.">
        <Button size="lg" asChild>
          <Link href="/dashboard/invoices/create">
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Factura
          </Link>
        </Button>
      </PageHeader>
      <Card>
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
                  setFilter(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
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
                    <Button variant="ghost" onClick={() => handleSort('issueDate')} className="-ml-4">
                      Fecha Emisión
                      {sortConfig.key === 'issueDate' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    <Button variant="ghost" onClick={() => handleSort('total')} className="ml-auto -mr-4 flex">
                      Total
                      {sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell className="hidden md:table-cell">{invoice.issueDate}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(invoice.balanceDue, invoice.currency)}</TableCell>
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
                              <Link href={`/dashboard/invoices/${invoice.id}`}><Eye className="mr-2 h-4 w-4" />Ver Detalles</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={invoice.status === 'pagada'}>
                              <Link href={`/dashboard/invoices/${invoice.id}/edit`} className={invoice.status === 'pagada' ? 'pointer-events-none' : ''}>
                                <Edit className="mr-2 h-4 w-4" />Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenPaymentDialog(invoice)} disabled={invoice.balanceDue <= 0}>
                              <CreditCard className="mr-2 h-4 w-4" />Realizar Pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setWhatsAppInvoice(invoice);
                              setIsWhatsAppOpen(true);
                            }} disabled={invoice.status === 'pagada'}>
                              <MessageCircle className="mr-2 h-4 w-4" />Cobrar por WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(invoice.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      {filter ? 'No se encontraron facturas.' : 'No hay facturas. ¡Crea la primera!'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {sortedInvoices.length} facturas en total.
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

      {whatsAppInvoice && (
        <WhatsAppMessageModal
          open={isWhatsAppOpen}
          onOpenChange={(open) => {
            setIsWhatsAppOpen(open);
            if (!open) setWhatsAppInvoice(null);
          }}
          type="payment"
          context={{
            clientName: whatsAppInvoice.clientName || 'Cliente',
            clientPhone: "18295555555", // Placeholder as discussed
            amount: whatsAppInvoice.balanceDue,
            invoiceNumber: whatsAppInvoice.invoiceNumber,
            businessName: "Ventas Claras",
          }}
        />
      )}
    </>
  )
}
