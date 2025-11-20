

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Product, Category, ProductBatch } from '@/lib/types'
import { useAuth } from '@/lib/firebase/hooks'
import { productApi } from '@/lib/api/productApi'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { cn } from '@/lib/utils'
import { logAnalyticsEvent } from '@/lib/firebase/analytics'
import { Label } from './ui/label'

type ImportedBatch = {
  cost: number;
  price: number;
  stock: number;
  expirationDate?: string;
  originalRow: any;
};

type ValidatedProduct = {
  code: string;
  name: string;
  category: string;
  currency: 'DOP' | 'USD' | '';
  isTaxExempt?: boolean;
  imageUrl?: string;
  notificationThreshold?: number;
  restockTimeDays?: number;
  description?: string;
  batches: ImportedBatch[];
  status: 'ok' | 'error';
  errorMessage?: string;
  rowIndex: number; // Index of the first row for this product
};


export function ImportProductsDialog({
  isOpen,
  onClose,
  importedData,
  onSuccess,
  existingProducts,
  existingCategories,
}: {
  isOpen: boolean
  onClose: () => void
  importedData: any[]
  onSuccess: () => void
  existingProducts: Product[]
  existingCategories: Category[]
}) {
  const { toast } = useToast()
  const { userId } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [validatedProducts, setValidatedProducts] = useState<ValidatedProduct[]>([]);
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkMargin, setBulkMargin] = useState<string>('');

  const validateProducts = (productsToValidate: ValidatedProduct[]) => {
    const existingCodes = new Set(existingProducts.map(p => p.code.toUpperCase()));
    const codesInFile = new Map<string, number>();

    productsToValidate.forEach(p => {
      const count = codesInFile.get(p.code.toUpperCase()) || 0;
      codesInFile.set(p.code.toUpperCase(), count + 1);
    });

    return productsToValidate.map(p => {
      let status: 'ok' | 'error' = 'ok';
      let errorMessage: string | undefined;

      if (!p.name) {
        status = 'error';
        errorMessage = 'El nombre es requerido.';
      } else if (existingCodes.has(p.code.toUpperCase())) {
        status = 'error';
        errorMessage = 'Este código ya existe en tus productos.';
      } else if (codesInFile.get(p.code.toUpperCase())! > 1) {
        status = 'error';
        errorMessage = 'Código duplicado dentro del archivo de importación.';
      } else if (p.batches.some(b => b.cost < 0 || b.stock < 0)) {
        status = 'error';
        errorMessage = 'El costo y el stock no pueden ser negativos.';
      }

      return { ...p, status, errorMessage };
    });
  };

  useEffect(() => {
    // Group rows by product code
    const productsMap = new Map<string, any[]>();
    importedData.forEach(row => {
      const code = row['Código']?.toString().trim().toUpperCase();
      if (!code) return; // Skip rows without a code
      if (!productsMap.has(code)) {
        productsMap.set(code, []);
      }
      productsMap.get(code)!.push(row);
    });

    let initialProducts: ValidatedProduct[] = [];
    let rowIndex = 0;

    productsMap.forEach((rows, code) => {
      const firstRow = rows[0];
      const getOptionalString = (row: any, key: string): string => row[key]?.toString().trim() || '';
      const getOptionalNumber = (row: any, key: string): number | undefined => {
        const val = row[key];
        if (val === null || val === undefined || val === '') return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      };

      const batches: ImportedBatch[] = rows.map(row => ({
        cost: getOptionalNumber(row, 'Costo') ?? 0,
        price: getOptionalNumber(row, 'Precio') ?? 0,
        stock: getOptionalNumber(row, 'Stock') ?? 0,
        expirationDate: getOptionalString(row, 'Expiración'),
        originalRow: row,
      }));

      initialProducts.push({
        code: code,
        name: getOptionalString(firstRow, 'Nombre'),
        category: getOptionalString(firstRow, 'Categoría'),
        currency: getOptionalString(firstRow, 'Moneda').toUpperCase() as any,
        isTaxExempt: getOptionalString(firstRow, 'Exento de ITBIS')?.toUpperCase() === 'SI',
        imageUrl: getOptionalString(firstRow, 'Imagen URL'),
        notificationThreshold: getOptionalNumber(firstRow, 'Umbral de Notificación'),
        restockTimeDays: getOptionalNumber(firstRow, 'Tiempo de Reposición (días)'),
        description: getOptionalString(firstRow, 'Descripción'),
        batches: batches,
        status: 'ok', // Initial status
        rowIndex: rowIndex,
      });

      rowIndex += rows.length;
    });

    setValidatedProducts(validateProducts(initialProducts));
  }, [importedData, existingProducts]);

  const handleFieldChange = (rowIndex: number, field: keyof ValidatedProduct, value: any) => {
    setValidatedProducts(prev => {
      const newProducts = prev.map(p => p.rowIndex === rowIndex ? { ...p, [field]: value } : p);
      return validateProducts(newProducts);
    });
  };

  const handleBatchFieldChange = (productRowIndex: number, batchIndex: number, field: keyof ImportedBatch, value: any) => {
    setValidatedProducts(prev => {
      const newProducts = prev.map(p => {
        if (p.rowIndex === productRowIndex) {
          const newBatches = [...p.batches];
          newBatches[batchIndex] = { ...newBatches[batchIndex], [field]: value };
          return { ...p, batches: newBatches };
        }
        return p;
      });
      return validateProducts(newProducts);
    });
  };


  const handleSaveProducts = async () => {
    if (!userId) {
      toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
      return;
    }

    if (validatedProducts.some(p => p.status === 'error')) {
      toast({ title: 'Error de Validación', description: 'Por favor, corrige los errores en la tabla antes de guardar.', variant: 'destructive' });
      return;
    }
    if (validatedProducts.some(p => !p.currency)) {
      toast({ title: 'Moneda Requerida', description: 'Por favor, asigna una moneda a todos los productos.', variant: 'destructive' });
      return;
    }
    if (validatedProducts.some(p => p.batches.some(b => b.price <= 0))) {
      toast({ title: 'Precio de Venta Requerido', description: 'Por favor, asigna un precio de venta mayor a cero a todos los lotes.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const productsToSave: Omit<Product, 'id'>[] = validatedProducts.map(({ status, errorMessage, rowIndex, batches, ...data }) => {
        const productBatches: ProductBatch[] = batches.map(b => ({
          id: `batch-${Date.now()}-${Math.random()}`,
          cost: b.cost,
          price: b.price,
          stock: b.stock,
          expirationDate: b.expirationDate,
        }));

        const productData: { [key: string]: any } = {
          ...data,
          description: data.description || '',
          category: data.category || 'General',
          currency: data.currency!,
          isTaxExempt: data.isTaxExempt || false,
          imageUrl: data.imageUrl || '',
          userId,
          createdAt: new Date(),
          isActive: true,
          batches: productBatches,
          restockTimeDays: (data.restockTimeDays !== undefined && !isNaN(data.restockTimeDays)) ? data.restockTimeDays : null,
          notificationThreshold: (data.notificationThreshold !== undefined && !isNaN(data.notificationThreshold)) ? data.notificationThreshold : 10,
        };

        return productData as Omit<Product, 'id'>;
      });

      await productApi.batchCreate(productsToSave);
      logAnalyticsEvent('products_imported', { count: productsToSave.length });
      toast({
        title: 'Productos Importados',
        description: `${productsToSave.length} productos han sido agregados exitosamente.`,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Error saving products from Excel:", e);
      toast({ title: 'Error', description: 'No se pudieron guardar los productos. Revise que todos los datos sean válidos.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedRows(checked ? new Set(validatedProducts.map((p: ValidatedProduct) => p.rowIndex)) : new Set());
  };

  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowIndex);
    } else {
      newSelection.delete(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const handleApplyBulkCategory = () => {
    if (!bulkCategoryId) return;
    const categoryName = existingCategories.find((c: Category) => c.id === bulkCategoryId)?.name;
    if (!categoryName) return;

    setValidatedProducts(prev => prev.map((p: ValidatedProduct) =>
      selectedRows.has(p.rowIndex) ? { ...p, category: categoryName } : p
    ));

    toast({
      title: "Categorías Asignadas",
      description: `Se asignó la categoría "${categoryName}" a ${selectedRows.size} producto(s).`
    })

    setSelectedRows(new Set());
    setBulkCategoryId('');
  };

  const handleApplyBulkMargin = () => {
    const margin = parseFloat(bulkMargin);
    if (isNaN(margin) || margin <= 0 || margin >= 100) {
      toast({
        title: "Margen Inválido",
        description: "Por favor, introduce un número de margen entre 1 y 99.",
        variant: "destructive"
      });
      return;
    }

    setValidatedProducts(prev =>
      prev.map((product: ValidatedProduct) => {
        if (selectedRows.has(product.rowIndex)) {
          const newBatches = product.batches.map((batch: ImportedBatch) => {
            if (batch.cost > 0) {
              const newPrice = batch.cost / (1 - (margin / 100));
              return { ...batch, price: parseFloat(newPrice.toFixed(2)) };
            }
            return batch;
          });
          return { ...product, batches: newBatches };
        }
        return product;
      })
    );

    toast({
      title: "Margen Aplicado",
      description: `Se aplicó un margen de ${margin}% a los precios de ${selectedRows.size} producto(s).`
    })

    setSelectedRows(new Set());
    setBulkMargin('');
  };


  const hasErrors = useMemo(() => validatedProducts.some((p: ValidatedProduct) => p.status === 'error'), [validatedProducts]);
  const hasMissingCurrency = useMemo(() => validatedProducts.some((p: ValidatedProduct) => !p.currency), [validatedProducts]);
  const hasMissingPrice = useMemo(() => validatedProducts.some((p: ValidatedProduct) => p.batches.some((b: ImportedBatch) => b.price <= 0)), [validatedProducts]);

  const numSelected = selectedRows.size;
  const rowCount = validatedProducts.length;
  const headerCheckboxState = numSelected === rowCount && rowCount > 0 ? true : numSelected > 0 ? "indeterminate" : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Revisar Productos a Importar</DialogTitle>
          <DialogDescription>
            Verifica y edita los productos cargados. El sistema agrupa productos por el mismo 'Código'.
          </DialogDescription>
        </DialogHeader>

        {selectedRows.size > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 -mb-2 mt-2 bg-muted rounded-md border">
            <p className="text-sm font-medium flex-shrink-0">{selectedRows.size} producto(s) seleccionado(s)</p>
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className='flex items-center gap-2'>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger className="w-full bg-background h-9">
                    <SelectValue placeholder="Asignar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((type: Category) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleApplyBulkCategory} disabled={!bulkCategoryId}>Aplicar</Button>
              </div>
              <div className='flex items-center gap-2'>
                <div className='relative w-full sm:w-[150px]'>
                  <Input
                    type="number"
                    placeholder="Ej: 30"
                    value={bulkMargin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkMargin(e.target.value)}
                    className="bg-background h-9 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <Button size="sm" onClick={handleApplyBulkMargin} disabled={!bulkMargin}>Aplicar Margen</Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-h-[60vh] overflow-auto border rounded-md">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12'>
                    <Checkbox onCheckedChange={handleSelectAll} checked={headerCheckboxState} />
                  </TableHead>
                  <TableHead className='w-12'>Estado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Lote #</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validatedProducts.map((product: ValidatedProduct, productIndex: number) => (
                  product.batches.map((batch: ImportedBatch, batchIndex: number) => {
                    const margin = batch.price > 0 ? ((batch.price - batch.cost) / batch.price) * 100 : 0;
                    return (
                      <TableRow key={`${product.rowIndex}-${batchIndex}`} className={cn(product.status === 'error' && 'bg-destructive/10')}>
                        {batchIndex === 0 && (
                          <TableCell rowSpan={product.batches.length} className="align-top pt-3">
                            <Checkbox checked={selectedRows.has(product.rowIndex)} onCheckedChange={(checked: boolean | 'indeterminate') => handleRowSelect(product.rowIndex, !!checked)} />
                          </TableCell>
                        )}
                        {batchIndex === 0 && (
                          <TableCell rowSpan={product.batches.length} className="align-top pt-3">
                            <Tooltip>
                              <TooltipTrigger>
                                {product.status === 'ok'
                                  ? <CheckCircle className="h-5 w-5 text-green-600" />
                                  : <AlertCircle className="h-5 w-5 text-destructive" />
                                }
                              </TooltipTrigger>
                              {product.errorMessage &&
                                <TooltipContent>
                                  <p>{product.errorMessage}</p>
                                </TooltipContent>
                              }
                            </Tooltip>
                          </TableCell>
                        )}
                        {batchIndex === 0 && <TableCell rowSpan={product.batches.length} className="align-top pt-2 font-mono"><Input value={product.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(product.rowIndex, 'code', e.target.value)} className={cn('min-w-[100px]', product.errorMessage?.includes('código') && 'border-destructive')} /></TableCell>}
                        {batchIndex === 0 && <TableCell rowSpan={product.batches.length} className="align-top pt-2"><Input value={product.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(product.rowIndex, 'name', e.target.value)} className={cn('min-w-[150px]', product.errorMessage?.includes('nombre') && 'border-destructive')} /></TableCell>}

                        <TableCell className="font-mono text-xs pt-2">Lote #{batchIndex + 1}</TableCell>

                        {batchIndex === 0 && (
                          <TableCell rowSpan={product.batches.length} className="align-top pt-2">
                            <Select value={product.currency} onValueChange={(value: string) => handleFieldChange(product.rowIndex, 'currency', value)}>
                              <SelectTrigger className={cn('w-[100px]', !product.currency && hasMissingCurrency && 'border-destructive')}>
                                <SelectValue placeholder="Moneda" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DOP">DOP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        <TableCell className="pt-2">
                          <Input
                            type="number"
                            value={batch.cost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBatchFieldChange(product.rowIndex, batchIndex, 'cost', Number(e.target.value))}
                            className="min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell className="pt-2">
                          <Input
                            type="number"
                            value={batch.price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBatchFieldChange(product.rowIndex, batchIndex, 'price', Number(e.target.value))}
                            className={cn('min-w-[100px]', batch.price <= 0 && hasMissingPrice && 'border-destructive')}
                          />
                        </TableCell>
                        <TableCell className="pt-2">
                          <div className={cn("text-sm min-w-[60px] text-center", margin >= 0 ? "text-green-600" : "text-destructive")}>
                            {margin.toFixed(0)}%
                          </div>
                        </TableCell>
                        <TableCell className="pt-2">
                          <Input
                            type="number"
                            value={batch.stock}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBatchFieldChange(product.rowIndex, batchIndex, 'stock', Number(e.target.value))}
                            className="min-w-[80px]"
                          />
                        </TableCell>

                        {batchIndex === 0 && <TableCell rowSpan={product.batches.length} className="align-top pt-2">
                          <Select value={existingCategories.find((c: Category) => c.name === product.category)?.id || ''} onValueChange={(value: string) => handleFieldChange(product.rowIndex, 'category', existingCategories.find((c: Category) => c.id === value)?.name || '')}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {existingCategories.map((cat: Category) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>}
                      </TableRow>
                    )
                  })
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSaveProducts} disabled={isSaving || hasErrors || hasMissingCurrency || hasMissingPrice}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar {validatedProducts.filter(p => p.status === 'ok').length} Productos Válidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
