

'use client'

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, ChevronsUpDown, ArrowUp, ArrowDown, MoreHorizontal, Send, Edit, Trash2, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AddTeamMemberForm } from "@/components/add-team-member-form";
import { useAuth } from "@/lib/firebase/hooks";
import { getTeamMembers, resendInvitationEmail, deleteTeamMember } from "@/lib/firebase/service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortKey = keyof UserProfile;

export default function TeamPage() {
  const { role, loading: authLoading, userId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [deletingMember, setDeletingMember] = useState<UserProfile | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchTeam = async () => {
    if (!userId) return;
    setDataLoading(true);
    try {
      const members = await getTeamMembers(userId);
      setTeam(members);
    } catch(e) {
      toast({ title: "Error", description: "No se pudieron cargar los miembros del equipo.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !userId) return;
    if (role === 'admin' || role === 'superAdmin') {
      fetchTeam();
    } else {
      setDataLoading(false);
    }
  }, [role, authLoading, userId]);

  const onFormSuccess = () => {
    fetchTeam();
    setOpen(false);
    setEditingMember(null);
  }

  const handleAddNewClick = () => {
    setEditingMember(null);
    setOpen(true);
  };
  
  const handleEditClick = (member: UserProfile) => {
    setEditingMember(member);
    setOpen(true);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingMember(null);
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    try {
      await deleteTeamMember(deletingMember.id);
      toast({
        title: "Perfil Eliminado",
        description: `El perfil de ${deletingMember.name} ha sido eliminado. IMPORTANTE: Para completar la eliminación, borra el usuario desde la consola de Firebase Authentication.`,
      });
      fetchTeam();
    } catch (error) {
       toast({ title: "Error", description: "No se pudo eliminar el miembro.", variant: "destructive" });
    } finally {
      setDeletingMember(null);
    }
  }


  const handleResendInvitation = async (email: string) => {
    try {
      await resendInvitationEmail(email);
      toast({
        title: "Invitación Reenviada",
        description: `Se ha enviado un nuevo correo a ${email}. Pídele que revise su bandeja de entrada y spam.`,
      });
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error al Reenviar",
        description: "No se pudo reenviar la invitación. Verifica que el correo sea correcto y vuelve a intentarlo.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedTeam = useMemo(() => {
    let sortableItems = [...team].filter(member =>
      (member.name?.toLowerCase().includes(filter.toLowerCase()) || false) ||
      (member.email?.toLowerCase().includes(filter.toLowerCase()) || false) ||
      (member.role?.toLowerCase().includes(filter.toLowerCase()) || false) ||
      (member.status?.toLowerCase().includes(filter.toLowerCase()) || false)
    );

    sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue || '').localeCompare(String(bValue || ''));
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return sortableItems;
  }, [team, filter, sortConfig]);
  
  const { paginatedTeam, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginated = sortedTeam.slice(startIndex, endIndex);
    const total = Math.ceil(sortedTeam.length / rowsPerPage);
    return { paginatedTeam: paginated, totalPages: total > 0 ? total : 1 };
  }, [sortedTeam, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const pageLoading = authLoading || dataLoading;
  
  const renderSkeletons = () => (
    Array.from({length: 3}).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-32"/></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40"/></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20 rounded-full"/></TableCell>
        <TableCell><Skeleton className="h-6 w-24 rounded-full"/></TableCell>
        <TableCell><Skeleton className="h-8 w-8 rounded-full"/></TableCell>
      </TableRow>
     ))
  );

  if (pageLoading) {
    return (
        <>
          <PageHeader title="Gestionar Equipo" description="Invita y gestiona los miembros de tu equipo." />
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                        <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableHead>
                        <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>{renderSkeletons()}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
    );
  }

  if (role !== 'admin' && role !== 'superAdmin') {
    return null;
  }

  return (
    <>
      <PageHeader title="Gestionar Equipo" description="Invita y gestiona los miembros de tu equipo.">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNewClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Invitar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMember ? 'Editar Miembro' : 'Invitar Nuevo Miembro'}</DialogTitle>
              <DialogDescription>
                {editingMember ? 'Modifica los datos del miembro.' : 'Completa los datos para invitar a un nuevo miembro. Recibirá un correo para configurar su cuenta.'}
              </DialogDescription>
            </DialogHeader>
            <AddTeamMemberForm onSuccess={onFormSuccess} member={editingMember} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este miembro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el perfil del miembro de la aplicación, revocando su rol y acceso a los datos. Sin embargo, su cuenta de inicio de sesión (email y contraseña) seguirá existiendo. Para impedir que vuelva a iniciar sesión, debes eliminar al usuario manually desde la consola de Firebase &gt; Authentication. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Sí, eliminar perfil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
          <CardDescription>
            Listado de todos los miembros del equipo con acceso al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email, rol o estado..."
                  className="w-full pl-8"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('name')} className="-ml-4">
                    Nombre
                    {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button variant="ghost" onClick={() => handleSort('email')} className="-ml-4">
                    Email
                    {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button variant="ghost" onClick={() => handleSort('role')} className="-ml-4">
                    Rol
                    {sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                 <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="-ml-4">
                    Estado
                    {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? renderSkeletons() : paginatedTeam.length > 0 ? (
                paginatedTeam.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.email}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="secondary">{member.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'outline'}>
                        {member.status === 'active' ? 'Activo' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                     <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-8 w-8 p-0" disabled={member.id === userId}>
                             <span className="sr-only">Abrir menú de acciones</span>
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleEditClick(member)}>
                             <Edit className="mr-2 h-4 w-4" />
                             Editar
                           </DropdownMenuItem>
                           {member.status === 'pending' && (
                             <DropdownMenuItem onClick={() => handleResendInvitation(member.email)}>
                               <Send className="mr-2 h-4 w-4" />
                               Reenviar Invitación
                             </DropdownMenuItem>
                           )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMember(member)}>
                             <Trash2 className="mr-2 h-4 w-4" />
                             Eliminar
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    {filter ? 'No se encontraron miembros.' : 'No hay miembros en el equipo.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
           </Table>
            <div className="flex flex-col-reverse items-center justify-between gap-y-4 pt-4 border-t md:flex-row md:gap-y-0">
              <div className="flex-1 text-sm text-muted-foreground">
                {sortedTeam.length} miembros en total.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-end lg:gap-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Filas por página</p>
                  <Select
                    value={`${rowsPerPage}`}
                    onValueChange={(value) => {
                      setRowsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={`${rowsPerPage}`} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Ir a la primera página</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    <span className="sr-only">Ir a la última página</span>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>
    </>
  )
}
