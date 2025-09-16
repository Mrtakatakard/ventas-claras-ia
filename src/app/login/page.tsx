'use client';

import { BookOpenCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, firebaseConfig } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      let description = "Correo o contraseña no válidos. Si has sido invitado, busca en tu correo un enlace para establecer tu contraseña.";
      if (error.code === 'auth/operation-not-allowed') {
        description = "Este dominio no está autorizado para iniciar sesión. Por favor, añádelo en la configuración de Firebase Authentication.";
      }
       toast({
        title: 'Error al iniciar sesión',
        description: description,
        variant: 'destructive',
      });
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: 'Correo Requerido',
        description: 'Por favor, ingresa tu correo electrónico.',
        variant: 'destructive',
      });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Correo Enviado',
        description: 'Si tu correo está registrado, recibirás un enlace. Revisa tu bandeja de entrada y la carpeta de spam.',
      });
      setResetEmail('');
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
         toast({
            title: 'Correo Enviado',
            description: 'Si tu correo está registrado, recibirás un enlace. Revisa tu bandeja de entrada y la carpeta de spam.',
         });
         setResetEmail('');
      } else {
         toast({
            title: 'Error al enviar correo',
            description: 'No se pudo enviar el correo de restablecimiento. Verifica el correo e inténtalo de nuevo.',
            variant: 'destructive',
         });
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Bienvenido de nuevo</CardTitle>
          <CardDescription>Ingresa tu correo para acceder a tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="password">Contraseña</Label>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="link" type="button" className="p-0 h-auto text-xs font-normal">¿Olvidaste tu contraseña?</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restablecer Contraseña</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ingresa tu correo electrónico y te enviaremos un enlace para que puedas restablecer tu contraseña.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Correo electrónico</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            disabled={isResetting}
                            autoComplete="email"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePasswordReset} disabled={isResetting}>
                            {isResetting ? <Loader2 className="animate-spin" /> : 'Enviar Enlace'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
