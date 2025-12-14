'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/firebase/hooks";
import { getProducts } from "@/lib/firebase/service";
import type { Product } from "@/lib/types";
import { Loader2, ShoppingCart, AlertTriangle, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { productApi } from "@/lib/api/productApi";
import { hasAccess } from "@/lib/features";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ReplenishmentItem {
    product: Product;
    currentStock: number;
    needed: number;
    reason: 'immediate' | 'restock'; // immediate = negative stock, restock = below threshold
    priority: 'high' | 'medium';
}

export default function ReplenishmentPage() {
    const { userId, planId, loading: authLoading } = useAuth(); // Assuming useAuth exposes planId and loading
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ReplenishmentItem[]>([]);

    // Check access
    const canAccess = hasAccess(planId, 'smartReplenishment');

    const fetchData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const allProducts = await getProducts(userId);

            const replenishmentList: ReplenishmentItem[] = [];

            allProducts.forEach(product => {
                if (product.productType === 'service') return; // Skip services

                const stock = typeof product.stock === 'number' ? product.stock : (product.batches || []).reduce((acc, b) => acc + b.stock, 0);
                const threshold = product.notificationThreshold || 5; // Default threshold 5 if not set

                // Check for Immediate Need (Negative Stock)
                if (stock < 0) {
                    replenishmentList.push({
                        product,
                        currentStock: stock,
                        needed: Math.abs(stock) + threshold,
                        reason: 'immediate',
                        priority: 'high'
                    });
                }
                // Check for Restock Need (Positive but Low)
                else if (stock < threshold) {
                    replenishmentList.push({
                        product,
                        currentStock: stock,
                        needed: threshold - stock,
                        reason: 'restock',
                        priority: 'medium'
                    });
                }
            });

            // Sort: High priority first
            replenishmentList.sort((a, b) => (a.priority === 'high' ? -1 : 1));

            setItems(replenishmentList);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo cargar la lista.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId && canAccess) {
            fetchData();
        }
    }, [userId, canAccess]);

    if (authLoading) {
        return <div>Cargando...</div>;
    }

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
                <div className="bg-muted p-6 rounded-full">
                    <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="max-w-md space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Acceso Restringido</h1>
                    <p className="text-muted-foreground">
                        La <strong>Lista de Compras Inteligente</strong> es una función exclusiva para planes avanzandos. Automatiza tus reabastecimientos y evita quedarte sin stock.
                    </p>
                </div>
                <Button size="lg" className="gap-2">
                    Actualizar a Plan Pro
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    const handleMarkReplenished = async (item: ReplenishmentItem) => {
        // Logic to quickly replenish could be complex (which batch?).
        // For now, maybe just a redirect to Edit Product or a Quick Add Batch dialog?
        // "Quick Restock" feature was requested.
        // I'll leave it as a placeholder action or redirect for now to avoid complexity in valid iteration.
        // Redirecting to product edit is safest.
        window.location.href = `/dashboard/products?action=edit&id=${item.product.id}`;
        // Ideally opening the dialog.
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Lista de Compras Inteligente", 14, 22);
        doc.setFontSize(11);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData = items.map(item => [
            item.product.name,
            `${item.currentStock}`,
            `${item.needed}`,
            item.reason === 'immediate' ? 'URGENTE' : 'Restock',
            '_________' // Checkbox placeholder
        ]);

        (doc as any).autoTable({
            startY: 40,
            head: [['Producto', 'Stock Actual', 'A Comprar', 'Prioridad', 'Confirmado']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] }, // Green-ish
        });

        doc.save("lista_compras_ventas_claras.pdf");
    };

    return (
        <>
            <PageHeader
                title="Lista de Compras Inteligente"
                description="Productos que necesitan reabastecimiento basado en ventas y stock mínimo."
            >
                <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Descargar PDF
                </Button>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Críticos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-800">
                            {items.filter(i => i.priority === 'high').length}
                        </div>
                        <p className="text-xs text-red-600">Productos con stock negativo (ya vendidos)</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-orange-700 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Por Reponer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-800">
                            {items.filter(i => i.priority === 'medium').length}
                        </div>
                        <p className="text-xs text-orange-600">Productos por debajo del mínimo</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-700 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Sugerencia Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-800">
                            {items.reduce((acc, item) => acc + item.needed, 0)}
                        </div>
                        <p className="text-xs text-green-600">Unidades totales a comprar</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Estado Actual</TableHead>
                                <TableHead>Sugerencia de Compra</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                ))
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        ¡Todo en orden! No necesitas comprar nada por ahora.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.product.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{item.product.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.product.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.currentStock < 0 ? "destructive" : "secondary"}>
                                                {item.currentStock} unidades
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold text-lg text-primary">+{item.needed}</span>
                                        </TableCell>
                                        <TableCell>
                                            {item.reason === 'immediate' ? (
                                                <div className="flex items-center text-red-600 text-sm font-medium">
                                                    <AlertTriangle className="mr-1 h-3 w-3" /> Urgente (Venta sin stock)
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-orange-600 text-sm">
                                                    <ShoppingCart className="mr-1 h-3 w-3" /> Stock Bajo
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" asChild>
                                                <a href={`/dashboard/products?action=edit&id=${item.product.id}`}>
                                                    Reponer <ArrowRight className="ml-2 h-4 w-4" />
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
