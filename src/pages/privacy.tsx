import { CONTACT_EMAIL } from '@/config';
import { LegalPage } from './legal-page';

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="October 12, 2026">
      <section>
        <h2>The short version</h2>
        <p className="mt-3">
          PitchSafe stores the training and health information you enter so it can work out your injury risk. Only you can see it. There are no ads, no ad trackers and no analytics cookies, and your data is never sold. You can download or delete everything at any time from Settings.
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
            <strong>Training sessions:</strong> date, type, duration, effort and any notes you add.
          </li>
          <li>
            <strong>Weekly check-ins:</strong> sleep, soreness, stress and nutrition answers.
          </li>
          <li>
            <strong>Injury history:</strong> body part, type, severity and dates.
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
      </section>

      <section>
        <h2>Cookies</h2>
        <p className="mt-3">PitchSafe uses only the cookies needed to keep you signed in. There are no advertising or analytics cookies, so there is nothing to opt out of.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p className="mt-3">Your data stays until you delete it. Deleting your account in Settings removes your profile, sessions, check-ins, injuries and login straight away. Copies kept in the database's restore history expire within 7 days.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <ul>
          <li>See and download everything we hold about you, from Settings, as a JSON file.</li>
          <li>Correct your data by editing or deleting any entry.</li>
          <li>Delete everything, including your login, from Settings.</li>
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
