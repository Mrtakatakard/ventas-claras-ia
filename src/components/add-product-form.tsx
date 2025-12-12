

'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/firebase/hooks"
import { uploadFile } from "@/lib/firebase/service"
import { productApi } from "@/lib/api/productApi"
import React, { useState } from "react"
import type { Product, Category, ProductBatch } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Loader2, PlusCircle, Trash2 } from "lucide-react"
import { logAnalyticsEvent } from "@/lib/firebase/analytics"
import { Switch } from "./ui/switch"

const batchSchema = z.object({
  id: z.string().optional(),
  cost: z.coerce.number().nonnegative("El costo debe ser un número no negativo."),
  price: z.coerce.number().positive("El precio debe ser un número positivo."),
  stock: z.coerce.number().int().nonnegative("El stock debe ser un número entero no negativo."),
  expirationDate: z.string().optional(),
});

const formSchema = z.object({
  code: z.string().min(1, "El código es requerido."),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  category: z.string({ required_error: "Por favor selecciona una categoría." }).min(1, "Por favor selecciona una categoría."),
  currency: z.enum(['DOP', 'USD'], { required_error: "Por favor selecciona una moneda." }),
  productType: z.enum(['good', 'service']).default('good'),
  taxType: z.string().default('1'), // '1' = 18%, '3' = Exempt
  description: z.string().optional(),
  notificationThreshold: z.coerce.number().int().nonnegative("El umbral debe ser un número entero no negativo.").optional(),
  restockTimeDays: z.coerce.number().int().nonnegative("El tiempo de reposición debe ser un número entero no negativo.").optional().nullable(),
  isTaxExempt: z.boolean().default(false).optional(),
  image: z.any().optional(),
  batches: z.array(batchSchema).optional(), // Optional now because services don't need it
  // But we still validate it manually if it's a good
});

interface AddProductFormProps {
  onSuccess: () => void;
  product: Product | null;
  categories: Category[];
}

