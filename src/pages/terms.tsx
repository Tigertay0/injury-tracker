import { CONTACT_EMAIL } from '@/config';
import { LegalPage } from './legal-page';

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="October 12, 2026">
      <section>
        <h2>What PitchSafe is</h2>
        <p className="mt-3">
          PitchSafe is a free educational tool that estimates training-related injury risk from the information you enter. It is <strong>not a medical device</strong> and does not diagnose, treat or prevent any condition. Its scores are indicators, not guarantees.
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
        <h2>No warranty</h2>
        <p className="mt-3">
          PitchSafe is provided as it is, free of charge, without any warranty. We work to keep it accurate and available but cannot promise it will be error-free or always online. To the extent the law allows, we are not liable for injuries, losses or decisions based on its scores.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p className="mt-3">You can delete your account and all your data at any time from Settings.</p>
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
