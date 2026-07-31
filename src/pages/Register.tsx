import { useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { register, loginWithMeta } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      await register({ name, email, password });
      toast({ title: "Account created", description: "You are signed in and ready to connect Meta.", variant: "success" });
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: (error as Error).message || "Please review your details and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMetaRegister = async () => {
    setMetaLoading(true);
    try {
      await loginWithMeta();
    } catch (error) {
      toast({
        title: "Meta signup unavailable",
        description: error instanceof Error ? error.message : "Unable to start Meta sign-up right now.",
        variant: "destructive",
      });
    } finally {
      setMetaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Create your workspace</CardTitle>
            <CardDescription>Use Facebook or Meta to create your account and grant access to the business assets you manage.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button type="button" className="w-full" size="lg" disabled={metaLoading} onClick={handleMetaRegister}>
            {metaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            Create account with Facebook / Meta
          </Button>

          <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            We redirect you to Meta securely, then create your workspace after Meta returns the business assets you are allowed to manage.
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fallback</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
            </div>

            <Button type="submit" variant="outline" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create account with email instead
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
