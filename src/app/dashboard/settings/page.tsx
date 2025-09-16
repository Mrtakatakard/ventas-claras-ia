'use client'

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/firebase/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <>
        <PageHeader title="Configuración" description="Gestiona la configuración de la aplicación." />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-full max-w-sm" />
          </CardHeader>
          <CardContent>
             <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Configuración" description="Gestiona la configuración de la aplicación." />
       <Card>
        <CardHeader>
            <CardTitle>Integraciones</CardTitle>
            <CardDescription>Conecta tu cuenta con otros servicios para automatizar tus ventas.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">Actualmente no hay integraciones disponibles.</p>
        </CardContent>
      </Card>
    </>
  )
}
