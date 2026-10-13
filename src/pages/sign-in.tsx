import { SignIn } from '@clerk/react';
import { AuthPage } from './auth-page';

export default function SignInPage() {
  return (
    <AuthPage title="Sign in to PitchSafe">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthPage>
  );
}
