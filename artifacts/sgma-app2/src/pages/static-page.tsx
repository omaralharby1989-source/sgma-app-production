import { useState } from "react";
import {
  useGetStaticPage,
  useUpdateStaticPage,
  getGetStaticPageQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Pencil, Save, X, Loader2, CalendarDays } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser, isDeveloperUser } from "@/lib/auth";

export default function StaticPage({ slug }: { slug: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: page, isLoading, isError } = useGetStaticPage(slug);

  const canEdit = isDeveloperUser(getStoredUser());
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  const updateMutation = useUpdateStaticPage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetStaticPageQueryKey(slug) });
        setEditing(false);
        toast({ title: "تم تحديث الصفحة بنجاح" });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذر تحديث الصفحة",
          description: "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const startEdit = () => {
    if (!page) return;
    setForm({ title: page.title ?? "", content: page.content ?? "" });
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى تعبئة العنوان والمحتوى.",
      });
      return;
    }
    updateMutation.mutate({ slug, data: { title, content } });
  };

  const updatedAtLabel = page?.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto">
      <BroadcastBanner />
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold truncate">{page?.title ?? "..."}</h1>
        <BackButton fallback="/more" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !page ? (
        <p className="text-center text-muted-foreground mt-10">تعذر تحميل الصفحة</p>
      ) : editing ? (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              تعديل الصفحة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sp-title">عنوان الصفحة</Label>
                <Input
                  id="sp-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-content">المحتوى</Label>
                <Textarea
                  id="sp-content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={16}
                  maxLength={20000}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1 gap-2" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ التعديلات
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setEditing(false)}
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-primary break-words">{page.title}</h2>
                {updatedAtLabel && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    آخر تحديث: {updatedAtLabel}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <p className="text-sm leading-7 text-foreground/90 whitespace-pre-line break-words">
                {page.content}
              </p>
            </CardContent>
          </Card>

          {canEdit && (
            <Button onClick={startEdit} variant="secondary" className="w-full gap-2">
              <Pencil className="h-4 w-4" />
              تعديل الصفحة
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
