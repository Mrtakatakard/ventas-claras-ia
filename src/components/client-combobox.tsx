
'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Client } from "@/lib/types"

interface ClientComboboxProps {
  clients: Client[];
  selectedClientId?: string;
  onSelectClient: (clientId: string) => void;
  disabled?: boolean;
}

// This component uses a trick to work with `cmdk`.
// The `value` prop of `CommandItem` is used for both filtering and the `onSelect` callback.
// To allow filtering by name but selecting by ID, we create a composite value string.
const createCompositeValue = (id: string, name: string) => `${name}:::${id}`;
const parseCompositeValue = (value: string) => value.split(':::')[1] || '';


export function ClientCombobox({ clients, selectedClientId, onSelectClient, disabled }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedClientName = clients.find((client) => client.id === selectedClientId)?.name

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedClientId
            ? selectedClientName
            : "Seleccionar cliente..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ minWidth: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput placeholder="Buscar cliente por nombre..." />
          <CommandList>
            <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={createCompositeValue(client.id, client.name)}
                  onSelect={(currentValue) => {
                    const clientId = parseCompositeValue(currentValue)
                    onSelectClient(clientId)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClientId === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
