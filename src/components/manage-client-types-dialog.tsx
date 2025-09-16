
'use client'

import { useState, useEffect, useMemo } from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddClientTypeForm } from "@/components/add-client-type-form"
import { useToast } from "@/hooks/use-toast"
import type { ClientType } from "@/lib/types"
import { useAuth } from "@/lib/firebase/hooks"
import { getClientTypes, deleteClientType } from "@/lib/firebase/service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Badge } from "./ui/badge"

type SortKey = keyof ClientType;

interface ManageClientTypesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClientTypesUpdate: () => void;
}

export function ManageClientTypesDialog({ isOpen, onClose, onClientTypesUpdate }: ManageClientTypesDialogProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<ClientType | null>(null);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const fetchClientTypes = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fetchedTypes = await getClientTypes(userId);
      setClientTypes(fetchedTypes.filter(type => type.userId === userId));
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los tipos de cliente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchClientTypes();
    }
  }, [isOpen, userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteClientType(id);
      toast({ title: "Tipo de cliente eliminado" });
      fetchClientTypes();
      onClientTypesUpdate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el tipo de cliente.", variant: "destructive" });
    }
  }

  const onFormSuccess = () => {
    fetchClientTypes();
    onClientTypesUpdate();
    setAddEditDialogOpen(false);
    setEditingType(null);
  }
  
  const handleEditClick = (type: ClientType) => {
    setEditingType(type);
    setAddEditDialogOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingType(null);
    setAddEditDialogOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setAddEditDialogOpen(isOpen);
    if (!isOpen) {
      setEditingType(null);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedClientTypes = useMemo(() => {
    let sortableItems = [...clientTypes].filter(type =>
        type.name.toLowerCase().includes(filter.toLowerCase()) ||
        (type.description && type.description.toLowerCase().includes(filter.toLowerCase()))
    );

    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }
            
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }
    return sortableItems;
  }, [clientTypes, filter, sortConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
            <DialogTitle>Gestionar Tipos de Cliente</DialogTitle>
            <DialogDescription>
                Crea y edita los tipos de cliente y sus descuentos asociados.
            </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-4 py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre o descripción..."
                        className="w-full pl-8"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <Dialog open={addEditDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNewClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Tipo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingType ? 'Editar Tipo de Cliente' : 'Agregar Nuevo Tipo de Cliente'}</DialogTitle>
                            <DialogDescription>
                                {editingType ? 'Modifica los datos del tipo de cliente.' : 'Completa los datos para registrar un nuevo tipo.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddClientTypeForm onSuccess={onFormSuccess} clientType={editingType} key={editingType?.id || 'new-client-type'} />
                    </DialogContent>
                </Dialog>
            </div>
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('name')} className="-ml-4">
                            Nombre
                            {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                        </Button>
                        </TableHead>
                        <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('description')} className="-ml-4">
                            Descripción
                            {sortConfig.key === 'description' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                        </Button>
                        </TableHead>
                        <TableHead>Seguimiento</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                             <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        </TableRow>
                        ))
                    ) : sortedClientTypes.length > 0 ? (
                        sortedClientTypes.map(type => (
                        <TableRow key={type.id}>
                            <TableCell className="font-medium">{type.name}</TableCell>
                            <TableCell>{type.description}</TableCell>
                             <TableCell>
                                <Badge variant={type.enableRestockTracking ? "default" : "outline"}>
                                    {type.enableRestockTracking ? "Activado" : "Desactivado"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditClick(type)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(type.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />Eliminar
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            {filter ? 'No se encontraron tipos de cliente.' : 'No hay tipos de cliente. ¡Crea el primero!'}
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
