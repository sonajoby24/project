
'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { auth, db } from '@/lib/firebase';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  RecaptchaVerifier,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
  getMultiFactorResolver,
  MultiFactorResolver,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

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
import { Loader2, Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

const PENDING_PROFILE_KEY = 'catalogix_pending_profile';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { logEvent } = useEvents();

  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // SMS Multi-Factor Authentication state
const [mfaMode, setMfaMode] = useState<
  'none' | 'enroll' | 'challenge'
>('none');

const [smsCode, setSmsCode] = useState('');
const [verificationId, setVerificationId] = useState('');
const [mfaPhone, setMfaPhone] = useState('');

const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

const [isSendingOtp, setIsSendingOtp] = useState(false);

const [mfaResolver, setMfaResolver] =
  useState<MultiFactorResolver | null>(null);

  const emailForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

 function getRecaptchaVerifier() {
  if (!recaptchaRef.current) {
    recaptchaRef.current = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
       size: 'normal',
      }
    );
  }

  return recaptchaRef.current;
}

async function startPhoneEnrollment(phoneNumber: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Please log in again to verify your mobile number.');
  }

  setIsSendingOtp(true);

  try {
    const session = await multiFactor(currentUser).getSession();
 const verifier = getRecaptchaVerifier();

const phoneProvider = new PhoneAuthProvider(auth);
    const id = await phoneProvider.verifyPhoneNumber(
      {
        phoneNumber,
        session,
      },
      verifier
    );

    setVerificationId(id);
    setMfaPhone(phoneNumber);
    setMfaMode('enroll');

    toast({
      title: 'OTP Sent',
      description: `A verification code has been sent to ${phoneNumber}.`,
    });
  } finally {
    setIsSendingOtp(false);
  }
}

