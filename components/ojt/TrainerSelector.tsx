'use client';

import { GraduationCap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface UserOption {
  id: string;
  name: string;
  role?: string;
  department?: string | null;
  isTrainer?: boolean;
}

/** Select restricted to qualified trainers (users with isTrainer = true). */
export function TrainerSelector({
  users,
  value,
  onValueChange,
  excludeUserId,
  disabled,
}: {
  users: UserOption[];
  value: string;
  onValueChange: (id: string) => void;
  excludeUserId?: string;
  disabled?: boolean;
}) {
  const trainers = users.filter((u) => u.isTrainer && u.id !== excludeUserId);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={trainers.length ? 'Select a trainer' : 'No qualified trainers available'} />
      </SelectTrigger>
      <SelectContent>
        {trainers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="inline-flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-pharma-blue" />
              {t.name}
              {t.department ? <span className="text-muted-foreground">· {t.department}</span> : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
