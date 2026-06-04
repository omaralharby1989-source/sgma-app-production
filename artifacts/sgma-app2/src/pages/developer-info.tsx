import { useGetDeveloperInfo } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Code2, Info, Mail, Smartphone } from "lucide-react";
import { useLocation } from "wouter";

export default function DeveloperInfo() {
  const [, setLocation] = useLocation();
  const { data: info, isLoading } = useGetDeveloperInfo();

  return (
    <div className="min-h-[100dvh] bg-background p-4 max-w-lg mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-2">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">معلومات المطور</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : info ? (
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <Smartphone className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-primary">{info.appName}</h2>
              <p className="text-sm text-muted-foreground mt-1 font-mono" dir="ltr">v{info.version}</p>
              <p className="mt-4 text-sm font-medium leading-relaxed">{info.description}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                المطور
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">الشركة / المطور</p>
                <p className="font-medium text-sm">{info.developer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">للتواصل</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm" dir="ltr">{info.contact}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {info.builtWith && info.builtWith.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  التقنيات المستخدمة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2" dir="ltr">
                  {info.builtWith.map((tech, i) => (
                    <span key={i} className="px-2.5 py-1 bg-secondary/20 text-secondary-foreground text-xs font-mono font-medium rounded-md border border-secondary/30">
                      {tech}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-10">تعذر تحميل المعلومات</p>
      )}
    </div>
  );
}