export function AddProductForm({ onSuccess, product, categories }: AddProductFormProps) {
  const { toast } = useToast()
  const { userId } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEditing = !!product;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: product?.code || "",
      name: product?.name || "",
      category: product?.category || "",
      currency: product?.currency || 'DOP',
      productType: product?.productType || 'good',
      taxType: product?.taxType || '1',
      description: product?.description || "",
      notificationThreshold: product?.notificationThreshold ?? 10,
      restockTimeDays: product?.restockTimeDays,
      isTaxExempt: product?.isTaxExempt || false,
      image: product?.imageUrl || undefined,
      batches: product?.batches || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "batches"
  });

  const productType = form.watch('productType');
  const isService = productType === 'service';

  // Watch taxType change to toggle isTaxExempt
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'taxType') {
        if (value.taxType === '3') { // 3 is usually Exempt
          form.setValue('isTaxExempt', true);
        } else {
          form.setValue('isTaxExempt', false);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.setValue]);

  React.useEffect(() => {
    if (!isEditing && fields.length === 0 && !isService) {
      append({ cost: '' as any, price: '' as any, stock: '' as any, expirationDate: '' });
    }
  }, [isEditing, fields.length, append, isService]);

  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    if (!isService && (!values.batches || values.batches.length === 0)) {
      form.setError("batches", { message: "Debes agregar al menos un lote para productos físicos." });
      return;
    }

    const codeExists = await productApi.checkCode(values.code, product?.id);
    if (codeExists) {
      form.setError("code", { type: "manual", message: "Este código de producto ya está en uso." });
      return;
    }

    const batchesWithIds = (values.batches || []).map(batch => ({
      ...batch,
      id: batch.id || `batch-${Date.now()}-${Math.random()}`
    }));

    let imageUrl = product?.imageUrl || undefined;

    if (values.image instanceof File) {
      try {
        const path = `products/${userId}/${Date.now()}_${values.image.name}`;
        imageUrl = await uploadFile(values.image, path);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        toast({ title: "Error de imagen", description: "No se pudo subir la imagen del producto.", variant: "destructive" });
        return;
      }
    } else if (typeof values.image === 'string') {
      imageUrl = values.image;
    } else if (values.image === null || values.image === undefined || values.image === '') {
      imageUrl = undefined;
    }

    const { image, ...valuesWithoutImage } = values;

    const productData = {
      ...valuesWithoutImage,
      description: values.description || '',
      batches: isService ? [] : batchesWithIds, // No batches for services
      imageUrl: imageUrl,
      restockTimeDays: values.restockTimeDays === undefined ? null : values.restockTimeDays,
      userId: userId,
      price: isService ? 0 : (batchesWithIds[0]?.price || 0), // Services don't manage price here for now, or maybe they should have a base price? Assuming 0/variable
      cost: isService ? 0 : batchesWithIds[0]?.cost,
      stock: isService ? 0 : batchesWithIds.reduce((sum: number, batch: any) => sum + batch.stock, 0),
    };

    try {
      if (isEditing && product) {
        await productApi.update(product.id, productData);
        toast({ title: "Producto Actualizado", description: `El producto ${values.name} ha sido actualizado.` });
      } else {
        await productApi.create({ ...productData, description: productData.description || "" });
        logAnalyticsEvent('product_created');
        toast({ title: "Producto Agregado", description: `El producto ${values.name} ha sido agregado exitosamente.` });
      }
      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "No se pudo guardar el producto.", variant: "destructive" });
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('image', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    form.setValue('image', '', { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const totalStock = (form.watch('batches') || []).reduce((sum, batch) => sum + (Number(batch.stock) || 0), 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        <div className="flex gap-4 p-4 border rounded-lg bg-muted/20">
          <FormField control={form.control} name="productType" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Tipo de Ítem</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="good">Producto (Bien Físico)</SelectItem>
                  <SelectItem value="service">Servicio</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Los servicios no manejan inventario.</FormDescription>
            </FormItem>
          )} />

          <FormField control={form.control} name="taxType" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Impuesto Predeterminado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="1">ITBIS 18%</SelectItem>
                  <SelectItem value="2">ITBIS 16%</SelectItem>
                  <SelectItem value="3">Exento (0%)</SelectItem>
                  <SelectItem value="4">ITBIS 0%</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="code" render={({ field }) => (
            <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="CÓDIGO-01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Nombre del ítem" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl>
                <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DOP">DOP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {!isService && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <FormLabel>Lotes de Inventario</FormLabel>
                <FormDescription>Gestiona el stock, costo y precio por cada lote.</FormDescription>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Stock Total: <span className="font-bold">{totalStock}</span></span>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ cost: '' as any, price: '' as any, stock: '' as any, expirationDate: '' })}><PlusCircle className="mr-2 h-4 w-4" />Agregar Lote</Button>
              </div>
            </div>
            {fields.map((batchField: any, index: number) => (
              <div key={batchField.id} className="grid gap-4 p-4 border rounded-lg relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField control={form.control} name={`batches.${index}.cost`} render={({ field }) => (
                    <FormItem><FormLabel>Costo</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value === 0 && !isEditing ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`batches.${index}.price`} render={({ field }) => (
                    <FormItem><FormLabel>Precio Venta</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value === 0 && !isEditing ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`batches.${index}.stock`} render={({ field }) => (
                    <FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} value={field.value === 0 && !isEditing ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`batches.${index}.expirationDate`} render={({ field }) => (
                    <FormItem><FormLabel>Expiración</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="absolute top-2 right-2">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <FormMessage>{form.formState.errors.batches?.message}</FormMessage>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="restockTimeDays" render={({ field }) => (
            <FormItem>
              <FormLabel>Reposición (días)</FormLabel>
              <FormControl><Input type="number" placeholder="7" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} /></FormControl>
              <FormDescription className="text-xs">Días que dura 1 unidad para 1 persona.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notificationThreshold" render={({ field }) => (
            <FormItem>
              <FormLabel>Umbral de Notificación</FormLabel>
              <FormControl><Input type="number" placeholder="10" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl>
              <FormDescription className="text-xs">Opcional. Se aplica al stock total.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField
          control={form.control}
          name="isTaxExempt"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Exento de ITBIS</FormLabel>
                <FormDescription>
                  Si se activa, este producto no calculará ITBIS en las facturas.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={() => (
            <FormItem>
              <FormLabel>Imagen del Producto (Opcional)</FormLabel>
              {imagePreview && (
                <div className="relative w-32 h-32 my-2">
                  <Avatar className="w-full h-full rounded-md">
                    <AvatarImage src={imagePreview} alt="Vista previa del producto" className="object-cover" />
                    <AvatarFallback className="rounded-md">{form.getValues('name')?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={handleRemoveImage}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar imagen</span>
                  </Button>
                </div>
              )}
              <FormControl>
                <Input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="pt-2 text-sm file:text-primary file:font-semibold"
                />
              </FormControl>
              <FormDescription>Sube una imagen desde tu computadora. La importación desde Excel aún requiere una URL.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe el producto..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess} disabled={form.formState.isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Agregar Producto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

