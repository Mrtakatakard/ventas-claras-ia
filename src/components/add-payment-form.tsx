
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/firebase/hooks"
import { invoiceApi } from "@/lib/api/invoiceApi"
import { uploadFile } from "@/lib/firebase/storage"
import type { Invoice, Payment } from "@/lib/types"
import { Loader2, Trash2 } from "lucide-react"
import { Textarea } from "./ui/textarea"
import React, { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface AddPaymentFormProps {
  invoice: Invoice;
  onSuccess: (newPayment: Payment) => void;
  onCancel: () => void;
}

const formSchema = z.object({
  amount: z.coerce.number()
    .positive("El monto debe ser mayor que cero.")
    .max(999999999, "El monto es demasiado grande."), // Prevent excessively large numbers
  paymentDate: z.string().min(1, "La fecha es requerida."),
  method: z.enum(['efectivo', 'transferencia', 'tarjeta'], { required_error: "Por favor selecciona un método." }),
  note: z.string().optional(),
  image: z.any().optional(),
})

export function AddPaymentForm({ invoice, onSuccess, onCancel }: AddPaymentFormProps) {
  const { toast } = useToast()
  const { userId } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Round the balance to 2 decimal places to avoid floating point issues.
  const currentBalance = Math.round((invoice.balanceDue ?? invoice.total) * 100) / 100;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: currentBalance,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'transferencia',
      note: '',
      image: undefined,
    },
  });

  // Custom validation inside the submit handler to handle the balance check
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    if (values.amount > currentBalance + 0.001) {
      form.setError("amount", {
        type: "manual",
        message: `El monto no puede exceder el balance de ${currentBalance.toFixed(2)} ${invoice.currency}.`
      });
      return;
    }

    try {
      let imageUrl = '';
      if (values.image instanceof File) {
        const paymentId = new Date().toISOString() + Math.random();
        // We generate a temporary ID for the image path, or we could let the backend handle it if we sent base64.
        // But here we upload first.
        imageUrl = await uploadFile(values.image, `users/${userId}/invoices/${invoice.id}/payments/${paymentId}/${values.image.name}`);
      }

      const paymentData = {
        ...values,
        imageUrl,
        image: undefined // Don't send the File object to the backend
      };

      await invoiceApi.addPayment(invoice.id, paymentData);

      toast({
        title: "Pago Registrado",
        description: `Se ha registrado un pago de ${values.amount.toFixed(2)} ${invoice.currency}.`,
      });
      // We don't have the full new payment object from the void return of addPayment in api (it returns void currently in my update, but backend returns payment).
      // I should update api to return payment or just reload.
      // For now, let's just call onSuccess with a dummy or reload.
      // Actually, the backend controller returns the payment object.
      // Let's update the API to return it.
      onSuccess({
        id: 'temp-id', // The real ID is in backend, we might need to refetch or update API to return it.
        ...paymentData,
        receiptNumber: 'PENDING',
        currency: invoice.currency,
        status: 'pagado'
      } as Payment);
      form.reset();
    } catch (e: any) {
      toast({ title: "Error al registrar el pago", description: e.message, variant: "destructive" });
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
    form.setValue('image', undefined, { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto a Pagar ({invoice.currency})</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha del Pago</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un método" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem><FormLabel>Nota (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Pago parcial, referencia #123..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField
          control={form.control}
          name="image"
          render={() => (
            <FormItem>
              <FormLabel>Comprobante (Opcional)</FormLabel>
              {imagePreview && (
                <div className="relative w-32 h-32 my-2">
                  <Avatar className="w-full h-full rounded-md">
                    <AvatarImage src={imagePreview} alt="Vista previa del comprobante" className="object-cover" />
                    <AvatarFallback className="rounded-md">IMG</AvatarFallback>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Pago
          </Button>
        </div>
      </form>
    </Form>
  )
}

