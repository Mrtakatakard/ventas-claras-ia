'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import imageCompression from 'browser-image-compression';

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

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Formato Incorrecto",
                description: "Por favor selecciona una imagen (PNG, JPG, JPEG).",
                variant: "destructive"
            });
            e.target.value = ''; // Reset
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            toast({
                title: "Archivo muy grande",
                description: "Por favor usa una imagen de menos de 5MB.",
                variant: "destructive"
            });
            e.target.value = ''; // Reset
            return;
        }

        setLoading(true);

        try {
            // 1. Compress Image (CTO Audit Improvement)
            const options = {
                maxSizeMB: 0.8, // Resize to ~800KB
                maxWidthOrHeight: 1200, // HD Quality is enough for OCR
                useWebWorker: true,
                fileType: 'image/jpeg' // Force Output Type
            };

            let compressedFile: File | Blob = file;
            try {
                const compressed = await imageCompression(file, options);
                if (compressed instanceof Blob) {
                    compressedFile = compressed;
                } else {
                    console.warn("Compression result was not a Blob/File, using original.");
                }
            } catch (compressionError) {
                console.warn("Compression failed, using original file:", compressionError);
                // Fallback to original
            }

            // Final sanity check: if somehow we still don't have a Blob (unlikely), force original
            if (!(compressedFile instanceof Blob)) {
                console.warn("compressedFile is not a Blob, forcing original file.");
                compressedFile = file;
            }

            // 2. Convert to Base64
            const base64 = await toBase64(compressedFile);

            // 3. Call Backend
            const scanFunction = httpsCallable(functions, 'scanInvoice');
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
            } else if (error.message) {
                msg = error.message;
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

    const toBase64 = (file: File | Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            try {
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            } catch (e) {
                reject(e);
            }
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
                {loading ? 'Analizando...' : 'Escanear Factura (IA)'}
            </Button>
        </>
    );
}
