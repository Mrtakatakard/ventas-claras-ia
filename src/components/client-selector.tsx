
'use client'

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AddClientForm } from "./add-client-form"
import type { Client, ClientType } from "@/lib/types"
import { Badge } from "./ui/badge"

interface ClientSelectorProps {
  clients: Client[];
  clientTypes: ClientType[];
  selectedClientId?: string;
  onSelectClient: (clientId: string) => void;
  disabled?: boolean;
}

export function ClientSelector({ clients, clientTypes, selectedClientId, onSelectClient, disabled }: ClientSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState("")
  const [view, setView] = React.useState<'list' | 'add'>('list')

  const selectedClient = clients.find((client) => client.id === selectedClientId)

  const filteredClients = React.useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(filter.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(filter.toLowerCase()))
    )
  }, [clients, filter])

  const handleSelect = (clientId: string) => {
    onSelectClient(clientId)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setTimeout(() => setView('list'), 300); // Reset view when closed
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-auto py-2"
          disabled={disabled}
        >
          {selectedClient
            ?
            <div>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground">{selectedClient.clientTypeName || 'Sin tipo'}</p>
            </div>
            : "Seleccionar cliente..."}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Seleccionar Cliente</DialogTitle>
            <DialogDescription>Busca y selecciona un cliente de la lista.</DialogDescription>
          </div>
          <div>
            {view === 'list' && (
              <Button size="sm" onClick={() => setView('add')}>
                + Nuevo Cliente
              </Button>
            )}
          </div>
        </DialogHeader>

        {view === 'list' ? (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre o correo..."
                className="w-full pl-8"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <ScrollArea className="h-72 w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Tipo</TableHead>
                    <TableHead><span className="sr-only">Acción</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <TableRow key={client.id} className="cursor-pointer" onClick={() => handleSelect(client.id)}>
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">{client.email || 'Sin correo'}</div>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <Badge variant="outline">{client.clientTypeName || 'Sin tipo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        No se encontraron clientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto px-1">
            <AddClientForm
              client={null}
              clientTypes={clientTypes}
              onSuccess={() => {
                setView('list');
                // Ideally this would also select the new client, but we'd need to find the latest one created.
                // For now, returning to list allows them to search for it immediately.
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="mt-2 text-muted-foreground">
              &larr; Volver a la lista
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
