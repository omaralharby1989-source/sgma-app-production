import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Pencil, Trash2, Check, X, MessageSquare } from "lucide-react";
import { ROLE_ARABIC } from "@/lib/constants";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || "؟";
}

type ChatThreadProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  showSenderName?: boolean;
  emptyText?: string;
  placeholder?: string;
  disabled?: boolean;
  onSend: (content: string) => void;
  onEdit: (id: number, content: string) => void;
  onDelete: (id: number) => void;
};

export function ChatThread({
  messages,
  isLoading,
  isSending,
  showSenderName = true,
  emptyText = "لا توجد رسائل بعد. كن أول من يبدأ المحادثة.",
  placeholder = "اكتب رسالتك...",
  disabled = false,
  onSend,
  onEdit,
  onDelete,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (messages.length !== prevCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: prevCount.current === 0 ? "auto" : "smooth" });
      prevCount.current = messages.length;
    }
  }, [messages.length]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || isSending) return;
    onSend(content);
    setDraft("");
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditDraft(m.content);
  };

  const saveEdit = () => {
    const content = editDraft.trim();
    if (!content || editingId === null) return;
    onEdit(editingId, content);
    setEditingId(null);
    setEditDraft("");
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 px-6">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.isMine;
            const isEditing = editingId === m.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                {!mine && (
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    {m.senderAvatarUrl && <AvatarImage src={m.senderAvatarUrl} alt={m.senderName} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials(m.senderName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {showSenderName && !mine && (
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-xs font-semibold text-foreground/80">{m.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {ROLE_ARABIC[m.senderRole] ?? m.senderRole}
                      </span>
                    </div>
                  )}
                  {isEditing ? (
                    <div className="w-full min-w-[200px] space-y-2">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                        dir="auto"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 ml-1" /> إلغاء
                        </Button>
                        <Button size="sm" onClick={saveEdit} disabled={!editDraft.trim()}>
                          <Check className="h-4 w-4 ml-1" /> حفظ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        m.isDeleted
                          ? "bg-muted text-muted-foreground italic"
                          : mine
                            ? "bg-primary text-primary-foreground rounded-tl-sm"
                            : "bg-card border border-border rounded-tr-sm"
                      }`}
                      dir="auto"
                    >
                      {m.content}
                    </div>
                  )}
                  {!isEditing && (
                    <div
                      className={`flex items-center gap-2 mt-0.5 px-1 ${mine ? "flex-row" : "flex-row-reverse"}`}
                    >
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.createdAt)}</span>
                      {m.editedAt && !m.isDeleted && (
                        <span className="text-[10px] text-muted-foreground">تم التعديل</span>
                      )}
                      {!m.isDeleted && mine && (
                        <button
                          onClick={() => startEdit(m)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="تعديل"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {!m.isDeleted && m.canModerate && (
                        <button
                          onClick={() => setDeleteId(m.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={disabled ? "غير متاح" : placeholder}
            rows={1}
            disabled={disabled}
            className="resize-none min-h-[44px] max-h-32 text-sm"
            dir="auto"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isSending || !draft.trim()}
            className="h-11 w-11 shrink-0"
            aria-label="إرسال"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرسالة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId !== null) onDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
