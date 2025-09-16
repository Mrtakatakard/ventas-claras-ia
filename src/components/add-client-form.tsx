

'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/firebase/hooks"
import { addClient, updateClient } from "@/lib/firebase/service"
import type { Client, ClientType, Address } from "@/lib/types"
import { PlusCircle, Trash2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { cn } from "@/lib/utils"
import React from "react"
import { logAnalyticsEvent } from "@/lib/firebase/analytics"

const addressSchema = z.object({
  id: z.string().optional(),
  alias: z.string().min(2, "El alias debe tener al menos 2 caracteres."),
  fullAddress: z.string().min(10, "La dirección debe tener al menos 10 caracteres."),
});

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Si se ingresa un correo, debe ser válido.").or(z.string().length(0)).optional(),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 caracteres."),
  birthday: z.string().optional(),
  clientTypeId: z.string({
    required_error: "Por favor selecciona un tipo de cliente.",
  }),
  addresses: z.array(addressSchema).min(1, "Debes agregar al menos una dirección."),
  defaultAddressIndex: z.coerce.number({invalid_type_error: "Debes seleccionar una dirección por defecto."}).min(0, "Debes seleccionar una dirección por defecto."),
})

interface AddClientFormProps {
  onSuccess: () => void;
  client: Client | null;
  clientTypes: ClientType[];
}

export function AddClientForm({ onSuccess, client, clientTypes }: AddClientFormProps) {
  const { toast } = useToast()
  const { userId } = useAuth();
  const isEditing = !!client;

  const defaultAddressIndex = client?.addresses?.findIndex(a => a.isDefault);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      birthday: client?.birthday || "",
      clientTypeId: client?.clientTypeId || "",
      addresses: client?.addresses?.map(a => ({ id: a.id, alias: a.alias, fullAddress: a.fullAddress })) || [],
      defaultAddressIndex: (defaultAddressIndex !== undefined && defaultAddressIndex !== -1) ? defaultAddressIndex : undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addresses"
  });

  React.useEffect(() => {
    if (!isEditing && fields.length === 0) {
      append({ alias: 'Principal', fullAddress: '' });
      form.setValue('defaultAddressIndex', 0);
    }
  }, [isEditing, fields.length, append, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }
    
    const selectedClientType = clientTypes.find(ct => ct.id === values.clientTypeId);

    if(!selectedClientType) {
        toast({ title: "Error", description: "Tipo de cliente no válido.", variant: "destructive" });
        return;
    }

    const finalAddresses: Address[] = values.addresses.map((addr, index) => ({
      ...addr,
      id: addr.id || `new-${Date.now()}-${index}`,
      isDefault: index === values.defaultAddressIndex,
    }));

    try {
      if (isEditing && client) {
        const updatedData: Partial<Client> = {
          name: values.name,
          email: values.email || '',
          phone: values.phone,
          birthday: values.birthday || '',
          clientTypeId: values.clientTypeId,
          clientTypeName: selectedClientType.name,
          addresses: finalAddresses,
        };
        await updateClient(client.id, updatedData);
        toast({
          title: "Cliente Actualizado",
          description: `El cliente ${values.name} ha sido actualizado exitosamente.`,
        });
      } else {
        const newClient: Omit<Client, 'id' | 'isActive'> = {
          name: values.name,
          email: values.email || '',
          phone: values.phone,
          birthday: values.birthday || '',
          clientTypeId: values.clientTypeId,
          clientTypeName: selectedClientType.name,
          addresses: finalAddresses,
          reminders: [],
          followUpChecks: {
            gaveSample: false,
            askedForReferrals: false,
            addedValue: false,
            invitedToChallenge: false,
            addedToBroadcast: false,
            gavePlan: false,
          },
          userId,
          createdAt: new Date(),
        }
        await addClient(newClient, userId);
        logAnalyticsEvent('client_created');
        toast({
          title: "Cliente Agregado",
          description: `El cliente ${values.name} ha sido agregado exitosamente.`,
        });
      }
      onSuccess();
      form.reset();
    } catch(e) {
       toast({ title: "Error", description: "No se pudo guardar el cliente.", variant: "destructive" });
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
            <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Correo Electrónico (Opcional)</FormLabel><FormControl><Input placeholder="nombre@ejemplo.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )}/>
        <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="809-123-4567" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
         <FormField control={form.control} name="birthday" render={({ field }) => (
            <FormItem><FormLabel>Cumpleaños (Opcional)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )}/>
        <FormField control={form.control} name="clientTypeId" render={({ field }) => (
            <FormItem><FormLabel>Tipo de Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo de cliente" /></SelectTrigger></FormControl>
                <SelectContent>{clientTypes.map(type => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent>
              </Select><FormMessage /></FormItem>
          )}/>
        
        <div className="space-y-4 rounded-lg border p-4">
            <div className="flex justify-between items-center">
                <FormLabel>Direcciones</FormLabel>
                 <Button type="button" size="sm" variant="outline" onClick={() => append({ alias: '', fullAddress: '' })}><PlusCircle className="mr-2 h-4 w-4" />Agregar</Button>
            </div>
            <FormDescription>Agrega una o más direcciones para el cliente. Selecciona una como predeterminada.</FormDescription>
            <FormField
              control={form.control}
              name="defaultAddressIndex"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      className="flex flex-col space-y-3"
                    >
                    {fields.map((addressField, index) => (
                      <div key={addressField.id} className="p-3 rounded-md border bg-muted/50 space-y-3 relative">
                         <div className="flex items-start gap-3">
                            <FormControl>
                                <RadioGroupItem value={index.toString()} className="mt-1" />
                            </FormControl>
                            <div className="grid gap-2 w-full">
                                <FormField control={form.control} name={`addresses.${index}.alias`} render={({ field }) => (
                                    <FormItem><FormLabel>Alias</FormLabel><FormControl><Input placeholder="Casa, Oficina..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`addresses.${index}.fullAddress`} render={({ field }) => (
                                    <FormItem><FormLabel>Dirección Completa</FormLabel><FormControl><Input placeholder="Calle Falsa 123, Santo Domingo" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                         </div>
                          <div className="absolute top-2 right-2">
                             <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                      </div>
                    ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Agregar Cliente'}</Button>
        </div>
      </form>
    </Form>
  )
}

    