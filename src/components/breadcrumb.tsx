
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const breadcrumbNameMap: { [key: string]: string } = {
  'dashboard': 'Panel de Control',
  'clients': 'Clientes',
  'products': 'Productos',
  'quotes': 'Cotizaciones',
  'invoices': 'Facturas',
  'accounts-receivable': 'Cuentas por Cobrar',
  'reports': 'Reportes',
  'team': 'Equipo',
  'settings': 'Configuración',
  'admin': 'Admin',
  'create': 'Crear',
  'edit': 'Editar',
};

// A simple regex to check if a string looks like an ID.
const isDynamicSegment = (segment: string) => /^[a-zA-Z0-9-]{10,}$/.test(segment);

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return null; // No breadcrumb on main dashboard page.
  }

  const generatedCrumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    let label: string;

    if (isDynamicSegment(segment)) {
      // For a path like /.../CLIENT_ID, check if the next part is 'edit'
      if (segments[index + 1] === 'edit') {
        return null; // Skip this ID segment, 'edit' will be handled next.
      }
      label = 'Detalles';
    } else {
      label = breadcrumbNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    
    return { href, label };
  }).filter(Boolean) as { href: string, label: string }[];


  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {generatedCrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          
          <Link
            href={crumb.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors",
              index === generatedCrumbs.length - 1 
                ? "bg-secondary text-secondary-foreground font-semibold pointer-events-none" 
                : "hover:bg-muted hover:text-foreground"
            )}
            aria-current={index === generatedCrumbs.length - 1 ? "page" : undefined}
          >
            {crumb.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  )
}
