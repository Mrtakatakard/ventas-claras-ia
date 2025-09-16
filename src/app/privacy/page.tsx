'use client'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function PrivacyPolicyPage() {
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
            title="Política de Privacidad"
            description={`Última actualización: ${lastUpdated}`}
        />
        <Card className="mt-6">
          <CardContent className="pt-6 prose max-w-none">
            <p>Ventas Claras ("nosotros", "nuestro" o "nos") opera el sitio web y el servicio Ventas Claras (el "Servicio"). Esta página le informa sobre nuestras políticas con respecto a la recopilación, uso y divulgación de datos personales cuando utiliza nuestro Servicio y las opciones que ha asociado con esos datos.</p>
            
            <h2>1. Información que Recopilamos</h2>
            <p>Recopilamos varios tipos diferentes de información para diversos fines para proporcionar y mejorar nuestro Servicio para usted.</p>
            <ul>
              <li><strong>Datos Personales:</strong> Mientras utiliza nuestro Servicio, podemos pedirle que nos proporcione cierta información de identificación personal que se puede utilizar para contactarlo o identificarlo ("Datos Personales"). Esto puede incluir, entre otros: dirección de correo electrónico, nombre y apellido.</li>
              <li><strong>Datos de Uso:</strong> Podemos recopilar información sobre cómo se accede y utiliza el Servicio ("Datos de Uso"). Estos Datos de Uso pueden incluir información como la dirección de Protocolo de Internet de su computadora (por ejemplo, dirección IP), tipo de navegador, versión del navegador, las páginas de nuestro Servicio que visita, la hora y fecha de su visita, el tiempo dedicado a esas páginas y otros datos de diagnóstico.</li>
              <li><strong>Datos de Clientes:</strong> Usted nos proporciona los datos de sus propios clientes (nombres, información de contacto, facturas, etc.) para utilizar las funcionalidades de CRM de nuestro servicio. Nosotros actuamos como procesadores de estos datos en su nombre. Usted es el controlador de los datos de sus clientes y es responsable de cumplir con las leyes de protección de datos aplicables.</li>
            </ul>

            <h2>2. Uso de Datos</h2>
            <p>Ventas Claras utiliza los datos recopilados para diversos fines:</p>
            <ul>
              <li>Para proporcionar y mantener nuestro Servicio.</li>
              <li>Para notificarle sobre cambios en nuestro Servicio.</li>
              <li>Para permitirle participar en funciones interactivas de nuestro Servicio cuando elija hacerlo.</li>
              <li>Para proporcionar atención al cliente.</li>
              <li>Para recopilar análisis o información valiosa para que podamos mejorar nuestro Servicio.</li>
              <li>Para monitorear el uso de nuestro Servicio.</li>
              <li>Para detectar, prevenir y abordar problemas técnicos.</li>
            </ul>

            <h2>3. Seguridad de los Datos</h2>
            <p>La seguridad de sus datos es importante para nosotros, pero recuerde que ningún método de transmisión por Internet o método de almacenamiento electrónico es 100% seguro. Si bien nos esforzamos por utilizar medios comercialmente aceptables para proteger sus Datos Personales (utilizando los servicios de seguridad de Firebase), no podemos garantizar su seguridad absoluta.</p>

            <h2>4. Proveedores de Servicios</h2>
            <p>Podemos emplear a terceras empresas e individuos para facilitar nuestro Servicio ("Proveedores de Servicios"), para proporcionar el Servicio en nuestro nombre, para realizar servicios relacionados con el Servicio o para ayudarnos a analizar cómo se utiliza nuestro Servicio. Estos terceros tienen acceso a sus Datos Personales solo para realizar estas tareas en nuestro nombre y están obligados a no divulgarlos ni utilizarlos para ningún otro propósito.</p>
            
            <h2>5. Privacidad de los Niños</h2>
            <p>Nuestro Servicio no se dirige a nadie menor de 18 años ("Niños"). No recopilamos a sabiendas información de identificación personal de nadie menor de 18 años. Si usted es un padre o tutor y sabe que su hijo nos ha proporcionado Datos Personales, por favor contáctenos.</p>

            <h2>6. Cambios a esta Política de Privacidad</h2>
            <p>Podemos actualizar nuestra Política de Privacidad de vez en cuando. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página. Se le aconseja que revise esta Política de Privacidad periódicamente para detectar cualquier cambio.</p>

            <h2>7. Contáctenos</h2>
            <p>Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos: soporte@ventasclaras.com (ejemplo).</p>
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
