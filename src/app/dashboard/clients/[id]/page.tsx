

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getClient, getInvoices, getProducts, getClientTypes } from '@/lib/firebase/service';
import { invoiceApi } from '@/lib/api/invoiceApi';
import { clientApi } from '@/lib/api/clientApi';
import { getSmartRefill } from '@/ai/flows/smart-refill-flow';
import { getWhatsAppMessage } from '@/ai/flows/whatsapp-generator-flow';

import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Cake, PlusCircle, Tag, MoreHorizontal, MapPin, Download, Edit, Trash2, MoreVertical, ChevronsLeft, ArrowLeft, ArrowRight, ChevronsRight, DollarSign, Sparkles, Eye, Info, Clipboard, MessageSquare, CheckCircle2, Copy, Send } from 'lucide-react';
import { DialogFooter } from "@/components/ui/dialog"

import type { Client, Invoice, Reminder, Product, InvoiceItem, ClientType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/firebase/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AddPaymentForm } from '@/components/add-payment-form';
import { AddClientForm } from '@/components/add-client-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logAnalyticsEvent } from '@/lib/firebase/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type SaleHistoryItem = InvoiceItem & {
  invoiceId: string;
  saleDate: string;
  restockDate?: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { userId, planId } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [allUserInvoices, setAllUserInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // AI Insights State
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [refillOpportunities, setRefillOpportunities] = useState<any[] | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);


  // Pagination States
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const [salesRowsPerPage, setSalesRowsPerPage] = useState(5);
  const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(5);

  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year' | 'all'>('all');

  // State for Reminders
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // State for Follow-up Checklist
  const [followUpChecks, setFollowUpChecks] = useState({
    gaveSample: false,
    askedForReferrals: false,
    addedValue: false,
    invitedToChallenge: false,
    addedToBroadcast: false,
    gavePlan: false,
  });


  const fetchClientData = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    try {
      const [clientData, allInvoices, allUserProducts, allClientTypes] = await Promise.all([
        getClient(id),
        getInvoices(userId),
        getProducts(userId),
        getClientTypes(userId),
      ]);

      if (clientData) {
        if (!clientData.clientTypeName && clientData.clientTypeId) {
          const clientType = allClientTypes.find(ct => ct.id === clientData.clientTypeId);
          if (clientType) {
            clientData.clientTypeName = clientType.name;
          }
        }

        setClient(clientData);
        setAllUserInvoices(allInvoices);
        setProducts(allUserProducts);
        setClientTypes(allClientTypes);

        if (clientData.followUpChecks) {
          setFollowUpChecks(clientData.followUpChecks);
        }

      } else {
        notFound();
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({ title: "Error", description: "No se pudo cargar la información del cliente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, userId, toast]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const invoices = useMemo(() => {
    return allUserInvoices.filter(inv => inv.clientId === id);
  }, [allUserInvoices, id]);

  const similarClientInvoices = useMemo(() => {
    return allUserInvoices.filter(inv => inv.clientId !== id);
  }, [allUserInvoices, id]);

  const canSeeAiInsights = planId === 'pro' || planId === 'legacy' || !planId;

  useEffect(() => {
    if (!loading && client && refillOpportunities === null && canSeeAiInsights) {
      const fetchRefills = async () => {
        setInsightsLoading(true);
        try {
          // Prepare purchase history for the AI
          const purchaseHistory = invoices.flatMap(inv =>
            inv.items.map(item => `${item.productName} (Qty: ${item.quantity}, Date: ${inv.issueDate})`)
          ).join('\n');

          const result = await getSmartRefill({
            clientName: client.name,
            purchaseHistory: purchaseHistory,
            currentDate: new Date().toISOString().split('T')[0],
          });

          setRefillOpportunities(result.refillCandidates);
          logAnalyticsEvent('ai_refills_viewed', { client_id: id });
        } catch (error) {
          console.error("Error fetching smart refills:", error);
          setRefillOpportunities([]);
        } finally {
          setInsightsLoading(false);
        }
      };
      fetchRefills();
    }
  }, [loading, client, invoices, refillOpportunities, id, canSeeAiInsights]);

  const handleGenerateMessage = async (productName: string) => {
    if (!client) return;
    setIsMessageDialogOpen(true);
    setMessageLoading(true);
    setMessageDraft("Generando mensaje mágico... ✨");

    try {
      const result = await getWhatsAppMessage({
        clientName: client.name,
        productsToRefill: [productName],
        tone: 'Casual'
      });
      setMessageDraft(result.message);
    } catch (error) {
      console.error("Error generating message", error);
      setMessageDraft("Error al generar el mensaje. Intenta de nuevo.");
    } finally {
      setMessageLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Mensaje copiado al portapapeles" });
  };



  useEffect(() => {
    if (!isPaymentDialogOpen) {
      setSelectedInvoice(null);
    }
  }, [isPaymentDialogOpen]);

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const salesHistory = useMemo((): SaleHistoryItem[] => {
    const productsMap = new Map(products.map(p => [p.id, p]));
    return invoices
      .flatMap(invoice =>
        invoice.items.map((item, index) => {
          const product = productsMap.get(item.productId);
          let restockDate = '';
          if (product?.restockTimeDays && product.restockTimeDays > 0) {
            const numberOfPeople = item.numberOfPeople || 1;
            const quantity = item.quantity || 1;
            if (numberOfPeople > 0) {
              const durationInDays = Math.floor((product.restockTimeDays * quantity) / numberOfPeople);
              const [year, month, day] = invoice.issueDate.split('-').map(Number);
              const utcSaleDate = new Date(Date.UTC(year, month - 1, day));
              utcSaleDate.setUTCDate(utcSaleDate.getUTCDate() + durationInDays);
              restockDate = utcSaleDate.toISOString().split('T')[0];
            }
          }
          return {
            ...item,
            invoiceId: invoice.id,
            saleDate: invoice.issueDate,
            restockDate: restockDate,
          }
        })
      )
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [invoices, products]);

  const paymentHistory = useMemo(() => {
    return invoices
      .flatMap(inv =>
        (inv.payments || []).map(p => ({
          ...p,
          currency: p.currency || inv.currency,
          status: p.status || 'pagado'
        }))
      )
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [invoices]);

  const financialSummary = useMemo(() => {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const last3Months = new Date(now);
    last3Months.setMonth(now.getMonth() - 3);

    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const filteredInvoices = invoices.filter(invoice => {
      const [year, month, day] = invoice.issueDate.split('-').map(Number);
      const issueDate = new Date(year, month - 1, day);

      if (timeRange === 'all') return true;
      if (timeRange === 'year') return issueDate >= startOfYear;
      if (timeRange === 'month') return issueDate >= startOfMonth;
      if (timeRange === 'quarter') return issueDate >= last3Months;
      return true;
    });

    const summary = {
      totalBilledDOP: 0,
      totalBilledUSD: 0,
      totalDebtDOP: 0,
      totalDebtUSD: 0,
      overdueDebtDOP: 0,
      overdueDebtUSD: 0,
      pendingInvoicesCount: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredInvoices.forEach(invoice => {
      const [dueYear, dueMonth, dueDay] = invoice.dueDate.split('-').map(Number);
      const dueDate = invoice.dueDate ? new Date(dueYear, dueMonth - 1, dueDay) : null;
      const isOverdue = dueDate && dueDate < today && invoice.status !== 'pagada';

      if (invoice.currency === 'USD') {
        summary.totalBilledUSD += invoice.total;
        summary.totalDebtUSD += invoice.balanceDue;
        if (isOverdue) {
          summary.overdueDebtUSD += invoice.balanceDue;
        }
      } else { // Default to DOP
        summary.totalBilledDOP += invoice.total;
        summary.totalDebtDOP += invoice.balanceDue;
        if (isOverdue) {
          summary.overdueDebtDOP += invoice.balanceDue;
        }
      }
      if (invoice.status !== 'pagada') {
        summary.pendingInvoicesCount += 1;
      }
    });

    const totalPaidDOP = summary.totalBilledDOP - summary.totalDebtDOP;
    const totalPaidUSD = summary.totalBilledUSD - summary.totalDebtUSD;

    return { ...summary, totalPaidDOP, totalPaidUSD };
  }, [invoices, timeRange]);

  const filteredSalesHistory = useMemo(() => {
    if (timeRange === 'all') return salesHistory;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last3Months = new Date(now);
    last3Months.setMonth(now.getMonth() - 3);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return salesHistory.filter(sale => {
      const [year, month, day] = sale.saleDate.split('-').map(Number);
      const saleDate = new Date(year, month - 1, day);

      if (timeRange === 'year') return saleDate >= startOfYear;
      if (timeRange === 'month') return saleDate >= startOfMonth;
      if (timeRange === 'quarter') return saleDate >= last3Months;
      return true;
    });
  }, [salesHistory, timeRange]);

  const filteredPaymentHistory = useMemo(() => {
    if (timeRange === 'all') return paymentHistory;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last3Months = new Date(now);
    last3Months.setMonth(now.getMonth() - 3);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return paymentHistory.filter(payment => {
      const [year, month, day] = payment.paymentDate.split('-').map(Number);
      const paymentDate = new Date(year, month - 1, day);

      if (timeRange === 'year') return paymentDate >= startOfYear;
      if (timeRange === 'month') return paymentDate >= startOfMonth;
      if (timeRange === 'quarter') return paymentDate >= last3Months;
      return true;
    });
  }, [paymentHistory, timeRange]);

  const { paginatedSales, totalSalesPages } = useMemo(() => {
    const startIndex = (salesCurrentPage - 1) * salesRowsPerPage;
    const endIndex = startIndex + salesRowsPerPage;
    const paginated = filteredSalesHistory.slice(startIndex, endIndex);
    const total = Math.ceil(filteredSalesHistory.length / salesRowsPerPage);
    return { paginatedSales: paginated, totalSalesPages: total > 0 ? total : 1 };
  }, [filteredSalesHistory, salesCurrentPage, salesRowsPerPage]);

  const { paginatedPayments, totalPaymentsPages } = useMemo(() => {
    const startIndex = (paymentsCurrentPage - 1) * paymentsRowsPerPage;
    const endIndex = startIndex + paymentsRowsPerPage;
    const paginated = filteredPaymentHistory.slice(startIndex, endIndex);
    const total = Math.ceil(filteredPaymentHistory.length / paymentsRowsPerPage);
    return { paginatedPayments: paginated, totalPaymentsPages: total > 0 ? total : 1 };
  }, [filteredPaymentHistory, paymentsCurrentPage, paymentsRowsPerPage]);

  useEffect(() => {
    if (salesCurrentPage > totalSalesPages && totalSalesPages > 0) {
      setSalesCurrentPage(totalSalesPages);
    }
  }, [salesCurrentPage, totalSalesPages]);

  useEffect(() => {
    if (paymentsCurrentPage > totalPaymentsPages && totalPaymentsPages > 0) {
      setPaymentsCurrentPage(totalPaymentsPages);
    }
  }, [paymentsCurrentPage, totalPaymentsPages]);

  const pendingInvoicesForPayment = useMemo(() => {
    return invoices.filter(invoice => ["pendiente", "vencida", "parcialmente pagada"].includes(invoice.status));
  }, [invoices]);

  const handleSaleStatusChange = async (invoiceId: string, productId: string, newStatus: 'realizado' | 'pendiente') => {
    if (!userId) return;

    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) return;

    const newItems = targetInvoice.items.map(item =>
      item.productId === productId ? { ...item, followUpStatus: newStatus } : item
    );

    // Optimistic UI update
    setAllUserInvoices(currentInvoices => currentInvoices.map(inv => inv.id === invoiceId ? { ...inv, items: newItems } : inv));

    try {
      await invoiceApi.update(invoiceId, { items: newItems });

      toast({
        title: "Seguimiento Actualizado",
        description: `El estado del seguimiento ha sido cambiado.`,
      });
    } catch (error) {
      console.error("Error updating sale status:", error);
      toast({ title: "Error", description: "No se pudo actualizar el estado del seguimiento.", variant: "destructive" });
      // Revert UI on error
      setAllUserInvoices(currentInvoices => currentInvoices.map(inv => inv.id === invoiceId ? targetInvoice : inv));
    }
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    fetchClientData();
  };

  const formatCurrency = (num: number, currency?: 'DOP' | 'USD') => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pagada':
      case 'pagado':
        return 'default';
      case 'pendiente':
      case 'parcialmente pagada':
        return 'secondary';
      case 'vencida':
        return 'destructive';
      default: return 'outline';
    }
  };

  const getSaleStatusVariant = (status?: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'realizado': return 'default';
      case 'pendiente': return 'destructive';
      default: return 'destructive'; // Default to pending if undefined
    }
  };

  // --- Reminder Handlers ---

  const handleEditReminderClick = (reminder: Reminder) => {
    setEditingReminder(reminder);
    const date = new Date(reminder.dateTime);
    setReminderNote(reminder.note);
    setReminderDate(date.toISOString().split('T')[0]);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    setReminderTime(`${hours}:${minutes}`);
    setShowReminderForm(true);
  };

  const handleAddNewReminderClick = () => {
    setEditingReminder(null);
    setReminderNote('');
    setReminderDate(new Date().toISOString().split('T')[0]);
    setReminderTime('09:00');
    setShowReminderForm(true);
  };

  const handleCancelReminderForm = () => {
    setShowReminderForm(false);
    setEditingReminder(null);
    setReminderNote('');
    setReminderDate('');
    setReminderTime('09:00');
  }

  const handleSaveReminder = async () => {
    if (!client || !reminderNote || !reminderDate) {
      toast({ title: "Error", description: "La nota y la fecha son requeridas.", variant: "destructive" });
      return;
    }

    const [hours, minutes] = reminderTime.split(':').map(Number);
    const datePart = new Date(reminderDate);
    datePart.setHours(datePart.getHours() + 4); // Adjust for timezone if needed
    const combinedDateTime = new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hours, minutes);

    let updatedReminders: Reminder[];
    if (editingReminder) {
      updatedReminders = (client.reminders || []).map(r =>
        r.id === editingReminder.id ? { ...r, note: reminderNote, dateTime: combinedDateTime.toISOString() } : r
      );
    } else {
      const newReminder: Reminder = {
        id: `rem-${Date.now()}`,
        note: reminderNote,
        dateTime: combinedDateTime.toISOString(),
        status: 'pending'
      };
      updatedReminders = [...(client.reminders || []), newReminder];
    }

    const previousClient = { ...client };
    // Optimistic UI Update
    setClient(prevClient => prevClient ? { ...prevClient, reminders: updatedReminders } : null);
    handleCancelReminderForm();

    try {
      await clientApi.update(client.id, { reminders: updatedReminders });
      toast({ title: "Recordatorio Guardado", description: "Tu recordatorio ha sido guardado exitosamente." });
    } catch (error) {
      // Revert on error
      setClient(previousClient);
      toast({ title: "Error", description: "No se pudo guardar el recordatorio.", variant: "destructive" });
    }
  };

  const handleReminderStatusChange = async (reminderId: string, status: 'pending' | 'completed') => {
    if (!client) return;
    const updatedReminders = (client.reminders || []).map(r => r.id === reminderId ? { ...r, status } : r);
    const previousClient = { ...client };
    setClient({ ...client, reminders: updatedReminders });

    try {
      await clientApi.update(client.id, { reminders: updatedReminders });
      toast({ title: "Estado Actualizado" });
    } catch (error) {
      setClient(previousClient);
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!client) return;
    const updatedReminders = (client.reminders || []).filter(r => r.id !== reminderId);
    const previousClient = { ...client };
    setClient({ ...client, reminders: updatedReminders });
    try {
      await clientApi.update(client.id, { reminders: updatedReminders });
      toast({ title: "Recordatorio Eliminado" });
    } catch (error) {
      setClient(previousClient);
      toast({ title: "Error", description: "No se pudo eliminar el recordatorio.", variant: "destructive" });
    }
  };

  const handleGenerateIcs = (reminder: Reminder) => {
    if (!client) return;

    const toIcsDate = (date: Date) => date.toISOString().replace(new RegExp("[-" + ":.]", "g"), '').slice(0, 15) + 'Z';
    const startDate = new Date(reminder.dateTime);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VentasClaras//Recordatorio//ES',
      'BEGIN:VEVENT', `UID:${reminder.id}@ventasclaras.com`, `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(startDate)}`, `DTEND:${toIcsDate(endDate)}`,
      `SUMMARY:Seguimiento con ${client.name}`, `DESCRIPTION:${reminder.note.replace(/\n/g, '\\n')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `recordatorio-${client.name.replace(/\s/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Archivo Generado", description: "El recordatorio .ics ha sido descargado." });
  };

  // --- Follow-up Checklist Handlers ---
  const handleFollowUpChange = async (field: keyof typeof followUpChecks) => {
    if (!client) return;

    const newFollowUpState = {
      ...followUpChecks,
      [field]: !followUpChecks[field]
    };

    setFollowUpChecks(newFollowUpState); // Optimistic update

    try {
      await clientApi.update(client.id, { followUpChecks: newFollowUpState });
      toast({ title: "Seguimiento Actualizado" });
    } catch (error) {
      // Revert on error
      setFollowUpChecks(client.followUpChecks || followUpChecks);
      toast({ title: "Error", description: "No se pudo actualizar el checklist de seguimiento.", variant: "destructive" });
    }
  };

  const followUpItems: { key: keyof typeof followUpChecks, label: string }[] = [
    { key: 'gaveSample', label: '¿Le diste muestra de algún otro producto?' },
    { key: 'askedForReferrals', label: '¿Le has pedido referidos?' },
    { key: 'addedValue', label: '¿Le has agregado valor?' },
    { key: 'invitedToChallenge', label: '¿Le has invitado a algún reto de volumen?' },
    { key: 'addedToBroadcast', label: '¿Le agregaste a una difusión?' },
    { key: 'gavePlan', label: '¿Le has dado el plan?' },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-48" />} description={<Skeleton className="h-5 w-64" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Card><CardHeader><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            <Card><CardHeader><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
          <div className="space-y-8">
            <Card><CardHeader><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
            <Card><CardHeader><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
            <Card><CardHeader><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
        </div>
      </>
    )
  }

  if (!client) {
    return notFound();
  }

  const pendingReminders = client.reminders?.filter(r => r.status === 'pending') || [];
  const completedReminders = client.reminders?.filter(r => r.status === 'completed') || [];

  return (
    <>
      <PageHeader title={client.name} description={`Detalles y historial del cliente.`}>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar período..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
            <SelectItem value="all">Histórico</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="grid auto-rows-max gap-8 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recordatorios</CardTitle>
              <Button size="sm" variant="outline" onClick={handleAddNewReminderClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              {showReminderForm && (
                <div className="p-4 border rounded-lg mb-6 space-y-4 bg-muted/50">
                  <h4 className="font-medium text-lg">{editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h4>
                  <div className="space-y-2">
                    <Label htmlFor="reminder-note">Nota</Label>
                    <Textarea id="reminder-note" placeholder="Ej: Llamar para seguimiento de cotización..." value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reminder-date">Fecha</Label>
                      <Input id="reminder-date" type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-time">Hora</Label>
                      <Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={handleCancelReminderForm}>Cancelar</Button>
                    <Button onClick={handleSaveReminder}>Guardar Recordatorio</Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {pendingReminders.length > 0 ? pendingReminders.map(reminder => (
                  <div key={reminder.id} className="flex items-start gap-4">
                    <Checkbox className="mt-1" onCheckedChange={() => handleReminderStatusChange(reminder.id, 'completed')} />
                    <div className="flex-1 grid gap-1">
                      <p className="font-medium leading-none break-words">{reminder.note}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reminder.dateTime).toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Acciones del recordatorio</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditReminderClick(reminder)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateIcs(reminder)}><Download className="mr-2 h-4 w-4" />Descargar .ics</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteReminder(reminder.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )) : (
                  !showReminderForm && <p className="text-sm text-muted-foreground text-center py-4">No hay recordatorios pendientes.</p>
                )}
              </div>

              {completedReminders.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-6">
                  <AccordionItem value="completed">
                    <AccordionTrigger>Ver {completedReminders.length} Recordatorios Completados</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      {completedReminders.map(reminder => (
                        <div key={reminder.id} className="flex items-start gap-4">
                          <Checkbox className="mt-1" checked onCheckedChange={() => handleReminderStatusChange(reminder.id, 'pending')} />
                          <div className="flex-1 grid gap-1">
                            <p className="font-medium leading-none text-muted-foreground line-through break-words">{reminder.note}</p>
                            <p className="text-sm text-muted-foreground line-through">
                              {new Date(reminder.dateTime).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive" onClick={() => handleDeleteReminder(reminder.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar recordatorio completado</span>
                          </Button>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Productos Vendidos y Seguimiento</CardTitle>
              <CardDescription>
                Un historial de los productos comprados por el cliente y las fechas de seguimiento para reposición.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Fecha Venta</TableHead>
                      <TableHead>Fecha Seguimiento</TableHead>
                      <TableHead>Personas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.length > 0 ? paginatedSales.map((sale, index) => (
                      <TableRow key={`${sale.invoiceId}-${sale.productId}-${index}`}>
                        <TableCell className='max-w-[200px] truncate'>{sale.productName} (x{sale.quantity})</TableCell>
                        <TableCell>{sale.saleDate}</TableCell>
                        <TableCell>{sale.restockDate || 'N/A'}</TableCell>
                        <TableCell>{sale.numberOfPeople || 'N/A'}</TableCell>
                        <TableCell><Badge variant={getSaleStatusVariant(sale.followUpStatus)}>{capitalizeFirstLetter(sale.followUpStatus || 'pendiente')}</Badge></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Acciones de seguimiento</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleSaleStatusChange(sale.invoiceId, sale.productId, (sale.followUpStatus === 'pendiente' || !sale.followUpStatus) ? 'realizado' : 'pendiente')}
                              >
                                {(sale.followUpStatus === 'pendiente' || !sale.followUpStatus) ? 'Marcar como Realizado' : 'Marcar como Pendiente'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={6} className="text-center h-24">No hay ventas registradas para este período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 md:flex-row md:gap-y-0">
                <div className="flex-1 text-sm text-muted-foreground">
                  {filteredSalesHistory.length} venta(s) en total.
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-end lg:gap-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Filas</p>
                    <Select
                      value={`${salesRowsPerPage}`}
                      onValueChange={(value) => {
                        setSalesRowsPerPage(Number(value))
                        setSalesCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={`${salesRowsPerPage}`} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[5, 10, 20].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {salesCurrentPage} de {totalSalesPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setSalesCurrentPage(1)} disabled={salesCurrentPage === 1}><span className="sr-only">Primera</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setSalesCurrentPage(salesCurrentPage - 1)} disabled={salesCurrentPage === 1}><ArrowLeft className="mr-2 h-4 w-4" />Ant.</Button>
                    <Button variant="outline" size="sm" onClick={() => setSalesCurrentPage(salesCurrentPage + 1)} disabled={salesCurrentPage >= totalSalesPages}>Sig.<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setSalesCurrentPage(totalSalesPages)} disabled={salesCurrentPage >= totalSalesPages}><span className="sr-only">Última</span><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registro de Pagos</CardTitle>
              <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)} disabled={pendingInvoicesForPayment.length === 0}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Pago
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monto</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Extras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.length > 0 ? paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{payment.currency}</TableCell>
                        <TableCell>{capitalizeFirstLetter(payment.method)}</TableCell>
                        <TableCell>{payment.paymentDate}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(payment.status)}>{capitalizeFirstLetter(payment.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={6} className="text-center h-24">No hay pagos registrados para este período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 md:flex-row md:gap-y-0">
                <div className="flex-1 text-sm text-muted-foreground">
                  {filteredPaymentHistory.length} pago(s) en total.
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-end lg:gap-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Filas</p>
                    <Select
                      value={`${paymentsRowsPerPage}`}
                      onValueChange={(value) => {
                        setPaymentsRowsPerPage(Number(value))
                        setPaymentsCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={`${paymentsRowsPerPage}`} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[5, 10, 20].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {paymentsCurrentPage} de {totalPaymentsPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPaymentsCurrentPage(1)} disabled={paymentsCurrentPage === 1}><span className="sr-only">Primera</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(paymentsCurrentPage - 1)} disabled={paymentsCurrentPage === 1}><ArrowLeft className="mr-2 h-4 w-4" />Ant.</Button>
                    <Button variant="outline" size="sm" onClick={() => setPaymentsCurrentPage(paymentsCurrentPage + 1)} disabled={paymentsCurrentPage >= totalPaymentsPages}>Sig.<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPaymentsCurrentPage(totalPaymentsPages)} disabled={paymentsCurrentPage >= totalPaymentsPages}><span className="sr-only">Última</span><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={['contact-info']}>
            <Card>
              <AccordionItem value="contact-info" className="border-b-0">
                <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                  <CardTitle>Información de Contacto</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="grid gap-4 pt-0">
                    <div className="flex justify-end border-t -mx-6 px-6 pt-4">
                      <Button variant="secondary" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">{client.clientTypeName || 'Sin Asignar'}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="break-all">{client.email || 'Sin correo'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Cake className="h-5 w-5 text-muted-foreground" />
                      <span>{client.birthday || 'Sin fecha'}</span>
                    </div>
                    <Separator />
                    <div className="grid gap-4">
                      <h4 className="font-semibold">Direcciones</h4>
                      {client.addresses && client.addresses.length > 0 ? (
                        client.addresses.map(address => (
                          <div key={address.id} className="flex items-start gap-3 text-sm">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-grow">
                              <div className="font-medium">
                                {address.alias}
                                {address.isDefault && <Badge variant="secondary" className="ml-2">Predeterminada</Badge>}
                              </div>
                              <p className="text-muted-foreground break-words">{address.fullAddress}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay direcciones guardadas.</p>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Card>
            <Card>
              <AccordionItem value="financial-summary" className="border-b-0">
                <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                  <div className="text-left">
                    <CardTitle>Resumen Financiero</CardTitle>
                    <CardDescription className="mt-1.5">Desglose del estado de cuenta.</CardDescription>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="grid gap-4 pt-0">
                    <Tabs defaultValue="DOP" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="DOP">Balance (DOP)</TabsTrigger>
                        <TabsTrigger value="USD" disabled={financialSummary.totalBilledUSD <= 0}>
                          Balance (USD)
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="DOP" className="m-0">
                        <div className="space-y-2 rounded-md border p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Deuda Total</span>
                            <span className="font-medium">{formatCurrency(financialSummary.totalDebtDOP, 'DOP')}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Deuda Vencida</span>
                            <span className="font-medium text-destructive">{formatCurrency(financialSummary.overdueDebtDOP, 'DOP')}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Pagado</span>
                            <span className="font-medium text-green-600">{formatCurrency(financialSummary.totalPaidDOP, 'DOP')}</span>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="USD" className="m-0">
                        {financialSummary.totalBilledUSD > 0 ? (
                          <div className="space-y-2 rounded-md border p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Deuda Total</span>
                              <span className="font-medium">{formatCurrency(financialSummary.totalDebtUSD, 'USD')}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Deuda Vencida</span>
                              <span className="font-medium text-destructive">{formatCurrency(financialSummary.overdueDebtUSD, 'USD')}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Total Pagado</span>
                              <span className="font-medium text-green-600">{formatCurrency(financialSummary.totalPaidUSD, 'USD')}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-muted-foreground py-10">
                            No hay transacciones en USD para este cliente en el período seleccionado.
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Facturas Pendientes</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{financialSummary.pendingInvoicesCount}</span>
                        {financialSummary.pendingInvoicesCount > 0 && (
                          <Link href={`/dashboard/accounts-receivable?clientName=${encodeURIComponent(client.name)}`} title="Ver facturas pendientes">
                            <Eye className="h-4 w-4 text-primary transition-transform hover:scale-110" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Card>
            {canSeeAiInsights && (
              <Card className="border-blue-200">
                <AccordionItem value="ai-insights" className="border-b-0">
                  <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                    <div className="text-left">
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        💎 Oportunidades de Recompra (Amway)
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-blue-600">
                        Productos que este cliente necesita reponer pronto.
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-4 pt-0">
                      {insightsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : (
                        refillOpportunities && refillOpportunities.length > 0 ? (
                          <div className="grid gap-3">
                            {refillOpportunities.map((opportunity, index) => (
                              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-white shadow-sm gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">{opportunity.productName}</span>
                                    <Badge variant={opportunity.urgency === 'HIGH' ? 'destructive' : 'secondary'}>
                                      {opportunity.urgency === 'HIGH' ? '🔴 Urgente' : '🟡 Pronto'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {opportunity.reason}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => handleGenerateMessage(opportunity.productName)}
                                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Generar Mensaje
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <p>¡Todo al día! No hay recompras pendientes por ahora.</p>
                          </div>
                        )
                      )}
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            )}
            <Card>
              <AccordionItem value="follow-up" className="border-b-0">
                <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                  <div className="text-left">
                    <CardTitle>Seguimiento y Crecimiento</CardTitle>
                    <CardDescription className="mt-1.5">Checklist de interacciones clave.</CardDescription>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="grid gap-4 pt-0">
                    {followUpItems.map((item) => (
                      <div key={item.key} className="flex items-center space-x-3 p-3 bg-card hover:bg-muted/50 rounded-lg transition-colors">
                        <Checkbox
                          id={item.key}
                          checked={followUpChecks[item.key]}
                          onCheckedChange={() => handleFollowUpChange(item.key)}
                        />
                        <label
                          htmlFor={item.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Card>
          </Accordion>
        </div>
      </div>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mensaje Sugerido 💬</DialogTitle>
            <DialogDescription>
              IA redactó este borrador para ti. Edítalo o envíalo así.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {messageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <Textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="min-h-[150px] text-base"
              />
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Cancelar</Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => copyToClipboard(messageDraft)} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => window.open(`https://wa.me/${client?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageDraft)}`, '_blank')}
              >
                <Send className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            <DialogDescription>
              {selectedInvoice
                ? `Ingresa los detalles del pago para la factura ${selectedInvoice.invoiceNumber}.`
                : pendingInvoicesForPayment.length > 0 ? "Selecciona una factura pendiente para registrar el pago." : "Este cliente no tiene facturas pendientes."
              }
            </DialogDescription>
          </DialogHeader>
          {pendingInvoicesForPayment.length > 0 ? (
            !selectedInvoice ? (
              <div className="pt-4 space-y-2">
                <Label htmlFor="invoice-select">Factura Pendiente</Label>
                <Select
                  onValueChange={(invoiceId) => {
                    const invoice = pendingInvoicesForPayment.find(inv => inv.id === invoiceId);
                    if (invoice) {
                      setSelectedInvoice(invoice);
                    }
                  }}
                >
                  <SelectTrigger id="invoice-select" className="w-full">
                    <SelectValue placeholder="Selecciona una factura..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingInvoicesForPayment.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        <div className="flex w-full items-center justify-between">
                          <span>{invoice.invoiceNumber}</span>
                          <span className="text-muted-foreground text-xs ml-4">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <AddPaymentForm
                invoice={selectedInvoice}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setSelectedInvoice(null)}
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica los datos del cliente.
            </DialogDescription>
          </DialogHeader>
          {client && clientTypes.length > 0 && (
            <AddClientForm
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetchClientData();
              }}
              client={client}
              clientTypes={clientTypes}
              key={client.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


