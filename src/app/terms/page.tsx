'use client'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function TermsOfServicePage() {
  const lastUpdated = "24 de Mayo de 2024"
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background shadow-sm">
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <Link href="/" className="text-lg font-bold text-primary">Ventas Claras</Link>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <PageHeader
          title="Términos y Condiciones de Servicio"
          description={`Última actualización: ${lastUpdated}`}
        />
        <Card className="mt-6">
          <CardContent className="pt-6 prose max-w-none">
            <p>Bienvenido a Ventas Claras. Estos términos y condiciones describen las reglas y regulaciones para el uso de nuestro sitio web y servicios.</p>

            <h2>1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar nuestro servicio, usted acepta y se compromete a cumplir con los términos y disposiciones de este acuerdo. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al servicio.</p>

            <h2>2. Cuentas de Usuario</h2>
            <p>Cuando crea una cuenta con nosotros, debe proporcionarnos información precisa, completa y actualizada en todo momento. El no hacerlo constituye una violación de los términos, lo que puede resultar en la terminación inmediata de su cuenta en nuestro servicio. Usted es responsable de salvaguardar la contraseña que utiliza para acceder al servicio y de cualquier actividad o acción bajo su contraseña.</p>

            <h2>3. Suscripciones y Pagos</h2>
            <p>Algunas partes del servicio se facturan por suscripción. Se le facturará de forma recurrente y periódica (mensual o anual). Su suscripción se renovará automáticamente al final de cada ciclo de facturación a menos que usted la cancele. El plan actual es de $15 USD por usuario activo por mes.</p>

            <h2>4. Contenido del Usuario</h2>
            <p>Nuestro servicio le permite publicar, vincular, almacenar, compartir y poner a disposición cierta información, texto, gráficos u otro material (&quot;Contenido&quot;). Usted es responsable del Contenido que publica en el servicio, incluyendo su legalidad, fiabilidad y adecuación. Al publicar Contenido, usted nos otorga el derecho y la licencia para usar, modificar, ejecutar públicamente, mostrar públicamente, reproducir y distribuir dicho Contenido en y a través del servicio. Usted retiene todos sus derechos sobre cualquier Contenido que envíe, publique o muestre.</p>

            <h2>5. Uso Prohibido</h2>
            <p>Usted se compromete a no utilizar el servicio para ningún propósito que sea ilegal o esté prohibido por estos términos. No puede utilizar el servicio de ninguna manera que pueda dañar, deshabilitar, sobrecargar o perjudicar el servicio.</p>

            <h2>6. Terminación</h2>
            <p>Podemos terminar o suspender su cuenta inmediatamente, sin previo aviso ni responsabilidad, por cualquier motivo, incluyendo, entre otros, si usted incumple los Términos. Tras la terminación, su derecho a utilizar el servicio cesará inmediatamente.</p>

            <h2>7. Limitación de Responsabilidad</h2>
            <p>En ningún caso Ventas Claras, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, sin limitación, la pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, como resultado de su acceso o uso o incapacidad de acceso o uso del servicio.</p>

            <h2>8. Cambios en los Términos</h2>
            <p>Nos reservamos el derecho, a nuestra entera discreción, de modificar o reemplazar estos Términos en cualquier momento. Le notificaremos cualquier cambio publicando los nuevos Términos en esta página.</p>

            <h2>9. Contáctenos</h2>
            <p>Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a través de nuestro correo electrónico de soporte: soporte@ventasclaras.com (ejemplo).</p>
          </CardContent>
        </Card>
      </main>
      <footer className="border-t mt-8 py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Ventas Claras. Todos los derechos reservados.</p>
        </div>
      </footer>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-lg"
          size="icon"
          aria-label="Volver arriba"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
