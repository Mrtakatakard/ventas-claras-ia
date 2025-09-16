
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteTeamMember, updateTeamMember, resendInvitationEmail } from "@/lib/firebase/service"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import type { UserProfile } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  role: z.enum(['admin', 'user'], { required_error: "Por favor selecciona un rol." }),
})

interface AddTeamMemberFormProps {
  onSuccess: () => void;
  member: UserProfile | null;
}

export function AddTeamMemberForm({ onSuccess, member }: AddTeamMemberFormProps) {
  const { toast } = useToast();
  const isEditing = !!member;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", role: "user" },
  });

  useEffect(() => {
    if (isEditing && member) {
      form.reset({
        name: member.name,
        email: member.email,
        role: member.role,
      });
    } else {
      form.reset({ name: "", email: "", role: "user" });
    }
  }, [member, isEditing, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditing && member) {
        // Only update name and role for existing members. Email is not editable.
        await updateTeamMember(member.id, { name: values.name, role: values.role });
        toast({ title: "Miembro Actualizado", description: `Los datos de ${values.name} han sido actualizados.` });
      } else {
        await inviteTeamMember(values);
        await resendInvitationEmail(values.email);
        toast({
          title: "Invitación Enviada",
          description: `Se ha enviado un correo de invitación a ${values.name}. Pídele que revise su bandeja de entrada para establecer su contraseña y acceder.`,
        });
      }
      form.reset();
      onSuccess();
    } catch (error: any) {
       console.error("Error submitting team member form:", error);
       let message = error.message || "Ocurrió un error. Por favor, inténtalo de nuevo.";
       if (message.includes('already-exists')) {
         message = "Este correo electrónico ya está en uso.";
         form.setError("email", { type: "manual", message: message });
       }
      toast({ title: isEditing ? "Error al Actualizar" : "Error al Invitar", description: message, variant: "destructive" });
    }
  }
  
  const handleCancel = () => {
    form.reset();
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem>
          )} />
        <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="user">Usuario</SelectItem></SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Enviar Invitación'}
            </Button>
        </div>
      </form>
    </Form>
  )
}

    