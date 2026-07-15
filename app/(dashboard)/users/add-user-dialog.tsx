'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@prisma/client';

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

export function AddUserDialog() {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isTrainer, setIsTrainer] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('OPERATOR');
    setDepartment('');
    setEmployeeId('');
    setIsTrainer(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          department: department.trim() || null,
          employeeId: employeeId.trim() || null,
          isTrainer,
        }),
      });
      toast({ title: 'User added', description: `${name.trim()} can now sign in.` });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not add user',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            Create an account within your organization. The user signs in with the email and
            password you set here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Full name</Label>
            <Input
              id="add-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-password">Temporary password</Label>
            <Input
              id="add-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="add-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-department">Department</Label>
              <Input
                id="add-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Production"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-employeeId">Employee ID</Label>
            <Input
              id="add-employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-0042"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="add-trainer"
              checked={isTrainer}
              onCheckedChange={(v) => setIsTrainer(v === true)}
            />
            <Label htmlFor="add-trainer" className="cursor-pointer">
              Qualified trainer (can sign off OJT)
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
