import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { FileText, Clock } from "lucide-react";

export default function Articles() {
  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">المقالات</h1>
        <BackButton fallback="/more" />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">قسم المقالات</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            قسم المقالات قيد التحضير وسيتم تفعيله قريباً.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs bg-secondary/20 text-secondary-foreground px-3 py-1.5 rounded-full font-medium">
            <Clock className="h-3.5 w-3.5" />
            قريباً
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
