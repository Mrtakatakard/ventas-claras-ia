
'use client'

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ClientTypesMovedPage() {
  return (
    <>
      <PageHeader title="Tipos de Cliente" description="Esta sección ha sido reubicada." />
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-lg">
            La gestión de Tipos de Cliente ahora se encuentra dentro de la página de Clientes.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/clients">
              Ir a Clientes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
