import { useMemo, useState } from "react";
import type { AssignableUser } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/taskLabels";
import { X, Search, Check } from "lucide-react";

interface UserPickerProps {
  label: string;
  placeholder: string;
  helper?: string;
  users: AssignableUser[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  multiple: boolean;
  icon?: React.ReactNode;
}

export function UserPicker({
  label,
  placeholder,
  helper,
  users,
  selectedIds,
  onChange,
  multiple,
  icon,
}: UserPickerProps) {
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const m = new Map<number, AssignableUser>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const role = ROLE_LABELS[u.role] ?? u.role;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.account.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const toggle = (id: number) => {
    if (multiple) {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id],
      );
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  };

  const remove = (id: number) => onChange(selectedIds.filter((x) => x !== id));

  const selectedUsers = selectedIds
    .map((id) => byId.get(id))
    .filter((u): u is AssignableUser => !!u);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <Badge
              key={u.id}
              variant="secondary"
              className="gap-1 max-w-full py-1 pr-1 pl-2"
            >
              <span className="truncate">{u.fullName}</span>
              <button
                type="button"
                onClick={() => remove(u.id)}
                className="shrink-0 rounded-full hover:bg-background/60 p-0.5"
                aria-label={`إزالة ${u.fullName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pr-9"
        />
      </div>

      <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 text-center">
            لا توجد نتائج مطابقة
          </p>
        ) : (
          filtered.map((u) => {
            const selected = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`w-full flex items-center gap-3 p-3 text-right hover:bg-muted/40 ${
                  selected ? "bg-primary/5" : ""
                }`}
              >
                <span
                  className={`shrink-0 h-5 w-5 rounded-md border flex items-center justify-center ${
                    selected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{u.fullName}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {u.email ?? u.account} — {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
