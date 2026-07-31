import { AlertCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  message?: string;
  onReconnect: () => void;
  compact?: boolean;
}

export function MetaReconnectAlert({
  message = "Reconnect your Meta account.",
  onReconnect,
  compact = false,
}: Props) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className={compact ? "py-3 px-4" : "py-4 px-4"}>
        <div className={`flex ${compact ? "items-center" : "items-start"} justify-between gap-3`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{message}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onReconnect} className="shrink-0">
            <Link2 className="w-4 h-4 mr-2" />
            Reconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