async function verifyEnrollmentCode() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    toast({
      title: 'Session Expired',
      description: 'Please log in again.',
      variant: 'destructive',
    });
    return;
  }

  if (!/^\d{6}$/.test(smsCode)) {
    toast({
      title: 'Invalid OTP',
      description: 'Please enter the six-digit verification code.',
      variant: 'destructive',
    });
    return;
  }

  setIsLoading(true);

  try {
    const credential = PhoneAuthProvider.credential(
      verificationId,
      smsCode
    );

    const assertion =
      PhoneMultiFactorGenerator.assertion(credential);

    await multiFactor(currentUser).enroll(
      assertion,
      'Catalogix SMS Verification'
    );

    const isMfaEnrolled =
      multiFactor(currentUser).enrolledFactors.some(
        (factor) =>
          factor.factorId === PhoneMultiFactorGenerator.FACTOR_ID
      );

    if (!isMfaEnrolled) {
      throw new Error('SMS enrollment could not be confirmed.');
    }

    setMfaMode('none');
    setSmsCode('');
   setVerificationId('');

if (recaptchaRef.current) {
  recaptchaRef.current.clear();
  recaptchaRef.current = null;
}

await signOut(auth);

    toast({
      title: 'SMS Verification Enabled',
      description:
        'Your phone is registered. Please log in again with your email, password and SMS OTP.',
    });
  } catch (error: any) {
    console.error('SMS MFA enrollment error:', error);

    toast({
      title: 'OTP Verification Failed',
      description:
        error.code === 'auth/invalid-verification-code'
          ? 'Incorrect OTP. Please try again.'
          : error.message || 'Unable to verify your mobile number.',
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
}



async function startMfaChallenge(resolver: MultiFactorResolver) {
  setIsSendingOtp(true);

  try {
    const phoneHint = resolver.hints.find(
      (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
    );

    if (!phoneHint) {
      throw new Error('No enrolled phone number was found for this account.');
    }

    const verifier = getRecaptchaVerifier();
    const phoneProvider = new PhoneAuthProvider(auth);

    const id = await phoneProvider.verifyPhoneNumber(
      {
        multiFactorHint: phoneHint,
        session: resolver.session,
      },
      verifier
    );

   setMfaResolver(resolver);
setVerificationId(id);
console.log('MFA challenge OTP request completed');
setMfaMode('challenge');
    toast({
      title: 'Login Verification Required',
      description: 'A verification code has been sent to your registered phone.',
    });
  } finally {
    setIsSendingOtp(false);
  }
}

async function verifyMfaChallengeCode() {
  if (!mfaResolver) {
    toast({
      title: 'Session Expired',
      description: 'Please log in again.',
      variant: 'destructive',
    });
    return;
  }

  if (!/^\d{6}$/.test(smsCode)) {
    toast({
      title: 'Invalid OTP',
      description: 'Please enter the six-digit verification code.',
      variant: 'destructive',
    });
    return;
  }

  setIsLoading(true);
  
  try {
    console.log('OTP length:', smsCode.length);
    console.log('Verification ID available:', Boolean(verificationId));
    const credential = PhoneAuthProvider.credential(
      verificationId,
      smsCode
    );

    const assertion = PhoneMultiFactorGenerator.assertion(
      credential
    );

    const result = await mfaResolver.resolveSignIn(assertion);

    const idToken = await result.user.getIdToken();

const response = await fetch(
  '/api/auth/complete-mfa-enrollment',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  }
);

const claimResult = await response.json();

if (!response.ok || !claimResult.success) {
  throw new Error(
    claimResult.message || 'Unable to complete MFA verification.'
  );
}

await result.user.getIdToken(true);

    setMfaMode('none');
    setSmsCode('');
    setVerificationId('');
    setMfaResolver(null);


    await result.user.reload();

    if (!result.user.emailVerified) {
      await sendEmailVerification(result.user);
      await signOut(auth);

      toast({
        title: 'Email Verification Required',
        description: 'Please verify your email and log in again.',
        variant: 'destructive',
      });
      return;
    }

   await result.user.getIdToken(true);

const profileSnapshot = await getDoc(
  doc(db, 'users', result.user.uid)
);

if (!profileSnapshot.exists()) {
  await signOut(auth);

  toast({
    title: 'Profile Not Found',
    description: 'Please contact support to restore your account profile.',
    variant: 'destructive',
  });

  return;
}

await finishLogin(result.user.email || '');
  } catch (error: any) {
    console.error('SMS MFA challenge error:', error);

    toast({
      title: 'OTP Verification Failed',
      description:
        error.code === 'auth/invalid-verification-code'
          ? 'Incorrect OTP. Please try again.'
          : error.message || 'Unable to verify your login.',
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
}

  async function handleForgotPassword() {
    const validEmail = await emailForm.trigger('email');

    if (!validEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter your registered email address first.',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      await sendPasswordResetEmail(
        auth,
        emailForm.getValues('email')
      );

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for the password reset link.',
      });
    } catch (error: any) {
      toast({
        title: 'Password Reset Failed',
        description:
          error.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : 'Unable to send the reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  }

  async function finishLogin(email: string) {
    await logEvent({
      type: 'login',
      userEmail: email,
    });

    toast({
      title: 'Login Successful',
      description: 'Welcome back to Catalogix!',
    });

    router.push('/');
  }

  async function onSubmit(values: FormValues) {
    const firstName = values.firstName?.trim() || '';
    const lastName = values.lastName?.trim() || '';
    const phone = values.phone?.trim() || '';

    // Validate registration and profile-completion fields.
    if (isRegister || isCompletingProfile) {
      if (!firstName || !lastName || !phone) {
        toast({
          title: 'Missing Information',
          description: 'Please complete your first name, last name and mobile number.',
          variant: 'destructive',
        });
        return;
      }

      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        toast({
          title: 'Invalid Mobile Number',
          description:
            'Enter your number with country code, for example +919876543210.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // STEP 1: Complete a missing profile for an existing account.
      if (isCompletingProfile) {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error('Your login session has expired. Please log in again.');
        }

        await currentUser.reload();

        if (!currentUser.emailVerified) {
          throw new Error('Please verify your email before completing your profile.');
        }

        // Refresh the Firebase token so Firestore receives the verified-email claim.
        await currentUser.getIdToken(true);

        const userRef = doc(db, 'users', currentUser.uid);

        const existingProfile = await getDoc(userRef);

        if (existingProfile.exists()) {
          setIsCompletingProfile(false);
          await finishLogin(values.email);
          return;
        }

        await setDoc(userRef, {
          firstName,
          lastName,
          phone,
          email: currentUser.email,
          role: 'customer',
          createdAt: serverTimestamp(),
        });

        setIsCompletingProfile(false);
        localStorage.removeItem(PENDING_PROFILE_KEY);

       await startPhoneEnrollment(phone);
        return;
      }

      // STEP 2: Register a new account.
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        localStorage.setItem(
          PENDING_PROFILE_KEY,
          JSON.stringify({
            firstName,
            lastName,
            phone,
            email: values.email,
          })
        );

        await sendEmailVerification(credential.user);
        await signOut(auth);

        toast({
          title: 'Account Created',
          description:
            'Verification email sent. Verify your email, then log in.',
        });

        setIsRegister(false);

        emailForm.reset({
          firstName: '',
          lastName: '',
          phone: '',
          email: values.email,
          password: '',
        });

        return;
      }

      // STEP 3: Log in an existing account.
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
            'Verify your email using the link sent to your inbox, then log in again.',
          variant: 'destructive',
        });

        return;
      }

      await credential.user.getIdToken(true);

      const userRef = doc(db, 'users', credential.user.uid);
      const existingProfile = await getDoc(userRef);

     // Existing profile: enforce SMS MFA enrollment.
if (existingProfile.exists()) {
  const profileData = existingProfile.data();

 if (multiFactor(credential.user).enrolledFactors.length === 0) {
    if (profileData.phone) {
      await startPhoneEnrollment(profileData.phone);
      return;
    }

    emailForm.setValue('firstName', profileData.firstName || '');
    emailForm.setValue('lastName', profileData.lastName || '');
    emailForm.setValue('phone', '');

    setIsCompletingProfile(true);

    toast({
      title: 'Mobile Number Required',
      description: 'Please provide your mobile number to enable SMS verification.',
    });

    return;
  }

  await finishLogin(values.email);
  return;
}

      // Try to recover registration details from this browser.
      const pendingProfile = localStorage.getItem(PENDING_PROFILE_KEY);

      if (pendingProfile) {
        try {
          const profile = JSON.parse(pendingProfile);

          if (
            profile.email?.toLowerCase() ===
            credential.user.email?.toLowerCase() &&
            profile.firstName &&
            profile.lastName &&
            profile.phone
          ) {
            await setDoc(userRef, {
              firstName: profile.firstName,
              lastName: profile.lastName,
              phone: profile.phone,
              email: credential.user.email,
              role: 'customer',
              createdAt: serverTimestamp(),
            });

           localStorage.removeItem(PENDING_PROFILE_KEY);

await startPhoneEnrollment(profile.phone);
return;
          }
        } catch (profileError) {
          console.error('Pending profile recovery failed:', profileError);
        }
      }

      // No saved details: ask the existing user to complete their profile.
      emailForm.setValue('firstName', '');
      emailForm.setValue('lastName', '');
      emailForm.setValue('phone', '');

      setIsCompletingProfile(true);

      toast({
        title: 'Complete Your Profile',
        description:
          'Your account is valid. Please provide your name and mobile number to continue.',
      });
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
    try {
      const resolver = getMultiFactorResolver(auth, error);
      await startMfaChallenge(resolver);
      return;
    } catch (mfaError: any) {
      console.error('MFA challenge error:', mfaError);

      toast({
        title: 'SMS Verification Error',
        description: mfaError.message || 'Unable to send the verification code.',
        variant: 'destructive',
      });
      return;
    }
  }


      console.error('Authentication error:', error);

      const messages: Record<string, string> = {
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/user-not-found': 'No account found. Please register first.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already registered. Please log in.',
        'auth/weak-password': 'Please choose a stronger password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed':
          'Network error. Please check your connection.',
      };

      toast({
        title: isRegister
          ? 'Registration Failed'
          : isCompletingProfile
            ? 'Profile Update Failed'
            : 'Login Failed',
        description:
          messages[error.code] ||
          error.message ||
          'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to Catalogix
          </CardTitle>

          <CardDescription>
            {isCompletingProfile
              ? 'Complete your profile to continue'
              : isRegister
                ? 'Create your Catalogix account'
                : 'Login to continue'}
          </CardDescription>
        </CardHeader>

      <CardContent className="space-y-6">
  <div id="recaptcha-container"></div>

  {mfaMode !== 'none' ? (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">
        SMS Verification
      </h3>

      <p className="text-sm text-muted-foreground text-center">
        {mfaMode === 'enroll'
          ? `Enter the OTP sent to ${mfaPhone}`
          : 'Enter the OTP sent to your registered mobile number.'}
      </p>

      <Input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="Enter 6-digit OTP"
        value={smsCode}
        onChange={(e) =>
          setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))
        }
      />

      <Button
        type="button"
        className="w-full"
        onClick={
          mfaMode === 'enroll'
            ? verifyEnrollmentCode
            : verifyMfaChallengeCode
        }
        disabled={isLoading || isSendingOtp || smsCode.length !== 6}
      >
        {isLoading ? 'Verifying...' : 'Verify OTP'}
      </Button>
    </div>
  ) : (
    <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {(isRegister || isCompletingProfile) && (
                <>
                  <FormField
                    control={emailForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter first name"
                            autoComplete="given-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter last name"
                            autoComplete="family-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+919876543210"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {!isCompletingProfile && (
                <>
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
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
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              autoComplete={
                                isRegister ? 'new-password' : 'current-password'
                              }
                              className="pr-10"
                              {...field}
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {!isRegister && !isCompletingProfile && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetting || isLoading}
                    className="text-sm font-medium text-primary underline"
                  >
                    {isResetting
                      ? 'Sending reset email...'
                      : 'Forgot password?'}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isResetting}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {isCompletingProfile
                  ? 'Save Profile'
                  : isRegister
                    ? 'Create Account'
                    : 'Login'}
              </Button>
                       </form>
          </Form>
          )}

          {!isCompletingProfile && (
            <div className="text-center text-sm">
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() => {
                      setIsRegister(false);
                      setShowPassword(false);
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
                      setShowPassword(false);
                      emailForm.reset();
                    }}
                  >
                    Create an account
                  </button>
                </>
              )}
            </div>
          )}

          {isCompletingProfile && (
            <p className="text-center text-sm text-muted-foreground">
              Your account is already registered. You do not need to create another account.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
