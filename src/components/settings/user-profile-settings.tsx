'use client'

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/firebase/hooks"
import { updateUserProfile } from "@/lib/firebase/service" // Ensure this is exported
import { PhoneInputComponent } from "@/components/ui/phone-input"
import { Loader2 } from "lucide-react"

const profileSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    phoneNumber: z.string().min(10, "El número de teléfono no es válido."),
})

export function UserProfileSettings() {
    const { userProfile, refreshUserProfile, userId } = useAuth()
    const { toast } = useToast()
    const [isUpdating, setIsUpdating] = useState(false)

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            phoneNumber: "",
        },
    })

    // Load initial data
    useEffect(() => {
        if (userProfile) {
            form.reset({
                name: userProfile.name || "",
                phoneNumber: userProfile.phoneNumber || "",
            })
        }
    }, [userProfile, form])

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        if (!userId) return

        setIsUpdating(true)
        try {
            await updateUserProfile(userId, {
                name: values.name,
                phoneNumber: values.phoneNumber,
            })
            await refreshUserProfile(userId)
            toast({
                title: "Perfil actualizado",
                description: "Tus datos han sido guardados correctamente.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo actualizar el perfil.",
                variant: "destructive",
            })
        } finally {
            setIsUpdating(false)
        }
    }

    if (!userProfile) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil de Usuario</CardTitle>
                <CardDescription>
                    Actualiza tu información personal y de contacto.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Tu nombre" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <FormLabel>Correo Electrónico</FormLabel>
                                <Input value={userProfile.email} disabled />
                                <p className="text-[0.8rem] text-muted-foreground">El correo no se puede cambiar directamente.</p>
                            </div>
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número de WhatsApp</FormLabel>
                                        <FormControl>
                                            <PhoneInputComponent
                                                placeholder="809-555-0101"
                                                {...field}
                                                onChange={(value: string) => field.onChange(value || "")}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
