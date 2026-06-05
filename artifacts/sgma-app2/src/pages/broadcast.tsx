import { useState } from "react";
import { useCreateBroadcast, getGetActiveBroadcastsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { Radio, Send, Loader2 } from "lucide-react";

export default function Broadcast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createMutation = useCreateBroadcast({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveBroadcastsQueryKey() });
        setTitle("");
        setContent("");
        setExpiresAt("");
        toast({
          title: "تم إرسال البث",
          description: "سيظهر التنبيه في أعلى صفحات التطبيق.",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذر إرسال البث",
          description: "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى إدخال عنوان البث ونص الرسالة.",
      });
      return;
    }

    createMutation.mutate({
      data: {
        title: title.trim(),
        content: content.trim(),
        ...(expiresAt ? { expiresAt } : {}),
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">إرسال بث</h1>
        <BackButton fallback="/more" />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            رسالة بث جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bc-title">عنوان البث</Label>
              <Input
                id="bc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تنبيه من SGMA"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bc-content">نص رسالة البث</Label>
              <Textarea
                id="bc-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب نص رسالة البث هنا..."
                rows={4}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bc-expires">تاريخ انتهاء الظهور (اختياري)</Label>
              <Input
                id="bc-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                اتركه فارغاً ليبقى البث ظاهراً حتى إيقافه.
              </p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال البث
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
