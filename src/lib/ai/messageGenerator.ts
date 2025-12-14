
export type MessageType = 'payment';

interface MessageContext {
    clientName: string;
    amount?: number | string;
    invoiceNumber?: string;
    productName?: string;
    businessName?: string;
    paymentLink?: string;
}

const TEMPLATES: Record<MessageType, string> = {
    payment: "Hola *{clientName}*, esperamos que estés bien.\n\nTe escribimos de *{businessName}* para recordarte amablemente que tu factura *{invoiceNumber}* por un monto de *{amount}* está pendiente.\n\nAgradeceríamos tu apoyo con el pago. ¡Gracias!",
};

export const generateMessage = (type: MessageType, context: MessageContext): string => {
    let message = TEMPLATES[type];

    // Replace all placeholders
    message = message.replace(/{clientName}/g, context.clientName || 'Cliente');
    message = message.replace(/{businessName}/g, context.businessName || 'nuestra empresa');
    message = message.replace(/{invoiceNumber}/g, context.invoiceNumber || '');
    message = message.replace(/{amount}/g, typeof context.amount === 'number' ? `$${context.amount.toFixed(2)}` : (context.amount || ''));

    return message;
};

export const getWhatsAppLink = (phone: string, text: string): string => {
    // Clean phone number: remove non-numeric chars
    let cleanPhone = phone.replace(/\D/g, '');

    // Add country code if missing (assuming DO context 1 or 809/829/849)
    // Basic heuristic: if 10 digits, add '1'.
    if (cleanPhone.length === 10) {
        cleanPhone = '1' + cleanPhone;
    }

    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};
