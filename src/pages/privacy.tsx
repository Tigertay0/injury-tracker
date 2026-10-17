import { CONTACT_EMAIL } from '@/config';
import { LegalPage } from './legal-page';

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="October 17, 2026">
      <section>
        <h2>The short version</h2>
        <p className="mt-3">
          PitchSafe stores the training and health information you enter so it can work out your injury risk. Only you can see it. There are no ads, no ad trackers and no analytics cookies, and your data is never sold. You can download or delete your PitchSafe data at any time from Settings.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Login details:</strong> your email address, and your password or Google sign-in, handled by our login provider.
          </li>
          <li>
            <strong>Profile:</strong> your position, an optional display name, your cleat type and usual surface, and when you agreed to these terms.
          </li>
          <li>
            <strong>Training sessions:</strong> date, type, duration, effort, any notes and any drills you add.
          </li>
          <li>
            <strong>Weekly check-ins:</strong> sleep, soreness, stress and nutrition answers.
          </li>
          <li>
            <strong>Injury history:</strong> body part, type, severity and dates.
          </li>
          <li>
            <strong>Custom drills (PitchSafe Plus):</strong> each drill's name, description and movement profile, and whether an AI estimated the profile.
          </li>
          <li>
            <strong>AI estimate count (PitchSafe Plus):</strong> how many AI estimates you asked for each day, to limit use.
          </li>
        </ul>
        <p className="mt-3">We do not ask for your real name, location, date of birth or contacts.</p>
      </section>

      <section>
        <h2>Who handles it</h2>
        <ul>
          <li>
            <strong>Clerk</strong> runs sign-in and stores your login details.
          </li>
          <li>
            <strong>Neon</strong> hosts the database with your PitchSafe data. Database rules tie every record to your login so no other player can read it.
          </li>
          <li>
            <strong>Cloudflare</strong> serves the website and the app's server, connects it to the database, and keeps short-lived technical logs to keep the service running and secure.
          </li>
        </ul>
        <p className="mt-3">Each acts only on our instructions to run PitchSafe. Coach reports are made on your own device and are only shared if you send them.</p>
        <p className="mt-3">
          Payments for PitchSafe Plus run through <strong>Clerk Billing</strong> and <strong>Stripe</strong>. Stripe handles payments under its own privacy policy. PitchSafe never sees your full card number.
        </p>
      </section>

      <section>
        <h2>AI drill estimates (PitchSafe Plus)</h2>
        <p className="mt-3">
          If you have PitchSafe Plus and ask for an AI estimate, the drill's name and description are sent to Anthropic. Anthropic runs Claude, which reads that text and returns an estimate of the drill's movement profile. This happens only when you ask.
        </p>
        <p className="mt-3">Nothing else is sent: not your name, your health data or your account id. Don't put personal details in a drill's name or description.</p>
        <p className="mt-3">To limit use, PitchSafe stores a count of your estimates for each day (UTC). You can ask for up to 20 a day. The count is deleted with your account.</p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p className="mt-3">PitchSafe uses only the cookies needed to keep you signed in. There are no advertising or analytics cookies, so there is nothing to opt out of.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p className="mt-3">
          Your data stays until you delete it. Deleting your account in Settings removes your profile, sessions, check-ins, injuries, custom drills and login straight away. Copies kept in the database's restore history expire within 7 days.
        </p>
        <p className="mt-3">When you remove a custom drill, it is archived so past sessions that used it keep its name and load. Archived drills are deleted with your account.</p>
        <p className="mt-3">
          If you have PitchSafe Plus, cancel it in Settings before you delete your account. Payment records are kept by Stripe and Clerk Billing under their own policies.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <ul>
          <li>See and download your data, including your custom drills, from Settings, as a JSON file.</li>
          <li>Correct your data by editing or deleting entries. Custom drills can't be edited; removing one archives it until you delete your account.</li>
          <li>Delete your PitchSafe data and your login from Settings. If you have PitchSafe Plus, cancel it in Settings first. Payment records are kept by Stripe and Clerk Billing under their own policies.</li>
          <li>Withdraw consent at any time by deleting your account.</li>
        </ul>
      </section>

      <section>
        <h2>Age</h2>
        <p className="mt-3">You must be 13 or older to create an account.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p className="mt-3">
          If this policy changes, the date at the top changes too, and important changes are shown in the app.
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
