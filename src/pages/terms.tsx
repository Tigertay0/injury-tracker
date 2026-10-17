import { CONTACT_EMAIL } from '@/config';
import { LegalPage } from './legal-page';

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="October 17, 2026">
      <section>
        <h2>What PitchSafe is</h2>
        <p className="mt-3">
          PitchSafe is an educational tool that estimates training-related injury risk from the information you enter. It is <strong>not a medical device</strong> and does not diagnose, treat or prevent any condition. Its scores are indicators, not guarantees. The core app is free; PitchSafe Plus is an optional paid plan.
        </p>
      </section>

      <section>
        <h2>Your health comes first</h2>
        <p className="mt-3">
          If you feel pain or think you are injured, stop training and see a qualified medical professional or physiotherapist. Do not use PitchSafe in place of professional advice, and do not ignore professional advice because of a PitchSafe score.
        </p>
      </section>

      <section>
        <h2>Who can use it</h2>
        <p className="mt-3">You must be 13 or older. You are responsible for keeping your login secure and for the accuracy of what you enter.</p>
      </section>

      <section>
        <h2>Fair use</h2>
        <ul>
          <li>Use PitchSafe for your own training records.</li>
          <li>Do not try to access other players' data, overload the service, or get around its security limits.</li>
          <li>We may suspend accounts that break these rules.</li>
        </ul>
      </section>

      <section>
        <h2>PitchSafe Plus</h2>
        <p className="mt-3">PitchSafe Plus is a paid plan that lets you create your own drills.</p>
        <ul>
          <li>Plus costs $60 a year, in US dollars. You are charged when you subscribe, and it renews every year until you cancel.</li>
          <li>Payments are run by Clerk (Clerk Billing) and Stripe. PitchSafe never sees your full card number.</li>
          <li>You can cancel any time in Settings. Plus stays active until the end of the year you paid for.</li>
          <li>
            Refunds are available on request and are issued through Stripe.
            {CONTACT_EMAIL ? (
              <>
                {' '}
                To ask for one, email{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-ink underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                .
              </>
            ) : null}
          </li>
          <li>If you are under 18, a parent or guardian needs to pay for Plus.</li>
          <li>Prices may change. We will tell you before your next renewal.</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p className="mt-3">
          PitchSafe, including PitchSafe Plus, is provided as it is, without any warranty. We work to keep it accurate and available but cannot promise it will be error-free or always online. To the extent the law allows, we are not liable for injuries, losses or decisions based on its scores.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p className="mt-3">You can delete your account and your PitchSafe data at any time from Settings. If you have PitchSafe Plus, cancel it in Settings before you delete your account.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p className="mt-3">
          If these terms change, the date at the top changes too. Continuing to use PitchSafe after a change means you accept it.
          {CONTACT_EMAIL ? (
            <>
              {' '}
              Questions? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-ink underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : null}
        </p>
      </section>
    </LegalPage>
  );
}
