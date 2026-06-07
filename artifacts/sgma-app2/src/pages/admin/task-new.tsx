import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useCreateAdminTask,
  getAssignableUsers,
  getGetAdminTasksQueryKey,
} from "@workspace/api-client-react";
import type { AssignableUser, TaskPriority } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { TASK_PRIORITY_OPTIONS, PRIORITY_LABELS } from "@/lib/taskLabels";
import { ClipboardList, Loader2, Send, Users } from "lucide-react";

export default function AdminTaskNew() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(false);

  useEffect(() => {
    let active = true;
    getAssignableUsers()
      .then((data) => {
        if (active) {
          setUsers(data);
          setUsersLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUsersError(true);
          setUsersLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const createTask = useCreateAdminTask();

  const toggleAssignee = (id: number) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إدخال عنوان المهمة." });
      return;
    }
    if (!description.trim()) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إدخال وصف المهمة." });
      return;
    }
    if (assigneeIds.length === 0) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى اختيار عضو واحد على الأقل." });
      return;
    }
    if (startDate && dueDate && startDate > dueDate) {
      toast({
        variant: "destructive",
        title: "تواريخ غير صالحة",
        description: "تاريخ البدء يجب أن يكون قبل أو يساوي تاريخ الاستحقاق.",
      });
      return;
    }
    createTask.mutate(
      {
        data: {
          title: title.trim(),
          description: description.trim(),
          assigneeIds,
          priority: priority as TaskPriority,
          ...(startDate ? { startDate } : {}),
          ...(dueDate ? { dueDate } : {}),
          ...(adminNotes.trim() ? { adminNotes: adminNotes.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() });
          toast({ title: "تم إنشاء المهمة بنجاح" });
          setLocation("/admin/tasks");
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر إنشاء المهمة";
          toast({ variant: "destructive", title: msg });
        },
      },
    );
  };

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="flex items-center justify-between pt-2 pb-1">
        <h1 className="text-2xl font-bold">إنشاء مهمة</h1>
        <BackButton fallback="/admin/tasks" />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            تفاصيل المهمة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="task-title">عنوان المهمة</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc">وصف المهمة</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={4000}
              />
            </div>

            <div className="space-y-1.5">
              <Label>الأولوية</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-start">تاريخ البدء (اختياري)</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-due">تاريخ الاستحقاق (اختياري)</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                المكلّفون
              </Label>
              {usersError ? (
                <p className="text-sm text-destructive">تعذر تحميل قائمة الأعضاء</p>
              ) : usersLoading ? (
                <p className="text-sm text-muted-foreground">جارِ التحميل...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد أعضاء متاحون</p>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-md border divide-y">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={assigneeIds.includes(u.id)}
                        onCheckedChange={() => toggleAssignee(u.id)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{u.fullName}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {u.account} — {u.role}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {assigneeIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  تم اختيار {assigneeIds.length} عضو
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-notes">ملاحظات إدارية (اختياري)</Label>
              <Textarea
                id="task-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="ملاحظات داخلية للطاقم"
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={createTask.isPending}>
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إنشاء المهمة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
