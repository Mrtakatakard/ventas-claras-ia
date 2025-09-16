

'use client'

import { useState, useEffect, useMemo } from "react"
import { MoreHorizontal, PlusCircle, Trash2, Edit, Search, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AddCategoryForm } from "@/components/add-category-form"
import { useToast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"
import { useAuth } from "@/lib/firebase/hooks"
import { getCategories, deleteCategory } from "@/lib/firebase/service"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Badge } from "./ui/badge"

type SortKey = keyof Category;

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdate: () => void;
}

export function ManageCategoriesDialog({ isOpen, onClose, onCategoriesUpdate }: ManageCategoriesDialogProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const fetchCategories = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fetchedCategories = await getCategories(userId);
      setCategories(fetchedCategories.filter(cat => cat.userId === userId));
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las categorías.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchCategories();
    }
  }, [isOpen, userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast({ title: "Categoría eliminada" });
      fetchCategories();
      onCategoriesUpdate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar la categoría.", variant: "destructive" });
    }
  }

  const onFormSuccess = () => {
    fetchCategories();
    onCategoriesUpdate();
    setAddEditDialogOpen(false);
    setEditingCategory(null);
  }
  
  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setAddEditDialogOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingCategory(null);
    setAddEditDialogOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setAddEditDialogOpen(isOpen);
    if (!isOpen) {
      setEditingCategory(null);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedCategories = useMemo(() => {
    let sortableItems = [...categories].filter(category =>
        category.name.toLowerCase().includes(filter.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(filter.toLowerCase()))
    );

    sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue || '').localeCompare(String(bValue || ''));
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sortableItems;
  }, [categories, filter, sortConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
            <DialogTitle>Gestionar Categorías de Productos</DialogTitle>
            <DialogDescription>
                Crea, edita y elimina las categorías para organizar tus productos.
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
                            Agregar Categoría
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Agregar Nueva Categoría'}</DialogTitle>
                            <DialogDescription>
                                {editingCategory ? 'Modifica los datos de la categoría.' : 'Completa los datos para registrar una nueva categoría.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddCategoryForm onSuccess={onFormSuccess} category={editingCategory} key={editingCategory?.id || 'new-category'} />
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
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        </TableRow>
                        ))
                    ) : sortedCategories.length > 0 ? (
                        sortedCategories.map(category => (
                        <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description}</TableCell>
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
                                <DropdownMenuItem onClick={() => handleEditClick(category)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(category.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />Eliminar
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                            {filter ? 'No se encontraron categorías.' : 'No hay categorías. ¡Crea la primera!'}
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
