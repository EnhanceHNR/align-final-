'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth, firestore, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';

export default function RegisterPage() {
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState<UserRole>('clinic');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async () => {
    if (!email || !password || !businessName) {
        toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all fields.'});
        return;
    }
    
    setIsRegistering(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          role,
          businessName,
          createdAt: new Date().toISOString()
      });
      
      toast({ title: 'Registration Successful', description: 'Welcome to the platform!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'Please check your information and try again.',
      });
      setIsRegistering(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[450px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Join the Marketplace</h1>
            </div>
            <p className="text-balance text-muted-foreground">Create an account as a Clinic or a Dealer</p>
          </div>
          <div className="grid gap-4">
            
            <div className="grid gap-2">
                <Label>I am a...</Label>
                <RadioGroup value={role} onValueChange={(val: any) => setRole(val)} className="flex gap-4">
                  <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer" onClick={() => setRole('clinic')}>
                    <RadioGroupItem value="clinic" id="r-clinic" />
                    <Label htmlFor="r-clinic" className="cursor-pointer">Clinic / Buyer</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 cursor-pointer" onClick={() => setRole('dealer')}>
                    <RadioGroupItem value="dealer" id="r-dealer" />
                    <Label htmlFor="r-dealer" className="cursor-pointer">Dealer / Seller</Label>
                  </div>
                </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="businessName">{role === 'clinic' ? 'Clinic Name' : 'Dealership Name'}</Label>
              <Input id="businessName" placeholder="e.g. Apollo Dental" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={isRegistering} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isRegistering} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isRegistering} />
            </div>
            <Button onClick={handleRegister} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isRegistering}>
              {isRegistering && <Loader2 className="mr-2 animate-spin" />}
              Create Account
            </Button>
            
            <div className="text-center text-sm mt-2">
                Already have an account? <Link href="/login" className="underline font-medium">Login here</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {bgImage && (
          <Image
            src={bgImage.imageUrl}
            alt={bgImage.description}
            data-ai-hint={bgImage.imageHint}
            fill
            className="object-cover dark:brightness-[0.2] dark:grayscale"
          />
        )}
      </div>
    </div>
  );
}
