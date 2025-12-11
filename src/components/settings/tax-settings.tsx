'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { taxApi } from '@/lib/api/taxApi';
import type { TaxSettings } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function TaxSettingsComponent() {
    const { toast } = useToast();
    const [taxes, setTaxes] = useState<TaxSettings[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const fetchTaxes = async () => {
        try {
            setLoading(true);
            const data = await taxApi.getTaxes();
            setTaxes(data.sort((a, b) => b.isDefault ? 1 : -1)); // Default first
        } catch (error) {
            console.warn("Could not fetch taxes (treating as empty):", error);
            // toast({ title: "Error", description: "No se pudieron cargar los impuestos.", variant: "destructive" });
            setTaxes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaxes();
    }, []);

    const handleSave = async () => {
        if (!name || !rate) {
            toast({ title: "Error", description: "Completa el nombre y la tasa.", variant: "destructive" });
            return;
        }

        try {
            setIsSaving(true);
            await taxApi.createTax({
                name,
                rate: parseFloat(rate) / 100, // Convert percentage to decimal
                isDefault
            });

            toast({ title: "Éxito", description: "Impuesto agregado correctamente." });
            setIsOpen(false);
            setName('');
            setRate('');
            setIsDefault(false);
            fetchTaxes();
        } catch (error: any) {
            toast({ title: "Error", description: "No se pudo guardar el impuesto.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este impuesto?")) return;
        try {
            await taxApi.deleteTax(id);
            toast({ title: "Eliminado", description: "Impuesto eliminado." });
            fetchTaxes();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Configuración de Impuestos</CardTitle>
                    <CardDescription>Gestiona las tasas de ITBIS y otros impuestos.</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Agregar Impuesto</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nuevo Impuesto</DialogTitle>
                            <DialogDescription>Define una nueva tasa impositiva.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. ITBIS 18%" />
                            </div>
                            <div className="space-y-2">
                                <Label>Tasa (%)</Label>
                                <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="18" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="default-mode" checked={isDefault} onCheckedChange={setIsDefault} />
                                <Label htmlFor="default-mode">Marcar como predeterminado</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Tasa</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {taxes.map((tax) => (
                                <TableRow key={tax.id}>
                                    <TableCell className="font-medium">{tax.name}</TableCell>
                                    <TableCell>{(tax.rate * 100).toFixed(0)}%</TableCell>
                                    <TableCell>
                                        {tax.isDefault && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Predeterminado</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tax.id)} disabled={tax.isDefault}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
