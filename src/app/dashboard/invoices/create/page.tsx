
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, PackageSearch, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/hooks';
import { getClients, getProducts, getClientTypes } from '@/lib/firebase/service';
import { invoiceApi } from '@/lib/api/invoiceApi';
import type { Client, Product, InvoiceItem, Invoice, ClientType, Address } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientSelector } from '@/components/client-selector';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { logAnalyticsEvent } from '@/lib/firebase/analytics';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type InvoiceItemState = {
    id: number;
    productId: string;
    quantity: number;
    discount: number;
    numberOfPeople?: number;
};

const ITBIS_RATE = 0.18;

export default function CreateInvoicePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { userId } = useAuth();

    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
    const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
    const [invoiceCurrency, setInvoiceCurrency] = useState<'DOP' | 'USD'>('DOP');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<InvoiceItemState[]>([{ id: 1, productId: '', quantity: 1, discount: 0, numberOfPeople: 1 }]);
    const [includeITBIS, setIncludeITBIS] = useState(true);
    const [useCostPrice, setUseCostPrice] = useState(false);

    const getProductStock = (product: Product) => {
        return product.batches?.reduce((acc, batch) => acc + batch.stock, 0) || 0;
    };

    const formatCurrency = (num: number, currency?: 'DOP' | 'USD') => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency || 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const [clientsData, productsData, clientTypesData] = await Promise.all([
                    getClients(userId),
                    getProducts(userId),
                    getClientTypes(userId)
                ]);

                const clientTypesMap = new Map(clientTypesData.map(ct => [ct.id, ct.name]));
                const clientsWithTypeName = clientsData.map(client => ({
                    ...client,
                    clientTypeName: clientTypesMap.get(client.clientTypeId) || 'Sin asignar'
                }));

                setClients(clientsWithTypeName);
                setProducts(productsData);
                setClientTypes(clientTypesData);
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        if (userId) {
            fetchData();
        }
    }, [userId, toast]);

    const availableProducts = useMemo(() => {
        return products.filter(p => p.currency === invoiceCurrency);
    }, [products, invoiceCurrency]);

    const handleCurrencyChange = (value: 'DOP' | 'USD') => {
        setInvoiceCurrency(value);
        setItems([{ id: 1, productId: '', quantity: 1, discount: 0, numberOfPeople: 1 }]);
    }

    const selectedClient = useMemo(() => clients.find((c) => c.id === selectedClientId), [selectedClientId, clients]);

    useEffect(() => {
        if (selectedClient?.addresses?.length) {
            const defaultAddress = selectedClient.addresses.find(a => a.isDefault);
            setSelectedAddressId(defaultAddress?.id || selectedClient.addresses[0]?.id);
        } else {
            setSelectedAddressId(undefined);
        }
    }, [selectedClient]);

    const isRestockTrackingEnabled = useMemo(() => {
        if (!selectedClient || !clientTypes.length) return false;
        const clientType = clientTypes.find(ct => ct.id === selectedClient.clientTypeId);
        return !!clientType?.enableRestockTracking;
    }, [selectedClient, clientTypes]);

    const { subtotal, discountTotal, netSubtotal, taxableSubtotal, itbis, total } = useMemo(() => {
        const getPrice = (product: Product) => useCostPrice ? (product.cost ?? 0) : (product.price || 0);

        let grossSubtotal = 0;
        let currentDiscountTotal = 0;
        let currentTaxableSubtotal = 0;

        items.forEach(item => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return;

            const itemPrice = getPrice(product);
            const itemTotal = itemPrice * item.quantity;
            const itemDiscountAmount = itemTotal * (item.discount / 100);
            const itemNetTotal = itemTotal - itemDiscountAmount;

            grossSubtotal += itemTotal;
            currentDiscountTotal += itemDiscountAmount;

            if (!product.isTaxExempt) {
                currentTaxableSubtotal += itemNetTotal;
            }
        });

        const currentNetSubtotal = grossSubtotal - currentDiscountTotal;
        const currentItbis = includeITBIS ? currentTaxableSubtotal * ITBIS_RATE : 0;
        const currentTotal = currentNetSubtotal + currentItbis;

        return {
            subtotal: grossSubtotal,
            discountTotal: currentDiscountTotal,
            netSubtotal: currentNetSubtotal,
            taxableSubtotal: currentTaxableSubtotal,
            itbis: currentItbis,
            total: currentTotal
        };
    }, [items, products, includeITBIS, useCostPrice]);


    const handleAddItem = () => setItems([...items, { id: Date.now(), productId: '', quantity: 1, discount: 0, numberOfPeople: 1 }]);
    const handleRemoveItem = (id: number) => setItems(items.filter((item) => item.id !== id));

    const handleItemChange = (id: number, field: 'productId' | 'quantity' | 'discount' | 'numberOfPeople', value: string) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;

            if (field === 'productId') {
                return { ...item, productId: value, quantity: 1, numberOfPeople: 1 };
            }

            if (field === 'discount') {
                const newDiscount = parseInt(value, 10);
                if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
                    return { ...item, discount: 0 };
                }
                return { ...item, discount: newDiscount };
            }

            if (field === 'quantity') {
                const newQuantity = parseInt(value, 10);

                if (isNaN(newQuantity) || newQuantity < 1) {
                    return { ...item, quantity: 1 };
                }

                const product = products.find(p => p.id === item.productId);
                if (!product) return { ...item, quantity: newQuantity }; // No product selected yet

                const quantityInOtherLines = items
                    .filter(i => i.id !== id && i.productId === item.productId)
                    .reduce((sum, i) => sum + i.quantity, 0);

                const availableStock = getProductStock(product) - quantityInOtherLines;

                if (newQuantity > availableStock) {
                    toast({
                        title: "Stock insuficiente",
                        description: `Solo quedan ${availableStock} unidades disponibles de ${product.name} (considerando otras líneas).`,
                        variant: "destructive",
                    });
                    return { ...item, quantity: Math.max(1, availableStock) };
                }
                return { ...item, quantity: newQuantity };
            }

            if (field === 'numberOfPeople') {
                const numPeople = parseInt(value, 10);
                if (isNaN(numPeople) || numPeople < 1) {
                    return { ...item, numberOfPeople: 1 };
                }
                return { ...item, numberOfPeople: numPeople };
            }

            return item;
        }));
    };

    const handleSaveInvoice = async () => {
        if (!userId || !selectedClient) {
            toast({ title: "Error", description: "Por favor selecciona un cliente.", variant: "destructive" });
            return;
        }
        if (items.some(item => !item.productId || item.quantity <= 0)) {
            toast({ title: "Error", description: "Por favor completa todos los productos y cantidades.", variant: "destructive" });
            return;
        }

        setIsSaving(true);

        const consolidatedItemsMap = new Map<string, InvoiceItemState>();
        for (const item of items) {
            if (!item.productId || item.quantity <= 0) continue;

            const key = (item.discount === 0 || !item.discount)
                ? item.productId
                : `${item.productId}-${item.id}`;

            const existing = consolidatedItemsMap.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                if (isRestockTrackingEnabled && existing.numberOfPeople && item.numberOfPeople) {
                    existing.numberOfPeople += item.numberOfPeople;
                }
            } else {
                consolidatedItemsMap.set(key, { ...item });
            }
        }
        const finalItemsState = Array.from(consolidatedItemsMap.values());

        const productQuantities = new Map<string, number>();
        for (const item of finalItemsState) {
            if (item.productId) {
                productQuantities.set(item.productId, (productQuantities.get(item.productId) || 0) + item.quantity);
            }
        }

        for (const [productId, totalQuantity] of productQuantities.entries()) {
            const product = products.find(p => p.id === productId);
            if (!product) {
                toast({ title: "Error", description: `Un producto seleccionado ya no es válido.`, variant: "destructive" });
                setIsSaving(false);
                return;
            }
            if (totalQuantity > getProductStock(product)) {
                toast({
                    title: "Stock Insuficiente",
                    description: `La cantidad total para "${product.name}" (${totalQuantity}) excede el stock disponible de ${getProductStock(product)} unidades.`,
                    variant: "destructive"
                });
                setIsSaving(false);
                return;
            }
        }

        const invoiceItems: InvoiceItem[] = finalItemsState.map(item => {
            const product = products.find(p => p.id === item.productId)!;
            const unitPrice = useCostPrice ? (product.cost ?? 0) : (product.price || 0);
            const discountAmount = unitPrice * ((item.discount || 0) / 100);

            const newItem: InvoiceItem = {
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: unitPrice,
                discount: item.discount || 0,
                finalPrice: unitPrice - discountAmount,
                isTaxExempt: product.isTaxExempt,
            };

            if (isRestockTrackingEnabled) {
                newItem.numberOfPeople = item.numberOfPeople || 1;
            }

            if (product.cost !== undefined) {
                newItem.unitCost = product.cost;
            }

            return newItem;
        });

        const getPrice = (product: Product) => useCostPrice ? (product.cost ?? 0) : (product.price || 0);

        let grossSubtotal = 0;
        let currentDiscountTotal = 0;
        let currentTaxableSubtotal = 0;

        invoiceItems.forEach(item => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return;

            const itemPrice = getPrice(product);
            const itemTotal = itemPrice * item.quantity;
            const itemDiscountAmount = itemTotal * ((item.discount || 0) / 100);
            const itemNetTotal = itemTotal - itemDiscountAmount;

            grossSubtotal += itemTotal;
            currentDiscountTotal += itemDiscountAmount;

            if (!product.isTaxExempt) {
                currentTaxableSubtotal += itemNetTotal;
            }
        });

        const newNetSubtotal = grossSubtotal - currentDiscountTotal;
        const newItbis = includeITBIS ? currentTaxableSubtotal * ITBIS_RATE : 0;
        const newTotal = newNetSubtotal + newItbis;

        const newInvoice: Omit<Invoice, 'id'> = {
            invoiceNumber: `FAC-${Date.now().toString().slice(-6)}`,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            clientEmail: selectedClient.email,
            clientAddress: selectedClient?.addresses?.find(a => a.id === selectedAddressId)?.fullAddress ?? '',
            issueDate,
            dueDate,
            items: invoiceItems,
            subtotal: grossSubtotal,
            discountTotal: currentDiscountTotal,
            itbis: newItbis,
            total: newTotal,
            status: 'pendiente',
            currency: invoiceCurrency,
            payments: [],
            balanceDue: newTotal,
            includeITBIS: includeITBIS,
            isActive: true,
            userId,
            createdAt: new Date(),
        };

        try {
            await invoiceApi.create(newInvoice);
            logAnalyticsEvent('invoice_created');
            toast({
                title: 'Factura Creada',
                description: 'La factura ha sido guardada y el stock actualizado.',
            });
            router.push('/dashboard/invoices');
        } catch (e: any) {
            toast({ title: "Error al guardar factura", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <PageHeader title="Crear Nueva Factura" description="Completa los detalles para generar una nueva factura." />
                <div className="grid gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
                    </div>
                    <div className="lg:col-span-2 space-y-8">
                        <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
                        <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                    </div>
                </div>
            </>
        )
    }

    const showTaxableSubtotal = includeITBIS && taxableSubtotal < netSubtotal;

    return (
        <>
            <PageHeader title="Crear Nueva Factura" description="Completa los detalles para generar una nueva factura." />

            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-8">
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Productos</CardTitle>
                                <CardDescription>Agrega los productos que deseas facturar.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!loading && availableProducts.length === 0 ? (
                                <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                                    <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">No Tienes Productos en {invoiceCurrency}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Para poder crear una factura, primero necesitas agregar productos a tu inventario en esta moneda.
                                    </p>
                                    <Button asChild className="mt-6">
                                        <Link href="/dashboard/products?action=create">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Agregar Producto
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="w-[120px]">Cantidad</TableHead>
                                                {isRestockTrackingEnabled && <TableHead className="w-[120px]">Personas</TableHead>}
                                                <TableHead className="w-[120px]">Desc. (%)</TableHead>
                                                <TableHead className="w-[150px] text-right">Precio Unit.</TableHead>
                                                <TableHead className="w-[150px] text-right">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map(item => {
                                                const product = availableProducts.find(p => p.id === item.productId);
                                                const unitPrice = product ? (useCostPrice ? (product.cost ?? 0) : (product.price || 0)) : 0;
                                                const itemTotal = unitPrice * item.quantity;
                                                const itemDiscount = itemTotal * (item.discount / 100);
                                                const finalTotal = itemTotal - itemDiscount;

                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Select value={item.productId} onValueChange={(value) => handleItemChange(item.id, 'productId', value)}>
                                                                <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                                                                <SelectContent>
                                                                    {availableProducts
                                                                        .filter(p => getProductStock(p) > 0 || p.id === item.productId)
                                                                        .map((p) => (
                                                                            <SelectItem key={p.id} value={p.id} disabled={getProductStock(p) <= 0 && p.id !== item.productId}>
                                                                                {p.name} ({getProductStock(p)} en stock)
                                                                            </SelectItem>
                                                                        ))
                                                                    }
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} /></TableCell>
                                                        {isRestockTrackingEnabled && (
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.numberOfPeople || 1}
                                                                    onChange={(e) => handleItemChange(item.id, 'numberOfPeople', e.target.value)}
                                                                />
                                                            </TableCell>
                                                        )}
                                                        <TableCell><Input type="number" min="0" max="100" value={item.discount} onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)} /></TableCell>
                                                        <TableCell className="text-right">{product ? formatCurrency(unitPrice, invoiceCurrency) : "-"}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(finalTotal, invoiceCurrency)}</TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={items.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            )}
                        </CardContent>
                        <CardFooter><Button variant="outline" onClick={handleAddItem} disabled={availableProducts.length === 0}><PlusCircle className="mr-2 h-4 w-4" />Agregar Producto</Button></CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <Accordion type="multiple" defaultValue={['options', 'details']} className="w-full space-y-4">
                        <Card>
                            <AccordionItem value="options" className="border-b-0">
                                <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                                    <CardTitle>Opciones de Facturación</CardTitle>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="pt-0 grid gap-4">
                                        <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="use-cost-price">Usar Precio de Costo</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Facturar usando el costo en lugar del precio de venta.
                                                </p>
                                            </div>
                                            <Switch id="use-cost-price" checked={useCostPrice} onCheckedChange={setUseCostPrice} aria-label="Usar Precio de Costo" />
                                        </div>
                                        <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="include-itbis">Incluir ITBIS (18%)</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Añadir el impuesto al total de la factura.
                                                </p>
                                            </div>
                                            <Switch id="include-itbis" checked={includeITBIS} onCheckedChange={setIncludeITBIS} aria-label="Incluir ITBIS" />
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                        <Card>
                            <AccordionItem value="details" className="border-b-0">
                                <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                                    <CardTitle>Detalles</CardTitle>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="pt-0 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="currency">Moneda de la Factura</Label>
                                            <Select onValueChange={(value) => handleCurrencyChange(value as 'DOP' | 'USD')} value={invoiceCurrency}>
                                                <SelectTrigger id="currency"><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="DOP">DOP - Peso Dominicano</SelectItem>
                                                    <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="client">Cliente</Label>
                                            <ClientSelector
                                                clients={clients}
                                                selectedClientId={selectedClientId}
                                                onSelectClient={setSelectedClientId}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Dirección de Envío</Label>
                                            <Select value={selectedAddressId} onValueChange={setSelectedAddressId} disabled={!selectedClient || !selectedClient.addresses?.length}>
                                                <SelectTrigger id="address">
                                                    <SelectValue placeholder={
                                                        !selectedClient
                                                            ? "Selecciona un cliente primero"
                                                            : selectedClient.addresses?.length
                                                                ? "Seleccionar dirección..."
                                                                : "Cliente sin direcciones"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedClient?.addresses?.map(addr => (
                                                        <SelectItem key={addr.id} value={addr.id}>
                                                            {addr.alias}: {addr.fullAddress}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="issue-date">Fecha de Emisión</Label>
                                            <Input id="issue-date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="due-date">Fecha de Vencimiento</Label>
                                            <Input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    </Accordion>

                    <Card>
                        <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {discountTotal > 0 ? (
                                <>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal Bruto</span><span>{formatCurrency(subtotal, invoiceCurrency)}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Descuento</span><span>- {formatCurrency(discountTotal, invoiceCurrency)}</span></div>
                                    <Separator />
                                </>
                            ) : null}
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal Neto</span><span>{formatCurrency(netSubtotal, invoiceCurrency)}</span></div>
                            {includeITBIS && (
                                <>
                                    {showTaxableSubtotal && (
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Subtotal Gravable (para ITBIS)</span>
                                            <span>{formatCurrency(taxableSubtotal, invoiceCurrency)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between"><span className="text-muted-foreground">ITBIS (18%)</span><span>{formatCurrency(itbis, invoiceCurrency)}</span></div>
                                </>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total, invoiceCurrency)}</span></div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => router.push('/dashboard/invoices')} disabled={isSaving}>Cancelar</Button>
                            <Button onClick={handleSaveInvoice} disabled={isSaving || !selectedClientId || availableProducts.length === 0}>
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Factura'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </>
    );
}
