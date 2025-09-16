

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Client, ClientType } from '@/lib/types'
import { useAuth } from '@/lib/firebase/hooks'
import { batchAddClients } from '@/lib/firebase/service'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { logAnalyticsEvent } from '@/lib/firebase/analytics'

type ImportedClient = {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  clientTypeId: string;
};

type ValidatedClient = {
  data: ImportedClient;
  status: 'ok' | 'error';
  errorMessage?: string;
  rowIndex: number;
}

export function ImportClientsDialog({
  isOpen,
  onClose,
  importedData,
  onSuccess,
  existingClients,
  clientTypes
}: {
  isOpen: boolean
  onClose: () => void
  importedData: any[]
  onSuccess: () => void
  existingClients: Client[]
  clientTypes: ClientType[]
}) {
  const { toast } = useToast()
  const { userId } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [validatedClients, setValidatedClients] = useState<ValidatedClient[]>([]);
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [bulkClientTypeId, setBulkClientTypeId] = useState<string>('');
  
  useEffect(() => {
    const existingEmails = new Set(existingClients.map(c => c.email).filter(Boolean));
    const existingPhones = new Set(existingClients.map(c => c.phone));
    
    const initialClients: ValidatedClient[] = importedData.map((row, index) => {
        const name = row['Nombre']?.toString().trim() || '';
        const email = row['Email']?.toString().trim().toLowerCase() || '';
        const phone = row['Teléfono']?.toString().trim() || '';
        const birthday = row['Cumpleaños']?.toString().trim() || '';
        
        let status: 'ok' | 'error' = 'ok';
        let errorMessage: string | undefined;
        
        if (!name) {
            status = 'error';
            errorMessage = 'El nombre es requerido.';
        } else if (!phone) {
            status = 'error';
            errorMessage = 'El teléfono es requerido.';
        } else if (email && existingEmails.has(email)) {
            status = 'error';
            errorMessage = 'El correo electrónico ya existe en tus clientes.';
        } else if (existingPhones.has(phone)) {
            status = 'error';
            errorMessage = 'El teléfono ya existe en tus clientes.';
        }
        
        return {
            data: { name, email, phone, birthday, clientTypeId: '' },
            status,
            errorMessage,
            rowIndex: index
        };
    });
    setValidatedClients(initialClients);
  }, [importedData, existingClients]);

  const updateClientRow = (rowIndex: number, updatedData: Partial<ImportedClient>) => {
    let tempClients = [...validatedClients];
    const clientIndex = tempClients.findIndex(c => c.rowIndex === rowIndex);
    if(clientIndex > -1) {
        tempClients[clientIndex] = { ...tempClients[clientIndex], data: { ...tempClients[clientIndex].data, ...updatedData } };
    }

    const existingEmails = new Set(existingClients.map(c => c.email).filter(Boolean));
    const existingPhones = new Set(existingClients.map(c => c.phone));
    
    const validatedTempClients = tempClients.map((client) => {
        const fileEmails = new Set(tempClients.filter(c => c.rowIndex !== client.rowIndex).map(c => c.data.email).filter(Boolean));
        const filePhones = new Set(tempClients.filter(c => c.rowIndex !== client.rowIndex).map(c => c.data.phone));

        let status: 'ok' | 'error' = 'ok';
        let errorMessage: string | undefined;

        if (!client.data.name) {
            status = 'error';
            errorMessage = 'El nombre es requerido.';
        } else if (!client.data.phone) {
            status = 'error';
            errorMessage = 'El teléfono es requerido.';
        } else if (client.data.email && (existingEmails.has(client.data.email) || fileEmails.has(client.data.email))) {
            status = 'error';
            errorMessage = 'El correo electrónico ya existe.';
        } else if (existingPhones.has(client.data.phone) || filePhones.has(client.data.phone)) {
            status = 'error';
            errorMessage = 'El teléfono ya existe.';
        }
        
        return { ...client, status, errorMessage };
    });
    setValidatedClients(validatedTempClients);
  };

  const handleClientDataChange = (rowIndex: number, field: keyof Omit<ImportedClient, 'clientTypeId'>, value: string) => {
    updateClientRow(rowIndex, { [field]: value });
  };
  
  const handleClientTypeChange = (rowIndex: number, typeId: string) => {
    updateClientRow(rowIndex, { clientTypeId: typeId });
  }

  const handleSaveClients = async () => {
    if (!userId) {
        toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
        return;
    }

    if (validatedClients.some(c => c.status === 'error')) {
        toast({ title: 'Error de Validación', description: 'Por favor, corrige los errores en la tabla antes de guardar.', variant: 'destructive' });
        return;
    }
     if (validatedClients.some(c => !c.data.clientTypeId)) {
        toast({ title: 'Tipo de Cliente Requerido', description: 'Por favor, asigna un tipo de cliente a todas las filas.', variant: 'destructive' });
        return;
    }

    setIsSaving(true);
    try {
      const clientsToSave: Omit<Client, 'id'>[] = validatedClients.map(({ data }) => {
        const clientType = clientTypes.find(ct => ct.id === data.clientTypeId)!;
        
        return {
          name: data.name,
          email: data.email,
          phone: data.phone,
          birthday: data.birthday,
          clientTypeId: data.clientTypeId,
          clientTypeName: clientType.name,
          addresses: [{
            id: `addr-${Date.now()}-${Math.random()}`,
            alias: 'Principal',
            fullAddress: 'Dirección no especificada',
            isDefault: true,
          }],
          reminders: [],
          followUpChecks: {
            gaveSample: false,
            askedForReferrals: false,
            addedValue: false,
            invitedToChallenge: false,
            addedToBroadcast: false,
            gavePlan: false,
          },
          userId,
          createdAt: new Date(),
          isActive: true,
        }
      });

      await batchAddClients(clientsToSave, userId);
      logAnalyticsEvent('clients_imported', { count: clientsToSave.length });

      toast({
          title: 'Clientes Importados',
          description: `${clientsToSave.length} clientes han sido agregados exitosamente.`,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
        console.error("Error saving clients from Excel:", e);
        toast({ title: 'Error', description: 'No se pudieron guardar los clientes. Revisa los datos e inténtalo de nuevo.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedRows(new Set(validatedClients.map(c => c.rowIndex)));
    } else {
        setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
        newSelection.add(rowIndex);
    } else {
        newSelection.delete(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const handleApplyBulkType = () => {
    if (!bulkClientTypeId) return;

    setValidatedClients(prevClients => 
        prevClients.map(client => {
            if (selectedRows.has(client.rowIndex)) {
                return {
                    ...client,
                    data: {
                        ...client.data,
                        clientTypeId: bulkClientTypeId,
                    }
                };
            }
            return client;
        })
    );
    
    setSelectedRows(new Set());
    setBulkClientTypeId('');
  };

  const hasErrors = validatedClients.some(c => c.status === 'error');
  const hasMissingTypes = validatedClients.some(c => !c.data.clientTypeId);

  const numSelected = selectedRows.size;
  const rowCount = validatedClients.length;
  const headerCheckboxState = numSelected === rowCount && rowCount > 0 ? true : numSelected > 0 ? "indeterminate" : false;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Revisar Clientes a Importar</DialogTitle>
          <DialogDescription>
            Verifica los clientes cargados. Puedes editar los campos y asignar un tipo de cliente a cada uno.
          </DialogDescription>
        </DialogHeader>

        {selectedRows.size > 0 && (
            <div className="flex items-center gap-4 p-2 -mb-2 mt-2 bg-muted rounded-md border">
                <p className="text-sm font-medium flex-shrink-0">{selectedRows.size} fila(s) seleccionada(s)</p>
                <div className='flex items-center gap-2 flex-grow'>
                    <Select value={bulkClientTypeId} onValueChange={setBulkClientTypeId}>
                        <SelectTrigger className="w-full sm:w-[250px] bg-background h-9">
                            <SelectValue placeholder="Asignar tipo de cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clientTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button size="sm" onClick={handleApplyBulkType} disabled={!bulkClientTypeId}>Aplicar</Button>
            </div>
        )}

        <div className="max-h-[60vh] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                    <Checkbox onCheckedChange={handleSelectAll} checked={headerCheckboxState} />
                </TableHead>
                <TableHead className='w-12'>Estado</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo de Cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatedClients.map((client) => (
                <TableRow key={client.rowIndex} className={cn(client.status === 'error' && 'bg-destructive/10')}>
                  <TableCell>
                      <Checkbox checked={selectedRows.has(client.rowIndex)} onCheckedChange={(checked) => handleRowSelect(client.rowIndex, !!checked)} />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                {client.status === 'ok' 
                                    ? <CheckCircle className="h-5 w-5 text-green-600" />
                                    : <AlertCircle className="h-5 w-5 text-destructive" />
                                }
                            </TooltipTrigger>
                            {client.errorMessage && 
                                <TooltipContent>
                                    <p>{client.errorMessage}</p>
                                </TooltipContent>
                            }
                        </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={client.data.name} 
                      onChange={(e) => handleClientDataChange(client.rowIndex, 'name', e.target.value)}
                      className={cn(client.errorMessage?.includes('nombre') && 'border-destructive')}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={client.data.phone} 
                      onChange={(e) => handleClientDataChange(client.rowIndex, 'phone', e.target.value)}
                      className={cn(client.errorMessage?.includes('teléfono') && 'border-destructive')}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={client.data.email} 
                      onChange={(e) => handleClientDataChange(client.rowIndex, 'email', e.target.value)}
                      className={cn(client.errorMessage?.includes('correo') && 'border-destructive')}
                    />
                  </TableCell>
                  <TableCell>
                     <Select value={client.data.clientTypeId} onValueChange={(value) => handleClientTypeChange(client.rowIndex, value)}>
                        <SelectTrigger className={cn(!client.data.clientTypeId && hasMissingTypes && 'border-destructive')}>
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clientTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveClients} disabled={isSaving || hasErrors || hasMissingTypes}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar {validatedClients.filter(c => c.status === 'ok').length} Clientes Válidos
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
