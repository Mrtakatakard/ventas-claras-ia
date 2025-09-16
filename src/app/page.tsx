
'use client';

import { ArrowRight, Check, FileText, Sparkles, Users, ArrowUp, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContactForm } from '@/components/contact-form';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const mainRef = useRef<HTMLElement>(null);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  useEffect(() => {
    const mainEl = mainRef.current;
    
    const handleScroll = () => {
      const scrollY = window.scrollY || mainEl?.scrollTop || 0;
      if (scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    mainEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainEl?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const freeFeatures = [
    "👤 1 usuario",
    "📇 Hasta 50 clientes",
    "📦 Hasta 50 productos",
    "🧾 Hasta 30 facturas/cotizaciones al mes",
    "📧 Soporte básico por correo"
  ];
  
  const freeLimitations = [
      "Sin Consejos de Venta con IA",
      "Sin Gestión de Equipo",
      "Sin Reportes Globales"
  ];

  const proFeatures = [
    "👥 Hasta 10 usuarios",
    "💡 Consejos de venta con IA",
    "📇 Clientes y productos ilimitados",
    "🧾 Facturas y cotizaciones ilimitadas",
    "📊 Reportes individuales y globales",
    "📧 Soporte prioritario por correo"
  ];
  
  const enterpriseFeatures = [
      "✅ Todo lo del plan Pro",
      "🤝 Usuarios personalizables",
      "🔗 Integraciones a la medida",
      "🛡️ Seguridad avanzada (SSO)",
      "📞 Soporte técnico dedicado",
  ];


  return (
    <div className="bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10">
        <Logo />
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <a
            className="text-sm font-medium hover:text-primary underline-offset-4"
            href="#features"
          >
            Características
          </a>
          <a
            className="text-sm font-medium hover:text-primary underline-offset-4"
            href="#pricing"
          >
            Precios
          </a>
          <Button asChild variant="outline">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </nav>
      </header>

      <main ref={mainRef} className="md:h-screen md:snap-y md:snap-mandatory md:overflow-y-scroll">
        {/* Hero Section */}
        <section id="hero" className="w-full flex flex-col items-center justify-center py-24 pt-40 md:h-screen md:py-0 md:pt-0 md:snap-start">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none">
                  Organiza tu proceso de ventas y multiplica tus ingresos.
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Ventas Claras es el CRM amigable que centraliza tu información de clientes, agiliza tu facturación y te da consejos de IA para que nunca pierdas una oportunidad.
                </p>
              </div>
              <div className="space-y-4">
                <Button asChild size="lg">
                  <Link href="/login">
                    Empieza a vender mejor
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Gestión de Clientes 360°</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Facturación en Segundos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Consejos de Venta con IA</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full flex flex-col items-center justify-center bg-muted py-24 md:h-screen md:py-0 md:snap-start">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm font-semibold">Características Clave</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Diseñado para el vendedor moderno</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Menos tiempo administrando, más tiempo vendiendo. Estas son las herramientas que te ayudarán a lograrlo.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center justify-center rounded-full bg-primary p-4 text-primary-foreground">
                    <Users className="h-8 w-8" />
                </div>
                <div className="grid gap-1">
                    <h3 className="text-xl font-bold">Visión 360° del Cliente</h3>
                    <p className="text-muted-foreground">
                    Toda la información de tus clientes en un solo lugar: contacto, historial, recordatorios y más.
                    </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="flex items-center justify-center rounded-full bg-primary p-4 text-primary-foreground">
                    <FileText className="h-8 w-8" />
                </div>
                <div className="grid gap-1">
                    <h3 className="text-xl font-bold">Facturación sin Esfuerzo</h3>
                    <p className="text-muted-foreground">
                    Crea cotizaciones y facturas profesionales en segundos y convierte prospectos en clientes con un clic.
                    </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="flex items-center justify-center rounded-full bg-primary p-4 text-primary-foreground">
                    <Sparkles className="h-8 w-8" />
                </div>
                 <div className="grid gap-1">
                    <h3 className="text-xl font-bold">Asistente de Ventas IA</h3>
                    <p className="text-muted-foreground">
                    Recibe recomendaciones inteligentes para dar seguimiento, ofrecer productos y fortalecer la lealtad.
                    </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full flex flex-col items-center justify-center bg-background py-24 md:py-0 md:snap-start min-h-screen">
            <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
                <div className="space-y-3 pt-12 md:pt-0">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                    Planes para cada etapa de tu negocio
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Escoge el plan que mejor se adapte a tus necesidades. Sin sorpresas, con precios transparentes.
                </p>
                </div>
                <div className="mx-auto w-full max-w-sm">
                    <Tabs defaultValue="monthly" className="w-full" onValueChange={(value) => setBillingCycle(value as 'monthly' | 'annual')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4 mx-auto max-w-xs">
                        <TabsTrigger value="monthly">Mensual</TabsTrigger>
                        <TabsTrigger value="annual">Anual (Ahorra 20%)</TabsTrigger>
                    </TabsList>
                    </Tabs>
                </div>
                <div className={cn(
                    "grid w-full items-start justify-center gap-8 lg:grid-cols-3 lg:items-stretch",
                    billingCycle === 'annual' && "lg:grid-cols-2 lg:max-w-4xl"
                )}>
                {/* Free Plan */}
                {billingCycle === 'monthly' && (
                  <Card className="flex flex-col h-full">
                      <CardHeader>
                          <CardTitle>Gratis</CardTitle>
                          <CardDescription>Ideal para vendedores individuales que están comenzando a organizarse.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 grid gap-6">
                          <div className="text-4xl font-extrabold">$0</div>
                          <ul className="space-y-3 text-left">
                              {freeFeatures.map(feat => (
                                  <li key={feat} className="flex items-center gap-3 text-sm">
                                      <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                                      <span>{feat.split(" ").slice(1).join(" ")}</span>
                                  </li>
                              ))}
                              {freeLimitations.map(feat => (
                                  <li key={feat} className="flex items-center gap-3 text-sm">
                                      <X className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                      <span className="text-muted-foreground">{feat}</span>
                                  </li>
                              ))}
                          </ul>
                      </CardContent>
                      <div className="p-6 pt-0 mt-auto">
                          <Button asChild className="w-full" variant="outline">
                              <Link href="/login">Empezar Gratis</Link>
                          </Button>
                      </div>
                  </Card>
                )}

                {/* Pro Plan */}
                <Card className="border-2 border-primary flex flex-col h-full shadow-2xl relative">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Más Popular</Badge>
                    <CardHeader>
                        <CardTitle>Pro</CardTitle>
                        <CardDescription>Para profesionales y equipos que buscan maximizar su rendimiento con herramientas avanzadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 grid gap-6">
                        {billingCycle === 'monthly' ? (
                            <div className="text-4xl font-extrabold">$22<span className="text-base font-normal text-muted-foreground">/mes por usuario</span></div>
                        ) : (
                            <div>
                                <div className="text-4xl font-extrabold">$17.60<span className="text-base font-normal text-muted-foreground">/mes por usuario</span></div>
                                <Badge variant="secondary" className="mt-1">Facturado anualmente</Badge>
                            </div>
                        )}
                        <ul className="space-y-3 text-left">
                            {proFeatures.map(feat => (
                                <li key={feat} className="flex items-center gap-3 text-sm">
                                    <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                                    <span>{feat.split(" ").slice(1).join(" ")}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <div className="p-6 pt-0 mt-auto">
                        <Button asChild className="w-full">
                            <Link href="/login">Empezar con Pro</Link>
                        </Button>
                    </div>
                </Card>

                {/* Enterprise Plan */}
                 <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Enterprise</CardTitle>
                        <CardDescription>Soluciones a la medida para equipos a gran escala que necesitan un control total.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 grid gap-6">
                        <div className="text-4xl font-extrabold">A tu medida</div>
                        <ul className="space-y-3 text-left">
                            {enterpriseFeatures.map(feat => (
                                <li key={feat} className="flex items-center gap-3 text-sm">
                                    <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                                    <span>{feat.split(" ").slice(1).join(" ")}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <div className="p-6 pt-0 mt-auto">
                        <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full" variant="outline">Contactar a Ventas</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Contactar a Ventas</DialogTitle>
                              <DialogDescription>
                                Completa el formulario y nuestro equipo se pondrá en contacto contigo para discutir el plan Enterprise.
                              </DialogDescription>
                            </DialogHeader>
                            <ContactForm onSuccess={() => setIsContactFormOpen(false)} />
                          </DialogContent>
                        </Dialog>
                    </div>
                </Card>
                </div>
            </div>
            <footer className="w-full mt-auto">
                <div className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t container mx-auto mt-12">
                    <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Ventas Claras. Todos los derechos reservados.</p>
                    <nav className="sm:ml-auto flex gap-4 sm:gap-6">
                        <Link className="text-xs hover:underline underline-offset-4" href="/terms">
                        Términos de Servicio
                        </Link>
                        <Link className="text-xs hover:underline underline-offset-4" href="/privacy">
                        Política de Privacidad
                        </Link>
                    </nav>
                </div>
            </footer>
        </section>
      </main>

       {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-lg z-20"
          size="icon"
          aria-label="Volver arriba"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
