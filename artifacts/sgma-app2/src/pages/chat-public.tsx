import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPublicChatMessages,
  useSendPublicChatMessage,
  useEditPublicChatMessage,
  useDeletePublicChatMessage,
  getGetPublicChatMessagesQueryKey,
} from "@workspace/api-client-react";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatPresencePanel } from "@/components/engagement/ChatPresencePanel";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function ChatPublic() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = getGetPublicChatMessagesQueryKey();

  const { data: messages, isLoading } = useGetPublicChatMessages({
    query: { queryKey, refetchInterval: 7000 },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const onError = (error: any) =>
    toast({
      title: "حدث خطأ",
      description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
      variant: "destructive",
    });

  const sendMutation = useSendPublicChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const editMutation = useEditPublicChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const deleteMutation = useDeletePublicChatMessage({ mutation: { onSuccess: invalidate, onError } });

  return (
    <div className="max-w-lg mx-auto bg-background min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-3 py-3">
        <button onClick={() => setLocation("/chat")} aria-label="رجوع" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold leading-tight">محادثة الأعضاء العامة</h1>
          <p className="text-[11px] text-muted-foreground">غرفة عامة لجميع الأعضاء</p>
        </div>
      </header>

      <div className="px-3 pt-2">
        <ChatPresencePanel roomType="PUBLIC_CHAT" roomKey="PUBLIC" />
      </div>

      <ChatThread
        messages={messages ?? []}
        isLoading={isLoading}
        isSending={sendMutation.isPending}
        showSenderName
        placeholder="اكتب رسالتك للجميع..."
        onSend={(content) => sendMutation.mutate({ data: { content } })}
        onEdit={(id, content) => editMutation.mutate({ id, data: { content } })}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
