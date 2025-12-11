'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { ncfApi } from '@/lib/api/ncfApi';
import type { NCFSequence } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const NCF_TYPES = [
    { code: 'B01', name: 'Factura de Crédito Fiscal' },
    { code: 'B02', name: 'Factura de Consumo' },
    { code: 'B14', name: 'Factura de Régimen Especial' },
    { code: 'B15', name: 'Factura Gubernamental' },
    { code: 'E31', name: 'e-CF Crédito Fiscal' },
    { code: 'E32', name: 'e-CF Consumo' },
];

export function NCFSettings() {
    const { toast } = useToast();
    const [sequences, setSequences] = useState<NCFSequence[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form Stats
    const [typeCode, setTypeCode] = useState('');
    const [prefix, setPrefix] = useState('');
    const [startNumber, setStartNumber] = useState('');
    const [endNumber, setEndNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    const fetchSequences = async () => {
        try {
            setLoading(true);
            const data = await ncfApi.getSequences();
            setSequences(data);
        } catch (error) {
            console.warn("Could not fetch NCF sequences (treating as empty):", error);
            // toast({ title: "Error", description: "No se pudieron cargar las secuencias de NCF.", variant: "destructive" });
            setSequences([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSequences();
    }, []);

    const handleTypeChange = (code: string) => {
        setTypeCode(code);
        // Auto-suggest prefix
        const type = NCF_TYPES.find(t => t.code === code);
        if (type) {
            // Standard NCF is 11 chars: 1 char (Series) + 2 chars (Type) + 8 chars (Sequence)
            // But DGII gives "Series" (e.g. B) and "Type" (01).
            // Usually prefix includes the static part. 
            // Let's assume user inputs the authorized prefix e.g. B0100000 
            // Actually, simpler: B01 is the type. The sequence usually is 8 digits.
            // The prefix is B01.
            setPrefix(code);
        }
    };

    const handleSave = async () => {
        if (!typeCode || !prefix || !startNumber || !endNumber) {
            toast({ title: "Error", description: "Por favor completa todos los campos requeridos.", variant: "destructive" });
            return;
        }

        try {
            setIsSaving(true);
            const typeName = NCF_TYPES.find(t => t.code === typeCode)?.name || typeCode;

            await ncfApi.createSequence({
                name: typeName,
                typeCode,
                prefix,
                startNumber: parseInt(startNumber),
                endNumber: parseInt(endNumber),
                currentNumber: parseInt(startNumber),
                expirationDate: expirationDate || undefined,
            });

            toast({ title: "Éxito", description: "Secuencia de NCF creada correctamente." });
            setIsOpen(false);
            // Reset form
            setTypeCode('');
            setPrefix('');
            setStartNumber('');
            setEndNumber('');
            setExpirationDate('');

            fetchSequences();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo guardar la secuencia.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Secuencias de NCF</CardTitle>
                    <CardDescription>Gestiona tus números de comprobante fiscal autorizados por la DGII.</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Agregar Secuencia</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Nueva Secuencia</DialogTitle>
                            <DialogDescription>
                                Ingresa los detalles de la autorización de la DGII.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gaps-8 py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Tipo de Comprobante</Label>
                                <Select onValueChange={handleTypeChange} value={typeCode}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NCF_TYPES.map(type => (
                                            <SelectItem key={type.code} value={type.code}>
                                                {type.code} - {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Prefijo (Serie + Tipo)</Label>
                                <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="Ej. B01" />
                                <p className="text-xs text-muted-foreground">La parte estática del NCF antes de la secuencia numérica.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Inicio Secuencia</Label>
                                    <Input type="number" value={startNumber} onChange={e => setStartNumber(e.target.value)} placeholder="1" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fin Secuencia</Label>
                                    <Input type="number" value={endNumber} onChange={e => setEndNumber(e.target.value)} placeholder="100" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Vencimiento</Label>
                                <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
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
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : sequences.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No tienes secuencias configuradas.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Prefijo</TableHead>
                                <TableHead>Estado Actual</TableHead>
                                <TableHead>Disponible</TableHead>
                                <TableHead>Vence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sequences.map((seq) => {
                                const remaining = seq.endNumber - seq.currentNumber;
                                const isLow = remaining < 50;
                                return (
                                    <TableRow key={seq.id}>
                                        <TableCell className="font-medium">{seq.name}</TableCell>
                                        <TableCell>{seq.prefix}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>Actual: {seq.currentNumber}</span>
                                                <span className="text-xs text-muted-foreground">Rango: {seq.startNumber} - {seq.endNumber}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={isLow ? "text-red-500 font-bold" : "text-green-600"}>
                                                {remaining}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {seq.expirationDate ? new Date(seq.expirationDate).toLocaleDateString() : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
