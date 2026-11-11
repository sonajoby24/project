
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/context/events-context';
import { Loader2 } from 'lucide-react';

const emailFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
});

type FormValues = z.infer<typeof emailFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { logEvent } = useEvents();

  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const emailForm = useForm<FormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        await sendEmailVerification(credential.user);
        await signOut(auth);

        toast({
          title: 'Account Created',
          description:
            'Verification email sent. Please verify your email before logging in.',
        });

        setIsRegister(false);
        emailForm.reset({
          email: values.email,
          password: '',
        });
      } else {
        const credential = await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        await credential.user.reload();

        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          await signOut(auth);

          toast({
            title: 'Email Verification Required',
            description:
              'Please verify your email using the link sent to your inbox, then log in again.',
            variant: 'destructive',
          });

          return;
        }

        logEvent({
          type: 'login',
          userEmail: values.email,
        });

        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });

        router.push('/');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      toast({
        title: isRegister ? 'Registration Failed' : 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to Catalogix
          </CardTitle>

          <CardDescription>
            {isRegister
              ? 'Create your Catalogix account'
              : 'Login to continue'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        autoComplete={
                          isRegister ? 'new-password' : 'current-password'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isRegister ? 'Create Account' : 'Login'}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline"
                  onClick={() => {
                    setIsRegister(false);
                    emailForm.reset();
                  }}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                New to Catalogix?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline"
                  onClick={() => {
                    setIsRegister(true);
                    emailForm.reset();
                  }}
                >
                  Create an account
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
