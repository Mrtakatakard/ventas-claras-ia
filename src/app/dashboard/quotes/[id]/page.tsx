
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, Loader2, FileText } from "lucide-react";
import { getQuote, convertQuoteToInvoice } from '@/lib/firebase/service';
import type { Quote, InvoiceItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/firebase/hooks';
import Link from 'next/link';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { logAnalyticsEvent } from '@/lib/firebase/analytics';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userId } = useAuth();
  const id = params.id as string;
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchQuote = async () => {
      setLoading(true);
      const inv = await getQuote(id);
      if (!inv) {
        notFound();
      }
      setQuote(inv);
      setLoading(false);
    };
    fetchQuote();
  }, [id]);
  
  const formatCurrency = (num: number, currency?: 'DOP' | 'USD') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const handleConvertToInvoice = async () => {
    if (!quote || !userId) return;
    setIsConverting(true);
    try {
      const newInvoiceId = await convertQuoteToInvoice(quote.id, userId);
      logAnalyticsEvent('invoice_created', { from_quote: true });
      toast({
        title: "Cotización Convertida",
        description: "La cotización se ha convertido a factura y el stock ha sido actualizado.",
        action: <ToastAction asChild altText="Ver Factura"><Link href={`/dashboard/invoices/${newInvoiceId}`}>Ver Factura</Link></ToastAction>,
      });
      router.push(`/dashboard/invoices/${newInvoiceId}`);
    } catch (error: any) {
      toast({ title: "Error al convertir", description: error.message, variant: "destructive" });
    } finally {
        setIsConverting(false);
    }
  }

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setIsDownloading(true);

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Ventas Claras", 14, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Tu Negocio, Tus Reglas.", 14, 28);

    doc.setFontSize(18);
    doc.text(`Cotización: ${quote.quoteNumber}`, 200, 22, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`Estado: ${quote.status}`, 200, 28, { align: 'right' });
    
    doc.setLineWidth(0.5);
    doc.line(14, 38, 200, 38);

    let currentY = 54;
    doc.setFontSize(10);
    doc.text("Cliente:", 14, 48);
    doc.setFont("helvetica", "bold");
    doc.text(quote.clientName, 14, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(quote.clientEmail, 14, currentY);
    if(quote.clientAddress) {
        currentY += 5;
        doc.text(quote.clientAddress, 14, currentY);
    }

    const rightColX = 200;
    doc.setFont("helvetica", "bold");
    doc.text("Fecha de Emisión:", rightColX, 48, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(quote.issueDate, rightColX, 54, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text("Válida hasta:", rightColX, 62, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(quote.dueDate, rightColX, 68, { align: 'right' });

    autoTable(doc, {
      startY: 80,
      head: [['Cant.', 'Producto', 'Precio Unit.', 'Desc. (%)', 'Total']],
      body: quote.items.map(item => [
        item.quantity,
        item.productName,
        formatCurrency(item.unitPrice, quote.currency),
        `${item.discount || 0}%`,
        formatCurrency((item.finalPrice ?? item.unitPrice) * item.quantity, quote.currency)
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

    const netSubtotal = quote.subtotal - (quote.discountTotal || 0);
    const taxableSubtotal = calculateTaxableSubtotal(quote.items);
    const showTaxableSubtotal = quote.includeITBIS !== false && taxableSubtotal < netSubtotal;


    doc.setFontSize(10);
    
    if (quote.discountTotal && quote.discountTotal > 0) {
      doc.text("Subtotal Bruto:", totalsX, finalY, { align: 'right' });
      doc.text(formatCurrency(quote.subtotal, quote.currency), valueX, finalY, { align: 'right' });
      finalY += 7;
      doc.text("Descuento:", totalsX, finalY, { align: 'right' });
      doc.text(`- ${formatCurrency(quote.discountTotal, quote.currency)}`, valueX, finalY, { align: 'right' });
      finalY += 7;
    }
    
    doc.text("Subtotal Neto:", totalsX, finalY, { align: 'right' });
    doc.text(formatCurrency(netSubtotal, quote.currency), valueX, finalY, { align: 'right' });
    finalY += 7;

    if (showTaxableSubtotal) {
        doc.setFontSize(8);
        doc.text("Subtotal Gravable (para ITBIS):", totalsX, finalY, { align: 'right' });
        doc.text(formatCurrency(taxableSubtotal, quote.currency), valueX, finalY, { align: 'right' });
        finalY += 7;
        doc.setFontSize(10);
    }
    
    if (quote.includeITBIS !== false) {
      doc.text("ITBIS (18%):", totalsX, finalY, { align: 'right' });
      doc.text(formatCurrency(quote.itbis || 0, quote.currency), valueX, finalY, { align: 'right' });
      finalY += 7;
    }
    
    doc.setLineWidth(0.2);
    doc.line(totalsX - 10, finalY + 5, valueX, finalY + 5);
    
    finalY += 11;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", totalsX, finalY, { align: 'right' });
    doc.text(formatCurrency(quote.total, quote.currency), valueX, finalY, { align: 'right' });
    
    doc.save(`cotizacion-${quote.quoteNumber}.pdf`);
    setIsDownloading(false);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "enviada": return "default";
      case "aceptada": return "default";
      case "facturada": return "default";
      case "borrador": return "secondary";
      case "rechazada": return "destructive";
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
            <PageHeader title={<Skeleton className='h-8 w-40'/>} description={<Skeleton className='h-5 w-32'/>} />
            <Card className="p-8">
                <Skeleton className='h-[600px] w-full'/>
            </Card>
        </div>
    )
  }

  if (!quote) {
    return notFound();
  }
  
  const netSubtotal = quote.subtotal - (quote.discountTotal || 0);
  const taxableSubtotal = quote.items.reduce((acc, item) => {
    if (!item.isTaxExempt) {
      const itemTotal = (item.finalPrice ?? item.unitPrice) * item.quantity;
      return acc + itemTotal;
    }
    return acc;
  }, 0);
  const showTaxableSubtotal = quote.includeITBIS !== false && taxableSubtotal < netSubtotal;

  return (
    <>
      <PageHeader title={`Cotización ${quote.quoteNumber}`} description={`Emitida el ${quote.issueDate}`}>
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
          <Button onClick={handleConvertToInvoice} disabled={isConverting || quote.status === 'facturada'}>
             {isConverting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Convertir a Factura
          </Button>
        </div>
      </PageHeader>

      <Card className="p-8" id="invoice-printable-area">
        <div className="grid gap-10">
          <div className="flex justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ventas Claras</h2>
              <p className="text-muted-foreground">Tu Negocio, Tus Reglas.</p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-extrabold text-primary">{quote.quoteNumber}</h1>
              <Badge variant={getStatusVariant(quote.status)} className="text-sm mt-1">{capitalizeFirstLetter(quote.status)}</Badge>
            </div>
          </div>
          
          <Separator />

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Cliente:</h3>
              <p className="font-bold">{quote.clientName}</p>
              <p className="text-muted-foreground">{quote.clientEmail}</p>
              {quote.clientAddress && <p className="text-muted-foreground">{quote.clientAddress}</p>}
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-1">Fecha de Emisión:</h3>
              <p className="text-muted-foreground">{quote.issueDate}</p>
              <h3 className="font-semibold mb-1 mt-2">Válida hasta:</h3>
              <p className="text-muted-foreground">{quote.dueDate}</p>
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Cant.</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Desc. (%)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice, quote.currency)}</TableCell>
                    <TableCell className="text-right">{item.discount || 0}%</TableCell>
                    <TableCell className="text-right">{formatCurrency((item.finalPrice ?? item.unitPrice) * item.quantity, quote.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
                {quote.discountTotal && quote.discountTotal > 0 ? (
                    <>
                        <div className="flex justify-between">
                            <span>Subtotal Bruto</span>
                            <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Descuento</span>
                            <span>- ${formatCurrency(quote.discountTotal, quote.currency)}</span>
                        </div>
                        <Separator />
                    </>
                ) : null}
                <div className="flex justify-between">
                    <span>Subtotal Neto</span>
                    <span>{formatCurrency(netSubtotal, quote.currency)}</span>
                </div>
                {showTaxableSubtotal && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal Gravable (para ITBIS)</span>
                      <span>{formatCurrency(taxableSubtotal, quote.currency)}</span>
                  </div>
                )}
                {quote.includeITBIS !== false && (
                   <div className="flex justify-between">
                       <span>ITBIS (18%)</span>
                       <span>{formatCurrency(quote.itbis || 0, quote.currency)}</span>
                   </div>
                )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
    