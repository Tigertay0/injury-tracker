import { SignUp } from '@clerk/react';
import { AuthPage } from './auth-page';

export default function SignUpPage() {
  return (
    <AuthPage title="Create your PitchSafe account" note="You need to be 13 or older to create an account.">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthPage>
  );
}
