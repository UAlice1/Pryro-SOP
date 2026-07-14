"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        router.push("/assistant");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-svh bg-zinc-50 dark:bg-transparent flex items-center justify-center px-4 py-4 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <div className="bg-card border rounded-xl shadow-md shadow-zinc-950/5 overflow-hidden">
          <div className="px-6 pt-6 pb-5">

            {/* Brand */}
            <div className="text-center mb-5">
              <Link href="/" aria-label="go home" className="mx-auto inline-block mb-3">
                <span className="text-base font-semibold">Pryro SOP</span>
              </Link>
              <h1 className="text-lg font-semibold leading-tight">Sign In</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Welcome back! Sign in to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  {...register("email")}
                  className={`h-9 text-sm ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link href="#">Forgot password?</Link>
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    {...register("password")}
                    className={`h-9 text-sm pr-9 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-9 text-sm mt-1" disabled={loading}>
                {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>

            {/* Divider */}
            <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <hr className="border-dashed" />
              <span className="text-muted-foreground text-xs">Or continue with</span>
              <hr className="border-dashed" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-1 gap-2">
              <Button type="button" variant="outline" className="h-9 gap-2 text-xs" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="0.98em" height="1em" viewBox="0 0 256 262">
                  <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                  <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                  <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                  <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
                </svg>
                Google
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Button asChild variant="link" className="px-1 h-auto text-xs">
                <Link href="/register">Create account</Link>
              </Button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
