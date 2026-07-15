import { redirect } from 'next/navigation';
import { Users as UsersIcon } from 'lucide-react';
import { getCurrentUser, isManager } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddUserDialog } from './add-user-dialog';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  employeeId: true,
  isTrainer: true,
  createdAt: true,
} as const;

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const canManage = isManager(user.role);

  const users = canManage
    ? await prisma.user.findMany({
        where: { companyId: user.companyId },
        select: userSelect,
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      })
    : await prisma.user.findMany({
        where: { id: user.id },
        select: userSelect,
      });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UsersIcon className="h-6 w-6 text-pharma-blue" />
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? 'Manage the people in your organization and their roles.'
              : 'Your account details.'}
          </p>
        </div>
        {canManage && <AddUserDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <UsersIcon className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No users yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first team member to get started.
                </p>
              </div>
              {canManage && <AddUserDialog />}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell>{u.department ?? '—'}</TableCell>
                    <TableCell>{u.employeeId ?? '—'}</TableCell>
                    <TableCell>
                      {u.isTrainer ? (
                        <Badge variant="teal">Trainer</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
