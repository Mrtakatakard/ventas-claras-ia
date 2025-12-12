'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

interface ScannedItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface ScannedData {
    items?: ScannedItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
}

interface MagicImportButtonProps {
    onDataScanned: (data: ScannedData) => void;
    disabled?: boolean;
}

export function MagicImportButton({ onDataScanned, disabled }: MagicImportButtonProps) {
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            toast({
                title: "Archivo muy grande",
                description: "Por favor usa una imagen de menos de 5MB.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Convert to Base64
            const base64 = await toBase64(file);

            // 2. Call Backend
            const scanFunction = httpsCallable(functions, 'ai-scanInvoice');
            const result = await scanFunction({ imageBase64: base64 });

            const data = result.data as { success: boolean, data: ScannedData };

            if (data.success && data.data) {
                toast({
                    title: "¡Lectura Mágica Exitosa! ✨",
                    description: "Hemos extraído los items de la factura.",
                });
                onDataScanned(data.data);
            } else {
                throw new Error("No se devolvieron datos.");
            }

        } catch (error: any) {
            console.error("Magic Import Error:", error);
            let msg = "No pudimos leer la factura.";

            if (error.code === 'resource-exhausted') { // Quota exceeded
                msg = "¡Te quedaste sin créditos de IA! Recarga para seguir usando la magia.";
            }

            toast({
                title: "Error de Escaneo",
                description: msg,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    return (
        <>
            <input
                type="file"
                accept="image/*"
                // Removed capture="environment" to allow User Choice (Camera or Gallery) on Mobile
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            <Button
                variant="outline"
                className="gap-2 border-primary/50 text-primary hover:bg-primary/10 transition-all dark:border-primary/20 dark:text-primary-foreground dark:bg-primary/20 dark:hover:bg-primary/30"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || loading}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Sparkles className="h-4 w-4" />
                )}
                {loading ? 'Analizando...' : 'Magic Import'}
            </Button>
        </>
    );
}
