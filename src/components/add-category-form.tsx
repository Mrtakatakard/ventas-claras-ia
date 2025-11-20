

'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/firebase/hooks"
import { addCategory, updateCategory } from "@/lib/firebase/service"
import type { Category } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  description: z.string().optional(),
});

interface AddCategoryFormProps {
  onSuccess: () => void;
  category: Category | null;
}

export function AddCategoryForm({ onSuccess, category }: AddCategoryFormProps) {
  const { toast } = useToast()
  const { userId } = useAuth();
  const isEditing = !!category;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    const dataToSave: Omit<Category, 'id' | 'createdAt' | 'isActive'> = {
      name: values.name,
      description: values.description || '',
      userId: userId,
    }

    try {
      if (isEditing && category) {
        await updateCategory(category.id, dataToSave);
        toast({
          title: "Categoría Actualizada",
          description: `La categoría ${values.name} ha sido actualizada exitosamente.`,
        });
      } else {
        await addCategory(dataToSave, userId);
        toast({
          title: "Categoría Agregada",
          description: `La categoría ${values.name} ha sido agregada exitosamente.`,
        });
      }
      onSuccess();
      form.reset();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar la categoría.", variant: "destructive" });
    }
  }

  const handleCancel = () => {
    form.reset();
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre de la Categoría</FormLabel><FormControl><Input placeholder="Ej: Nutrición" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe esta categoría..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Agregar Categoría'}</Button>
        </div>
      </form>
    </Form>
  )
}
