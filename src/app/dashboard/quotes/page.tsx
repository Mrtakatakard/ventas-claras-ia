

'use client'

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { MoreHorizontal, PlusCircle, Trash2, Eye, Search, ChevronsUpDown, ArrowUp, ArrowDown, FileText, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Edit } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/hooks";
import { getQuotes } from "@/lib/firebase/service";
import { quoteApi } from "@/lib/api/quoteApi";
import type { Quote } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortKey = keyof Quote;

export default function QuotesPage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'issueDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchQuotes = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getQuotes(userId);
      setQuotes(data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las cotizaciones.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) {
      fetchQuotes();
    }
  }, [userId]);

  const formatCurrency = (num: number, currency?: 'DOP' | 'USD') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const handleDelete = async (id: string) => {
    try {
      await quoteApi.delete(id);
      toast({ title: "Cotización eliminada" });
      fetchQuotes();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la cotización.", variant: "destructive" });
    }
  }

  const handleConvertToInvoice = async (quoteId: string) => {
    if (!userId) return;
    try {
      const newInvoiceId = await quoteApi.convertToInvoice(quoteId);
      toast({
        title: "Cotización Convertida",
        description: "La cotización se ha convertido a factura y el stock ha sido actualizado.",
        action: <ToastAction asChild altText="Ver Factura"><Link href={`/dashboard/invoices/${newInvoiceId}`}>Ver Factura</Link></ToastAction>,
      });
      fetchQuotes();
    } catch (error: any) {
      toast({ title: "Error al convertir", description: error.message, variant: "destructive" });
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "enviada": return "default";
      case "aceptada": return "default";
      case "facturada": return "default";
      case "borrador": return "secondary";
      case "rechazada": return "destructive";
      default: return "outline";
    }
  }

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedQuotes = useMemo(() => {
    let sortableItems = [...quotes].filter(quote =>
      quote.quoteNumber.toLowerCase().includes(filter.toLowerCase()) ||
      quote.clientName.toLowerCase().includes(filter.toLowerCase()) ||
      quote.status.toLowerCase().includes(filter.toLowerCase())
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
  }, [quotes, filter, sortConfig]);

  const { paginatedQuotes, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = sortedQuotes.slice(startIndex, endIndex);
    const total = Math.ceil(sortedQuotes.length / rowsPerPage);
    return { paginatedQuotes: paginated, totalPages: total > 0 ? total : 1 };
  }, [sortedQuotes, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  return (
    <>
      <PageHeader title="Cotizaciones" description="Gestiona las cotizaciones de tus clientes.">
        <Button size="lg" asChild>
          <Link href="/dashboard/quotes/create">
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Cotización
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
                  <Button variant="ghost" onClick={() => handleSort('quoteNumber')} className="-ml-4">
                    Cotización #
                    {sortConfig.key === 'quoteNumber' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
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
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedQuotes.length > 0 ? (
                paginatedQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell">{quote.issueDate}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right">{formatCurrency(quote.total, quote.currency)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={getStatusVariant(quote.status)}>
                        {capitalizeFirstLetter(quote.status)}
                      </Badge>
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
                            <Link href={`/dashboard/quotes/${quote.id}`}><Eye className="mr-2 h-4 w-4" />Ver Detalles</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild disabled={quote.status === 'facturada'}>
                            <Link href={`/dashboard/quotes/${quote.id}/edit`} className={quote.status === 'facturada' ? 'pointer-events-none' : ''}>
                              <Edit className="mr-2 h-4 w-4" />Editar
                            </Link>
                          </DropdownMenuItem>
                          {quote.status !== 'facturada' && (
                            <DropdownMenuItem onClick={() => handleConvertToInvoice(quote.id)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Convertir a Factura
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(quote.id)}>
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
                  <TableCell colSpan={6} className="text-center h-24">
                    {filter ? 'No se encontraron cotizaciones.' : 'No hay cotizaciones. ¡Crea la primera!'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {sortedQuotes.length} cotizaciones en total.
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
    </>
  )
}
