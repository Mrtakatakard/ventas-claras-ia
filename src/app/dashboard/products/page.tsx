

'use client'

import { useState, useRef, useEffect, useMemo } from "react"
import { MoreHorizontal, PlusCircle, Upload, Trash2, Edit, Search, ChevronsUpDown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Download, Tags, Info } from "lucide-react";
import * as XLSX from 'xlsx';
import { useSearchParams } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { AddProductForm } from "@/components/add-product-form";
import { useToast } from "@/hooks/use-toast";
import { ImportProductsDialog } from "@/components/import-products-dialog";
import type { Product, Category, ProductBatch } from "@/lib/types";
import { useAuth } from "@/lib/firebase/hooks"
import { getProducts, getCategories } from "@/lib/firebase/service"
import { productApi } from "@/lib/api/productApi"
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ManageCategoriesDialog } from "@/components/manage-categories-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProductWithCalculations = Product & { totalStock: number; nextExpiration?: string; };
type SortKey = keyof ProductWithCalculations;



import { Suspense } from 'react';

function ProductsContent() {
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [importedData, setImportedData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'good' | 'service'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [fetchedProducts, fetchedCategories] = await Promise.all([
        getProducts(userId),
        getCategories(userId)
      ]);
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error al cargar productos",
        description: error.message || "No se pudieron cargar los datos. Inténtalo de nuevo.",
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

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingProduct(null);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingProduct(null);
    }
  };

  const onFormSuccess = () => {
    fetchData();
    setOpen(false);
    setEditingProduct(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          let allRows: any[] = [];
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            allRows = allRows.concat(json);
          });

          setImportedData(allRows);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (id: string) => {
    try {
      await productApi.delete(id);
      toast({ title: "Producto eliminado" });
      fetchData();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "destructive" });
    }
  }

  const getStockBadgeVariant = (stock: number): "default" | "secondary" | "destructive" => {
    if (stock === 0) return "destructive";
    if (stock < 20) return "secondary";
    return "default";
  };

  const formatCurrency = (price: number, currency: 'DOP' | 'USD' = 'DOP') => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: currency }).format(price);
  }

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    const dataToExport = products.flatMap(p => {
      if (!p.batches || p.batches.length === 0) {
        return [{
          'Código': p.code,
          'Nombre': p.name,
          'Categoría': p.category,
          'Moneda': p.currency,
          'Exento de ITBIS': p.isTaxExempt ? 'Sí' : 'No',
          'Umbral de Notificación': p.notificationThreshold,
          'Tiempo de Reposición (días)': p.restockTimeDays,
          'Descripción': p.description,
          'Imagen URL': p.imageUrl,
          'Lote #': 'N/A',
          'Costo': 'N/A',
          'Precio': 'N/A',
          'Stock': 'N/A',
          'Expiración': 'N/A',
        }];
      }
      return p.batches.map((batch, index) => ({
        'Código': p.code,
        'Nombre': p.name,
        'Categoría': p.category,
        'Moneda': p.currency,
        'Exento de ITBIS': p.isTaxExempt ? 'Sí' : 'No',
        'Umbral de Notificación': p.notificationThreshold,
        'Tiempo de Reposición (días)': p.restockTimeDays,
        'Descripción': p.description,
        'Imagen URL': p.imageUrl,
        'Lote #': `Lote ${index + 1}`,
        'Costo': String(batch.cost),
        'Precio': String(batch.price),
        'Stock': String(batch.stock),
        'Expiración': batch.expirationDate || 'N/A',
      }));
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "productos_y_lotes.xlsx");
  };

  const sortedProducts: ProductWithCalculations[] = useMemo(() => {
    const productsWithCalculations = products.map(p => {
      const totalStock = (p.batches || []).reduce((sum, batch) => sum + batch.stock, 0);

      const nextExpiration = (p.batches || [])
        .filter(batch => batch.expirationDate)
        .map(batch => new Date(batch.expirationDate!))
        .filter(date => date >= new Date())
        .sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString().split('T')[0];

      return {
        ...p,
        totalStock,
        nextExpiration,
      };
    });

    let sortableItems = [...productsWithCalculations].filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(filter.toLowerCase()) ||
        product.code.toLowerCase().includes(filter.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(filter.toLowerCase()));

      const matchesType = typeFilter === 'all' || (product.productType || 'good') === typeFilter;

      return matchesSearch && matchesType;
    });

    sortableItems.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = (aValue || 0) - (bValue || 0);
      } else {
        comparison = String(aValue || '').localeCompare(String(bValue || ''));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sortableItems;
  }, [products, filter, sortConfig]);

  const { paginatedProducts, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = sortedProducts.slice(startIndex, endIndex);
    const total = Math.ceil(sortedProducts.length / rowsPerPage);
    return { paginatedProducts: paginated, totalPages: total > 0 ? total : 1 };
  }, [sortedProducts, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  return (
    <>
      <PageHeader title="Productos" description="Gestiona tu inventario de productos.">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="mr-2 h-5 w-5" />
          Importar
        </Button>
        <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)}>
          <Tags className="mr-2 h-5 w-5" />
          Gestionar Categorías
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={products.length === 0}>
          <Download className="mr-2 h-5 w-5" />
          Exportar a Excel
        </Button>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleAddNewClick}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}</DialogTitle>
              <DialogDescription>{editingProduct ? 'Modifica los datos del producto.' : 'Completa los datos para registrar un nuevo producto.'}</DialogDescription>
            </DialogHeader>
            <AddProductForm
              onSuccess={onFormSuccess}
              product={editingProduct}
              categories={categories}
              key={editingProduct?.id || 'new-product'}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onCategoriesUpdate={fetchData}
      />

      {importedData && (
        <ImportProductsDialog
          isOpen={!!importedData}
          onClose={() => setImportedData(null)}
          importedData={importedData}
          onSuccess={fetchData}
          existingProducts={products}
          existingCategories={categories}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all" onValueChange={(v) => console.log(v)} value={typeFilter} className="w-full mb-4">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setTypeFilter('all')}>Todos</TabsTrigger>
              <TabsTrigger value="good" onClick={() => setTypeFilter('good')}>Inventario (Físico)</TabsTrigger>
              <TabsTrigger value="service" onClick={() => setTypeFilter('service')}>Servicios</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por código, nombre o categoría..."
                className="w-full pl-8"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Imagen</span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort('code')} className="-ml-4">
                      Código
                      {sortConfig.key === 'code' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('name')} className="-ml-4">
                      Nombre del Producto
                      {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('totalStock')} className="-ml-4">
                      Stock Total
                      {sortConfig.key === 'totalStock' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button variant="ghost" onClick={() => handleSort('category')} className="-ml-4">
                      Categoría
                      {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Precio Venta
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Próx. Expiración
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => {
                    const firstBatch = product.batches?.[0];
                    const isService = product.productType === 'service';
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="w-[50px]">
                          <Avatar className="h-10 w-10 rounded-md">
                            <AvatarImage src={product.imageUrl} alt={product.name} data-ai-hint="product image" />
                            <AvatarFallback className="rounded-md">{product.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono hidden md:table-cell">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {isService ? (
                            <Badge variant="outline" className="text-xs">Servicio</Badge>
                          ) : (
                            <Badge variant={getStockBadgeVariant(product.totalStock)} className="text-sm">
                              {product.totalStock > 0 ? product.totalStock : (product.allowNegativeStock ? "0 (Venta Ant.)" : "Agotado")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{product.category}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {isService ? formatCurrency(product.price || 0, product.currency) : (firstBatch ? formatCurrency(firstBatch.price, product.currency) : "N/A")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{product.nextExpiration || 'N/A'}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEditClick(product)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
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
                    <TableCell colSpan={8} className="text-center h-24">
                      {filter ? 'No se encontraron productos.' : 'No hay productos. ¡Agrega tu primer producto!'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
            <div className="flex-1 text-sm text-muted-foreground">
              {sortedProducts.length} productos en total.
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
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <ProductsContent />
    </Suspense>
  );
}


