

'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/firebase/hooks"
import { addClientType, updateClientType } from "@/lib/firebase/service"
import type { ClientType } from "@/lib/types"
import { Switch } from "./ui/switch"

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  enableRestockTracking: z.boolean().default(false).optional(),
});

interface AddClientTypeFormProps {
  onSuccess: () => void;
  clientType: ClientType | null;
}

export function AddClientTypeForm({ onSuccess, clientType }: AddClientTypeFormProps) {
  const { toast } = useToast()
  const { userId } = useAuth();
  const isEditing = !!clientType;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: clientType?.name || "",
      description: clientType?.description || "",
      enableRestockTracking: clientType?.enableRestockTracking || false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    const dataToSave: Omit<ClientType, 'id' | 'createdAt' | 'isActive'> = {
      name: values.name,
      description: values.description || '',
      enableRestockTracking: values.enableRestockTracking,
      userId: userId,
    }

    try {
      if (isEditing && clientType) {
        await updateClientType(clientType.id, dataToSave);
        toast({
          title: "Tipo de Cliente Actualizado",
          description: `El tipo de cliente ${values.name} ha sido actualizado exitosamente.`,
        });
      } else {
        await addClientType(dataToSave, userId);
        toast({
          title: "Tipo de Cliente Agregado",
          description: `El tipo de cliente ${values.name} ha sido agregado exitosamente.`,
        });
      }
      onSuccess();
      form.reset();
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar el tipo de cliente.", variant: "destructive" });
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
          <FormItem><FormLabel>Nombre del Tipo de Cliente</FormLabel><FormControl><Input placeholder="Ej: Cliente VIP" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe este tipo de cliente..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField
          control={form.control}
          name="enableRestockTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Seguimiento de Reposición</FormLabel>
                <FormDescription>
                  Activar recordatorios automáticos de reposición para este tipo de cliente.
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Agregar Tipo'}</Button>
        </div>
      </form>
    </Form>
  )
}
