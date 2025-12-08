'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loading: boolean;
    message: string;
    onMessageChange: (message: string) => void;
    clientPhone?: string;
    contextDescription?: string;
}

export function WhatsAppMessageDialog({
    open,
    onOpenChange,
    loading,
    message,
    onMessageChange,
    clientPhone,
    contextDescription = "IA redactó este borrador para ti. Edítalo o envíalo así."
}: WhatsAppMessageDialogProps) {
    const { toast } = useToast();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message);
        toast({ title: "Copiado", description: "Mensaje copiado al portapapeles" });
    };

    const handleSendWhatsApp = () => {
        if (!clientPhone) {
            toast({ title: "Error", description: "El cliente no tiene número de teléfono registrado.", variant: "destructive" });
            return;
        }
        window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mensaje Sugerido 💬</DialogTitle>
                    <DialogDescription>
                        {contextDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <Textarea
                            value={message}
                            onChange={(e) => onMessageChange(e.target.value)}
                            className="min-h-[150px] text-base"
                            placeholder="Escribe tu mensaje aquí..."
                        />
                    )}
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={copyToClipboard} className="flex-1" disabled={loading || !message}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                        </Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={handleSendWhatsApp}
                            disabled={loading || !message || !clientPhone}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            WhatsApp
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
