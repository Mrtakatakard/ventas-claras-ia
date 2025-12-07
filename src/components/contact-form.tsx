
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  company: z.string().min(2, "El nombre de la empresa es requerido."),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
})

interface ContactFormProps {
  onSuccess: () => void;
}

export function ContactForm({ onSuccess }: ContactFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", company: "", message: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    form.clearErrors('root.serverError');

    try {
      const contactRequest = httpsCallable(functions, 'general-contactRequest');
      await contactRequest(values);

      toast({
        title: "Solicitud Enviada",
        description: "Gracias por tu interés. Un representante se comunicará contigo a la brevedad.",
      });
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error al Enviar",
        description: error.message || "No se pudo enviar tu solicitud. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Tu Nombre</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Tu Correo Electrónico</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="company" render={({ field }) => (
          <FormItem><FormLabel>Nombre de tu Empresa</FormLabel><FormControl><Input placeholder="Mi Empresa S.R.L." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="message" render={({ field }) => (
          <FormItem><FormLabel>Mensaje</FormLabel><FormControl><Textarea placeholder="Cuéntanos sobre tus necesidades..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </div>
      </form>
    </Form>
  )
}
