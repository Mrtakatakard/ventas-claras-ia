
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Copy, Check } from 'lucide-react';
import { generateMessage, getWhatsAppLink, MessageType } from '@/lib/ai/messageGenerator';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppMessageModalProps {
    type: MessageType;
    context: {
        clientName: string;
        clientPhone: string;
        amount?: number | string;
        invoiceNumber?: string;
        productName?: string;
        businessName?: string;
    };
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function WhatsAppMessageModal({ type, context, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: WhatsAppMessageModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    // Regenerate message when context/type changes or modal opens
    useEffect(() => {
        if (open) {
            const generated = generateMessage(type, context);
            setMessage(generated);
        }
    }, [open, type, context]);

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copiado", description: "Mensaje copiado al portapapeles." });
    };

    const handleSend = () => {
        if (!context.clientPhone) {
            toast({ title: "Error", description: "El cliente no tiene teléfono configurado.", variant: "destructive" });
            return;
        }

        const link = getWhatsAppLink(context.clientPhone, message);
        window.open(link, '_blank');
        if (setOpen) setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        {type === 'payment' ? 'Cobrar' : 'WhatsApp'}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {type === 'payment' && 'Recordatorio de Cobro'}
                    </DialogTitle>
                    <DialogDescription>
                        Personaliza el mensaje generado por IA antes de enviarlo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="message">Mensaje</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="h-[200px] resize-none"
                        />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copiar
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen && setOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Enviar por WhatsApp
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
