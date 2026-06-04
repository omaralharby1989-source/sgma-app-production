import { Link } from "wouter";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-background text-center">
      <div className="h-20 w-20 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6 shadow">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">غير مصرح</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        ليس لديك صلاحية للوصول إلى هذه الصفحة.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button asChild>
          <Link href="/home">العودة إلى الرئيسية</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">تسجيل الدخول بحساب آخر</Link>
        </Button>
      </div>
    </div>
  );
}
