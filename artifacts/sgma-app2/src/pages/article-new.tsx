import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateArticle, getGetMyArticlesQueryKey, getGetArticlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Send, Save, Loader2 } from "lucide-react";

const MIN_CONTENT = 30;

export default function ArticleNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");

  const createMutation = useCreateArticle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticlesQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذر إرسال المقال",
          description: "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const validate = (): string | null => {
    if (!title.trim()) return "يرجى إدخال عنوان المقال.";
    if (!summary.trim()) return "يرجى إدخال ملخص قصير للمقال.";
    if (content.trim().length < MIN_CONTENT) return "محتوى المقال قصير جداً، يرجى كتابة محتوى أوفى.";
    return null;
  };

  const submit = (status: "PENDING" | "DRAFT") => {
    const error = validate();
    if (error) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: error });
      return;
    }

    createMutation.mutate(
      {
        data: {
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          status,
          ...(category.trim() ? { category: category.trim() } : {}),
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: status === "DRAFT" ? "تم حفظ المسودة" : "تم إرسال المقال للمراجعة",
            description:
              status === "DRAFT"
                ? "يمكنك متابعة تحريرها من مقالاتي."
                : "سيظهر المقال بعد اعتماده من الإدارة.",
          });
          setLocation("/articles/my");
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">كتابة مقال</h1>
        <BackButton fallback="/articles" />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            مقال جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit("PENDING");
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ar-title">عنوان المقال</Label>
              <Input
                id="ar-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: أهمية التدريب المستمر"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-summary">ملخص قصير</Label>
              <Textarea
                id="ar-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="ملخص موجز يظهر في قائمة المقالات..."
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-category">التصنيف (اختياري)</Label>
              <Input
                id="ar-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="مثال: التمريض، العناية المركزة"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-image">رابط صورة المقال (اختياري)</Label>
              <Input
                id="ar-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-content">محتوى المقال</Label>
              <Textarea
                id="ar-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب محتوى المقال هنا..."
                rows={10}
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                إرسال المقال للمراجعة
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={createMutation.isPending}
                onClick={() => submit("DRAFT")}
              >
                <Save className="h-4 w-4" />
                حفظ كمسودة
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
