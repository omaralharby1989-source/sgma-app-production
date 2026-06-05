import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetArticle,
  getGetArticleQueryKey,
  useUpdateArticle,
  getGetMyArticlesQueryKey,
  getGetArticlesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { ImageInput } from "@/components/ImageInput";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, Send, Loader2, AlertCircle } from "lucide-react";
import { canEditArticle } from "@/lib/articles";
import { getStoredUser } from "@/lib/auth";

const MIN_CONTENT = 30;

export default function ArticleEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/articles/:id/edit");
  const id = Number(params?.id);
  const validId = Number.isInteger(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, isLoading, isError } = useGetArticle(id, {
    query: { queryKey: getGetArticleQueryKey(id), enabled: validId, retry: false },
  });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (item && !hydrated) {
      setTitle(item.title);
      setSummary(item.summary ?? "");
      setCategory(item.category ?? "");
      setImageUrl(item.imageUrl ?? "");
      setContent(item.content);
      setHydrated(true);
    }
  }, [item, hydrated]);

  const updateMutation = useUpdateArticle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذر حفظ التعديلات",
          description: "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const currentUserId = getStoredUser()?.id;
  const isOwner = !!item && item.authorId === currentUserId;
  const editable = !!item && isOwner && canEditArticle(item.status);

  const validate = (): string | null => {
    if (!title.trim()) return "يرجى إدخال عنوان المقال.";
    if (!summary.trim()) return "يرجى إدخال ملخص قصير للمقال.";
    if (content.trim().length < MIN_CONTENT) return "محتوى المقال قصير جداً، يرجى كتابة محتوى أوفى.";
    return null;
  };

  const save = (status?: "PENDING") => {
    const error = validate();
    if (error) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: error });
      return;
    }

    updateMutation.mutate(
      {
        id,
        data: {
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          category: category.trim(),
          imageUrl: imageUrl.trim(),
          ...(status ? { status } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: status === "PENDING" ? "تم إرسال المقال للمراجعة" : "تم حفظ التعديلات",
          });
          setLocation("/articles/my");
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">تعديل المقال</h1>
        <BackButton fallback="/articles/my" />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!isLoading && (isError || !validId || (item && !isOwner)) && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <AlertCircle className="mb-3 h-12 w-12 opacity-40" />
          <p className="mb-6">المقال غير موجود أو لا يمكن تعديله</p>
          <Button variant="outline" onClick={() => setLocation("/articles/my")}>
            العودة إلى مقالاتي
          </Button>
        </div>
      )}

      {!isLoading && item && isOwner && !editable && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <AlertCircle className="mb-3 h-12 w-12 opacity-40" />
          <p className="mb-6">لا يمكن تعديل هذا المقال في حالته الحالية</p>
          <Button variant="outline" onClick={() => setLocation("/articles/my")}>
            العودة إلى مقالاتي
          </Button>
        </div>
      )}

      {!isLoading && editable && (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              تحرير المقال
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ed-title">عنوان المقال</Label>
                <Input
                  id="ed-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ed-summary">ملخص قصير</Label>
                <Textarea
                  id="ed-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ed-category">التصنيف (اختياري)</Label>
                <Input
                  id="ed-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={100}
                />
              </div>

              <ImageInput
                label="صورة المقال (اختياري)"
                value={imageUrl}
                onChange={setImageUrl}
              />

              <div className="space-y-1.5">
                <Label htmlFor="ed-content">محتوى المقال</Label>
                <Textarea
                  id="ed-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button type="submit" className="w-full gap-2" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ التعديلات
                </Button>

                {item.status === "DRAFT" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={updateMutation.isPending}
                    onClick={() => save("PENDING")}
                  >
                    <Send className="h-4 w-4" />
                    إرسال للمراجعة
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
