import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save } from "lucide-react";
import { ncfApi } from '@/lib/api/ncfApi';
import type { NCFSequence } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/lib/firebase/hooks';
import { updateUserProfile } from '@/lib/firebase/service';

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
    const { userProfile, refreshUserProfile } = useAuth();
    const [sequences, setSequences] = useState<NCFSequence[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Profile Stats
    const [rnc, setRnc] = useState('');
    const [companyName, setCompanyName] = useState('');

    // Form Stats
    const [typeCode, setTypeCode] = useState('');
    const [prefix, setPrefix] = useState('');
    const [startNumber, setStartNumber] = useState('');
    const [endNumber, setEndNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    useEffect(() => {
        if (userProfile) {
            setRnc(userProfile.rnc || '');
            setCompanyName(userProfile.companyName || '');
        }
    }, [userProfile]);

    const fetchSequences = async () => {
        try {
            setLoading(true);
            const data = await ncfApi.getSequences();
            setSequences(data);
        } catch (error) {
            console.warn("Could not fetch NCF sequences (treating as empty):", error);
            setSequences([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSequences();
    }, []);

    const handleSaveProfile = async () => {
        if (!userProfile) return;
        try {
            setIsSavingProfile(true);
            await updateUserProfile(userProfile.id, { rnc, companyName });
            if (refreshUserProfile) await refreshUserProfile(userProfile.id);
            toast({ title: "Éxito", description: "Información fiscal actualizada." });
        } catch (error: any) {
            toast({ title: "Error", description: "No se pudo actualizar la información.", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleTypeChange = (code: string) => {
        setTypeCode(code);
        // Auto-suggest prefix
        const type = NCF_TYPES.find(t => t.code === code);
        if (type) {
            setPrefix(code);
        }
    };

    const handleSaveSequence = async () => {
        if (!typeCode || !prefix || !startNumber || !endNumber) {
            toast({ title: "Error", description: "Por favor completa todos los campos requeridos.", variant: "destructive" });
            return;
        }

        // Check if there is already an active sequence for this type
        const existingActive = sequences.find(s => s.typeCode === typeCode && s.isActive);
        if (existingActive) {
            toast({
                title: "Secuencia ya activa",
                description: `Ya tienes una secuencia activa para ${NCF_TYPES.find(t => t.code === typeCode)?.name}. Debes desactivarla o eliminarla antes de crear una nueva.`,
                variant: "destructive"
            });
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
                    <CardTitle>Configuración Fiscal</CardTitle>
                    <CardDescription>Gestiona tu RNC, datos de empresa y secuencias de comprobantes fiscales.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Company Info Section */}
                <div className="grid gap-4 md:grid-cols-3 items-end border-b pb-6">
                    <div className="space-y-2">
                        <Label>Nombre de la Empresa</Label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Ej. Mi Empresa S.R.L."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>RNC / Cédula</Label>
                        <Input
                            value={rnc}
                            onChange={(e) => setRnc(e.target.value)}
                            placeholder="Ej. 101000000"
                        />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                        {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Datos
                    </Button>
                </div>

                {/* Sequences Section */}
                <div className="space-y-4">
                    <div className="flex flex-row items-center justify-between">
                        <h3 className="text-lg font-medium">Secuencias de NCF</h3>
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
                                    <Button onClick={handleSaveSequence} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

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
                </div>
            </CardContent>
        </Card>
    );
}
