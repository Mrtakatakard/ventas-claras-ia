
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, Loader2, CreditCard, Clipboard, Info, MessageSquare } from "lucide-react";
import { WhatsAppMessageDialog } from '@/components/whatsapp-message-dialog';
import { getInvoice, getClient } from '@/lib/firebase/service';
import { getWhatsAppMessage } from '@/ai/flows/whatsapp-generator-flow';
import type { Invoice, Payment, InvoiceItem, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPaymentForm } from '@/components/add-payment-form';
import { useAuth } from '@/lib/firebase/hooks';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { userId } = useAuth();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // WhatsApp State
  const [client, setClient] = useState<Client | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    const inv = await getInvoice(id);
    if (!inv || inv.userId !== userId) { // Security check
      notFound();
    }
    setInvoice(inv);

    // Fetch client for phone number
    if (inv.clientId) {
      const clientData = await getClient(inv.clientId);
      setClient(clientData);
    }

    setLoading(false);
  }, [id, userId]);

  useEffect(() => {
    if (userId) {
      fetchInvoice();
    }
  }, [userId, fetchInvoice]);

  const formatCurrency = (num: number, currency?: 'DOP' | 'USD') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchInvoice();
  };

  const handleGenerateMessage = async () => {
    if (!invoice || !client) return;

    // Detect Mobile/Tablet
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 1. MOBILE STRATEGY: Native Share + Clipboard
    if (isMobile && navigator.share && navigator.canShare) {
      setMessageLoading(true);
      try {
        const blob = await generatePdfBlob();
        if (!blob) throw new Error("Failed to generate PDF");

        const file = new File([blob], `Factura-${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

        // Generate message
        let shareMessage = "";
        try {
          const result = await getWhatsAppMessage({
            clientName: client.name,
            intent: 'SEND_INVOICE',
            context: invoice.invoiceNumber,
            tone: 'Casual'
          });
          shareMessage = result.message;
        } catch {
          shareMessage = `Hola ${client.name}, aquí te envío la factura #${invoice.invoiceNumber}.`;
        }

        if (navigator.canShare({ files: [file] })) {
          // Copy text to clipboard because WhatsApp often ignores text when sharing files
          try {
            await navigator.clipboard.writeText(shareMessage);
            toast({ title: "Mensaje Copiado 📋", description: "Pégalo en el chat al enviar la factura." });
          } catch (err) {
            console.error("Clipboard failed", err);
          }

          await navigator.share({
            files: [file],
            // We attempt to send text/title but expect them to be ignored by some apps
            title: `Factura ${invoice.invoiceNumber}`,
            text: shareMessage,
          });

          setMessageLoading(false);
          return; // Stop here for mobile
        }
      } catch (error) {
        console.error("Native share failed, falling back to desktop mode", error);
        // If share fails, fall through to desktop mode
      }
      setMessageLoading(false);
    }

    // 2. DESKTOP STRATEGY: Dialog + Auto Download
    setIsMessageDialogOpen(true);
    setMessageLoading(true);
    setMessageDraft("Generando mensaje de factura... 📠");

    // Start PDF download
    try {
      await handleDownloadPdf();
      toast({ title: "PDF Descargado", description: "Recuerda adjuntarlo en WhatsApp Web." });
    } catch (e) {
      console.error("Error downloading PDF", e);
    }

    try {
      const result = await getWhatsAppMessage({
        clientName: client.name,
        intent: 'SEND_INVOICE',
        context: invoice.invoiceNumber,
        tone: 'Casual'
      });
      setMessageDraft(result.message);
    } catch (error) {
      console.error("Error generating message", error);
      setMessageDraft(`Hola ${client.name}, aquí te envío la factura #${invoice.invoiceNumber}. Saludos!`);
    } finally {
      setMessageLoading(false);
    }
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!invoice) return null;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Ventas Claras", 14, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Tu Negocio, Tus Reglas.", 14, 28);

    // Invoice Number and Status
    doc.setFontSize(18);
    doc.text(`Factura: ${invoice.invoiceNumber}`, 200, 22, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`Estado: ${invoice.status}`, 200, 28, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(14, 38, 200, 38);

    // Client and Date Info
    let currentY = 54;
    doc.setFontSize(10);
    doc.text("Facturar a:", 14, 48);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.clientName, 14, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.clientEmail, 14, currentY);
    if (invoice.clientAddress) {
      currentY += 5;
      doc.text(invoice.clientAddress, 14, currentY);
    }


    const rightColX = 200;
    doc.setFont("helvetica", "bold");
    doc.text("Fecha de Emisión:", rightColX, 48, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(invoice.issueDate, rightColX, 54, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text("Fecha de Vencimiento:", rightColX, 62, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(invoice.dueDate, rightColX, 68, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 80,
      head: [['Cant.', 'Producto', 'Precio Unit.', 'Desc. (%)', 'Total']],
      body: invoice.items.map(item => [
        item.quantity,
        item.productName,
        formatCurrency(item.unitPrice, invoice.currency),
        `${item.discount || 0}%`,
        formatCurrency((item.finalPrice ?? item.unitPrice) * item.quantity, invoice.currency)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [38, 127, 172], // A blue color
        halign: 'center'
      },
      styles: { halign: 'left' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      didParseCell: function (data) {
        if (data.section === 'head') {
          switch (data.column.index) {
            case 2:
            case 3:
            case 4:
              data.cell.styles.halign = 'right';
              break;
            default:
              data.cell.styles.halign = 'left';
          }
          if (data.column.index === 0) {
            data.cell.styles.halign = 'center';
          }
        }
      }
    });

    // Totals section
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalsX = 140;
    const valueX = 200;

    const calculateTaxableSubtotal = (items: InvoiceItem[]): number => {
      return items.reduce((acc, item) => {
        if (!item.isTaxExempt) {
          const itemTotal = (item.finalPrice ?? item.unitPrice) * item.quantity;
          return acc + itemTotal;
        }
        return acc;
      }, 0);
    };

    const netSubtotal = invoice.subtotal - (invoice.discountTotal || 0);
    const taxableSubtotal = calculateTaxableSubtotal(invoice.items);
    const showTaxableSubtotal = invoice.includeITBIS !== false && taxableSubtotal < netSubtotal;

    doc.setFontSize(10);

    if (invoice.discountTotal && invoice.discountTotal > 0) {
      doc.text("Subtotal Bruto:", totalsX, finalY, { align: 'right' });
      doc.text(formatCurrency(invoice.subtotal, invoice.currency), valueX, finalY, { align: 'right' });
      finalY += 7;
      doc.text("Descuento:", totalsX, finalY, { align: 'right' });
      doc.text(`- ${formatCurrency(invoice.discountTotal, invoice.currency)}`, valueX, finalY, { align: 'right' });
      finalY += 7;
    }

    doc.text("Subtotal Neto:", totalsX, finalY, { align: 'right' });
    doc.text(formatCurrency(netSubtotal, invoice.currency), valueX, finalY, { align: 'right' });
    finalY += 7;

    if (showTaxableSubtotal) {
      doc.setFontSize(8);
      doc.text("Subtotal Gravable (para ITBIS):", totalsX, finalY, { align: 'right' });
      doc.text(formatCurrency(taxableSubtotal, invoice.currency), valueX, finalY, { align: 'right' });
      finalY += 7;
      doc.setFontSize(10);
    }

    if (invoice.includeITBIS !== false) {
      doc.text("ITBIS (18%):", totalsX, finalY, { align: 'right' });
      doc.text(formatCurrency(invoice.itbis || 0, invoice.currency), valueX, finalY, { align: 'right' });
      finalY += 7;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Total Factura:", totalsX, finalY, { align: 'right' });
    doc.text(formatCurrency(invoice.total, invoice.currency), valueX, finalY, { align: 'right' });

    doc.setLineWidth(0.2);
    doc.line(totalsX - 10, finalY + 3, valueX, finalY + 3);

    finalY += 9;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Balance Pendiente:", totalsX, finalY, { align: 'right' });
    doc.text(formatCurrency(invoice.balanceDue, invoice.currency), valueX, finalY, { align: 'right' });

    return doc.output('blob');
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    const blob = await generatePdfBlob();
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    }
    setIsDownloading(false);
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    if (!invoice) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [44, 175, 224];
    const backgroundColor: [number, number, number] = [240, 248, 255];

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Ventas Claras", 14, 22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Tu Negocio, Tus Reglas.", 14, 28);

    // Receipt Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("RECIBO DE PAGO", 200, 40, { align: 'right' });

    doc.setLineWidth(0.1);
    doc.setDrawColor(200);
    doc.line(14, 48, 200, 48);

    // Info section
    const rightColX = 140;
    const valueX = 200;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("RECIBIDO DE:", 14, 60);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(invoice.clientName, 14, 66);
    doc.text(invoice.clientEmail, 14, 72);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("No. Recibo:", rightColX, 60, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(payment.receiptNumber, valueX, 60, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Fecha de Pago:", rightColX, 66, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(payment.paymentDate, valueX, 66, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Factura Asociada:", rightColX, 72, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(invoice.invoiceNumber, valueX, 72, { align: 'right' });

    // Payment details table
    autoTable(doc, {
      startY: 85,
      head: [['Descripción', 'Método de Pago', 'Monto Pagado']],
      body: [[
        `Abono a factura #${invoice.invoiceNumber}`,
        payment.method.charAt(0).toUpperCase() + payment.method.slice(1),
        formatCurrency(payment.amount, invoice.currency),
      ]],
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        2: { halign: 'right' }
      }
    });

    // Total section
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Draw a box for the total
    doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
    doc.setDrawColor(200);
    doc.roundedRect(120, finalY - 5, 80, 20, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("TOTAL PAGADO:", 125, finalY + 3);
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(formatCurrency(payment.amount, invoice.currency), 200, finalY + 10, { align: 'right' });

    // Footer
    finalY = 280;
    doc.setLineWidth(0.1);
    doc.setDrawColor(200);
    doc.line(14, finalY, 200, finalY);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("¡Gracias por su pago!", 105, finalY + 8, { align: 'center' });

    doc.save(`recibo-${payment.receiptNumber}.pdf`);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pagada": return "default";
      case "pendiente": return "secondary";
      case "parcialmente pagada": return "secondary";
      case "vencida": return "destructive";
      default: return "outline";
    }
  }

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  if (loading) {
    return (
      <div className='flex flex-col gap-8'>
        <PageHeader title={<Skeleton className='h-8 w-40' />} description={<Skeleton className='h-5 w-32' />} />
        <Card className="p-8">
          <Skeleton className='h-[600px] w-full' />
        </Card>
      </div>
    )
  }

  if (!invoice) {
    return notFound();
  }

  const netSubtotal = invoice.subtotal - (invoice.discountTotal || 0);
  const totalCost = invoice.items.reduce((acc, item) => acc + ((item.unitCost || 0) * item.quantity), 0);
  const totalProfit = netSubtotal - totalCost;

  const taxableSubtotal = invoice.items.reduce((acc, item) => {
    if (!item.isTaxExempt) {
      const itemTotal = (item.finalPrice ?? item.unitPrice) * item.quantity;
      return acc + itemTotal;
    }
    return acc;
  }, 0);

  const showTaxableSubtotal = invoice.includeITBIS !== false && taxableSubtotal < netSubtotal;


  return (
    <>
      <PageHeader title={`Factura ${invoice.invoiceNumber}`} description={`Emitida el ${invoice.issueDate}`}>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <Button onClick={() => setIsPaymentDialogOpen(true)} disabled={invoice.balanceDue <= 0}>
              <CreditCard className="mr-2 h-4 w-4" />
              Registrar Pago
            </Button>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar un Nuevo Pago</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles del pago para la factura {invoice.invoiceNumber}.
                </DialogDescription>
              </DialogHeader>
              <AddPaymentForm
                invoice={invoice}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setIsPaymentDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleGenerateMessage} className="text-green-600 border-green-600 hover:bg-green-50">
            <MessageSquare className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <WhatsAppMessageDialog
            open={isMessageDialogOpen}
            onOpenChange={setIsMessageDialogOpen}
            loading={messageLoading}
            message={messageDraft}
            onMessageChange={setMessageDraft}
            clientPhone={client?.phone}
            contextDescription="Mensaje sugerido para enviar esta factura."
          />
        </div>
      </PageHeader>


      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="p-8" id="invoice-printable-area">
            <div className="grid gap-10">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Ventas Claras</h2>
                  <p className="text-muted-foreground">Tu Negocio, Tus Reglas.</p>
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-extrabold text-primary">{invoice.invoiceNumber}</h1>
                  <Badge variant={getStatusVariant(invoice.status)} className="text-sm mt-1">{capitalizeFirstLetter(invoice.status)}</Badge>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">Facturar a:</h3>
                  <p className="font-bold">{invoice.clientName}</p>
                  <p className="text-muted-foreground">{invoice.clientEmail}</p>
                  {invoice.clientAddress && <p className="text-muted-foreground">{invoice.clientAddress}</p>}
                </div>
                <div className="text-right">
                  <h3 className="font-semibold mb-1">Fecha de Emisión:</h3>
                  <p className="text-muted-foreground">{invoice.issueDate}</p>
                  <h3 className="font-semibold mb-1 mt-2">Fecha de Vencimiento:</h3>
                  <p className="text-muted-foreground">{invoice.dueDate}</p>
                </div>
              </div>

              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Cant.</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Desc. (%)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice, invoice.currency)}</TableCell>
                        <TableCell className="text-right">{item.unitCost ? formatCurrency(item.unitCost, invoice.currency) : "N/A"}</TableCell>
                        <TableCell className="text-right">{item.discount || 0}%</TableCell>
                        <TableCell className="text-right">{formatCurrency((item.finalPrice ?? item.unitPrice) * item.quantity, invoice.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  {invoice.discountTotal && invoice.discountTotal > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Subtotal Bruto</span>
                        <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Descuento</span>
                        <span>- {formatCurrency(invoice.discountTotal, invoice.currency)}</span>
                      </div>
                      <Separator />
                    </>
                  ) : null}
                  <div className="flex justify-between">
                    <span>Subtotal Neto</span>
                    <span>{formatCurrency(netSubtotal, invoice.currency)}</span>
                  </div>
                  {showTaxableSubtotal && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal Gravable (para ITBIS)</span>
                      <span>{formatCurrency(taxableSubtotal, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.includeITBIS !== false && (
                    <div className="flex justify-between">
                      <span>ITBIS (18%)</span>
                      <span>{formatCurrency(invoice.itbis || 0, invoice.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Factura</span>
                    <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                  </div>
                  {totalCost > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo Total</span>
                        <span className="text-muted-foreground">{formatCurrency(totalCost, invoice.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Ganancia</span>
                        <span className={cn(totalProfit >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(totalProfit, invoice.currency)}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance Pendiente</span>
                    <span className='text-destructive'>{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className='md:col-span-1'>
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Pagos registrados para esta factura.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recibo #</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments && invoice.payments.length > 0 ? (
                    invoice.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                        <TableCell>{payment.paymentDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount, invoice.currency)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {payment.note && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Info className="h-4 w-4" /></Button></TooltipTrigger>
                                <TooltipContent><p className="max-w-xs">{payment.note}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {payment.imageUrl && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                              <Link href={payment.imageUrl} target="_blank" rel="noopener noreferrer"><Clipboard className="h-4 w-4" /></Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadReceipt(payment)}>
                            <Download className='h-4 w-4' />
                            <span className='sr-only'>Descargar Recibo</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className='text-center h-24'>No hay pagos registrados.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
