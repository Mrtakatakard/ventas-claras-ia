

'use client'

import { useState, useEffect, useMemo, useRef } from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye, Search, ChevronsUpDown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Upload, Tags, Download } from "lucide-react"
import * as XLSX from 'xlsx';
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { AddClientForm } from "@/components/add-client-form"
import { Badge } from "@/components/ui/badge"
import type { Client, ClientType } from "@/lib/types"
import { useAuth } from "@/lib/firebase/hooks"
import { getClients, getClientTypes } from "@/lib/firebase/service"
import { clientApi } from "@/lib/api/clientApi"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { ImportClientsDialog } from "@/components/import-clients-dialog";
import { ManageClientTypesDialog } from "@/components/manage-client-types-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortKey = keyof Client;

import { Suspense } from 'react';

function ClientsContent() {
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [importedData, setImportedData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [fetchedClients, fetchedClientTypes] = await Promise.all([
        getClients(userId),
        getClientTypes(userId),
      ]);

      const clientTypesMap = new Map(fetchedClientTypes.map(ct => [ct.id, ct.name]));

      const clientsWithTypeName = fetchedClients.map(client => {
        if (!client.clientTypeName && client.clientTypeId) {
          const clientTypeName = clientTypesMap.get(client.clientTypeId);
          return {
            ...client,
            clientTypeName: clientTypeName || 'Sin asignar'
          };
        }
        return client;
      });

      setClients(clientsWithTypeName);
      setClientTypes(fetchedClientTypes);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleAddNewClick();
    }
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    try {
      await clientApi.delete(id);
      toast({ title: "Cliente eliminado" });
      fetchData();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el cliente", variant: "destructive" });
    }
  }

  const onFormSuccess = () => {
    fetchData();
    setOpen(false);
    setEditingClient(null);
  }

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingClient(null);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingClient(null);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          setImportedData(json);
        } catch (error) {
          console.error("Error reading excel file:", error);
          toast({
            variant: "destructive",
            title: "Error al leer el archivo",
            description: "No se pudo procesar el archivo de Excel. Asegúrate de que tenga el formato correcto.",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    const dataToExport = clients.map(client => ({
      'Nombre': client.name,
      'Email': client.email,
      'Teléfono': client.phone,
      'Cumpleaños': client.birthday,
      'Tipo de Cliente': client.clientTypeName,
      'Dirección Principal': client.addresses?.find(a => a.isDefault)?.fullAddress || (client.addresses?.[0]?.fullAddress || 'N/A')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, "clientes.xlsx");
  };


  const sortedClients = useMemo(() => {
    let sortableItems = [...clients].filter(client =>
      client.name.toLowerCase().includes(filter.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(filter.toLowerCase())) ||
      client.phone.toLowerCase().includes(filter.toLowerCase())
    );

    sortableItems.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      let comparison = 0;
      if (sortConfig.key === 'createdAt') {
        const dateA = aValue ? new Date(aValue as any).getTime() : 0;
        const dateB = bValue ? new Date(bValue as any).getTime() : 0;
        comparison = dateA - dateB;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = (aValue || 0) - (bValue || 0);
      } else {
        comparison = String(aValue || '').localeCompare(String(bValue || ''));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sortableItems;
  }, [clients, filter, sortConfig]);

  const { paginatedClients, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = sortedClients.slice(startIndex, endIndex);
    const total = Math.ceil(sortedClients.length / rowsPerPage);
    return { paginatedClients: paginated, totalPages: total > 0 ? total : 1 };
  }, [sortedClients, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  return (
    <>
      <PageHeader title="Clientes" description="Gestiona tu lista de clientes.">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="mr-2 h-5 w-5" />
          Importar
        </Button>
        <Button variant="outline" onClick={() => setIsManageTypesOpen(true)}>
          <Tags className="mr-2 h-5 w-5" />
          Gestionar Tipos
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-5 w-5" />
          Exportar a Excel
        </Button>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleAddNewClick}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Agregar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient
                  ? 'Modifica los datos del cliente.'
                  : 'Completa los datos para registrar un nuevo cliente.'
                }
              </DialogDescription>
            </DialogHeader>
            <AddClientForm
              onSuccess={onFormSuccess}
              client={editingClient}
              clientTypes={clientTypes}
              key={editingClient?.id || 'new-client'}
              onClientTypeAdded={fetchData}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <ManageClientTypesDialog
        isOpen={isManageTypesOpen}
        onClose={() => setIsManageTypesOpen(false)}
        onClientTypesUpdate={fetchData}
      />

      {importedData && (
        <ImportClientsDialog
          isOpen={!!importedData}
          onClose={() => setImportedData(null)}
          importedData={importedData}
          onSuccess={fetchData}
          existingClients={clients}
          clientTypes={clientTypes}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full pl-8"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <TooltipProvider>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('name')} className="-ml-4">
                        Nombre Completo
                        {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('clientTypeName')} className="-ml-4">
                        Tipo de Cliente
                        {sortConfig.key === 'clientTypeName' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button variant="ghost" onClick={() => handleSort('email')} className="-ml-4">
                        Correo Electrónico
                        {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Button variant="ghost" onClick={() => handleSort('phone')} className="-ml-4">
                        Teléfono
                        {sortConfig.key === 'phone' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedClients.length > 0 ? (
                    paginatedClients.map(client => {
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium max-w-[150px] truncate">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{client.name}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{client.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {client.clientTypeName || 'Sin asignar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                          <TableCell className="hidden sm:table-cell">{client.phone}</TableCell>
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
                                  <Link href={`/dashboard/clients/${client.id}`}><Eye className="mr-2 h-4 w-4" />Ver Detalles</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(client)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        {filter ? 'No se encontraron clientes.' : 'No hay clientes. ¡Agrega tu primer cliente!'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TooltipProvider>
          <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {sortedClients.length} clientes en total.
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

export default function ClientsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <ClientsContent />
    </Suspense>
  );
}
