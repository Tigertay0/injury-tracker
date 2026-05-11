**PITCHSAFE**

Soccer Injury Risk Management Platform

_Product Requirements Document (PRD)_

| **Version** | 1.0                            |
| ----------- | ------------------------------ |
| **Status**  | Draft - For Engineering Review |
| **Date**    | May 2026                       |

# **1\. Product Overview**

## **1.1 Product Vision**

PitchSafe is a free, evidence-based web application designed to help amateur soccer players monitor and manage their injury risk. The platform implements scientifically validated sports science metrics - primarily the Acute Chronic Workload Ratio (ACWR) - and combines them with equipment compatibility analysis and recovery quality tracking to generate a composite injury risk score with personalized, cited recommendations.

PitchSafe addresses a clear market gap: professional sports organizations use sophisticated (and expensive) workload monitoring tools such as Catapult and STATSports, which are entirely inaccessible to amateur and youth athletes. PitchSafe delivers the core scientific principles of these platforms for free, with no hardware requirements.

## **1.2 Target Users**

- Amateur soccer players aged 14-25
- High school and university soccer team members
- Club-level players without access to professional sports science staff
- Coaches who want a simple, shareable risk overview for their players

## **1.3 Core Problem Statement**

The majority of soccer injuries - particularly ACL tears, ankle sprains, and hamstring strains - are partially preventable through proper training load management and equipment selection. Professional teams have known this for years and invest heavily in monitoring tools. Amateur athletes have access to none of this, and most injure themselves due to preventable factors: overtraining, poor recovery, and mismatched cleat-surface combinations.

## **1.4 Project Scope**

- Platform type: Web application (mobile-responsive)
- Launch target: Single-page web app, progressively enhanced
- Authentication: Optional user accounts for data persistence
- Monetization: None. Free to use, no ads, no paywalls
- Language: English (French translation as stretch goal)

# **2\. Feature Specifications**

## **2.1 Training Load Module - ACWR Calculator**

### **2.1.1 Overview**

The Acute Chronic Workload Ratio (ACWR) is the scientific foundation of PitchSafe. It is a validated sports science metric used by professional teams worldwide to quantify overtraining risk. This module is purely calculated - no AI inference is used here. The math is deterministic and based on published research.

### **2.1.2 Data Inputs**

- Session date
- Session duration (minutes)
- Session RPE - Rate of Perceived Exertion (scale 1-10, with reference guide in UI)
- Session type (match, training, gym, rest)
- Player position (Goalkeeper, Defender, Midfielder, Forward/Winger)

### **2.1.3 Calculation Logic**

**Session Load = Duration (minutes) x RPE score**

Acute Workload = Sum of Session Loads over the past 7 days

Chronic Workload = Average of weekly Session Loads over the past 28 days

**ACWR = Acute Workload / Chronic Workload**

Risk thresholds based on Hulin et al. (2016) and Gabbett (2016):

- ACWR < 0.8 - Undertraining zone (increased injury risk from detraining)
- ACWR 0.8-1.3 - Sweet spot (lowest injury risk)
- ACWR 1.3-1.5 - Caution zone (moderate elevated risk)
- ACWR > 1.5 - Danger zone (significantly elevated injury risk)

### **2.1.4 Edge Cases**

- If chronic workload = 0 (new user, fewer than 4 weeks of data): display ACWR as N/A and prompt user to log more sessions before risk can be calculated
- If a user logs 0 sessions in a week: that week contributes 0 to chronic workload calculation
- Maximum RPE is capped at 10; minimum at 1 - validate on input

### **2.1.5 Position-Specific Risk Weighting**

Each position carries a different base injury profile that adjusts the risk thresholds slightly:

- Goalkeeper: Higher weighting on shoulder/wrist injury risk flags, lower distance-based fatigue weighting
- Defender: Higher ACL and hamstring risk weighting - frequent high-speed directional changes
- Midfielder: Fatigue accumulation weighting - highest total distance per match
- Forward/Winger: Hamstring strain weighting - sprint-dominant movement pattern

## **2.2 Recovery Score Module**

### **2.2.1 Overview**

Recovery quality is equally important as training load in determining injury risk. This module collects a weekly self-reported recovery assessment that contributes to the composite risk score alongside ACWR.

### **2.2.2 Data Inputs (Weekly Questionnaire)**

- Average sleep hours per night this week (numeric input, 0-12)
- Muscle soreness level (1-10 slider)
- Stress level - academic, personal (1-10 slider)
- Perceived nutrition quality (1-10 slider)

### **2.2.3 Recovery Score Calculation**

**Recovery Score = ((Sleep Score + Soreness Score + Stress Score + Nutrition Score) / 4)**

Sleep Score: >= 8hrs = 10, 7hrs = 8, 6hrs = 5, < 6hrs = 2

Soreness Score: inverted (10 - raw soreness score)

Stress Score: inverted (10 - raw stress score)

Nutrition Score: raw score as entered

Recovery Score thresholds:

- 7-10: Good recovery
- 4-6.9: Moderate recovery - training adjustments suggested
- 0-3.9: Poor recovery - significant risk flag

## **2.3 Equipment and Surface Risk Module**

### **2.3.1 Overview**

This module is one of PitchSafe's most distinctive features. Cleat type and playing surface interact in ways that significantly affect injury risk - particularly ACL and ankle sprain risk - and yet this is almost never addressed by free tools available to amateur athletes.

### **2.3.2 Data Inputs**

- Cleat type: Firm Ground Bladed (FG-B), Firm Ground Conical (FG-C), Artificial Ground (AG), Soft Ground (SG), Multi-Ground (MG), Indoor (IN)
- Playing surface: Natural Grass Good, Natural Grass Poor, 3G Artificial Turf, 2G Artificial Turf, Hard Ground, Indoor Court

### **2.3.3 Risk Interaction Matrix**

The following matrix determines the Equipment Risk Level output:

| **Cleat Type** | **Natural Grass (Good)** | **Natural Grass (Poor)** | **3G Artificial Turf** | **2G Artificial Turf** | **Hard Ground** |
| -------------- | ------------------------ | ------------------------ | ---------------------- | ---------------------- | --------------- |
| **FG Bladed**  | LOW                      | MEDIUM                   | HIGH                   | VERY HIGH              | VERY HIGH       |
| **FG Conical** | LOW                      | MEDIUM                   | HIGH                   | HIGH                   | VERY HIGH       |
| **AG**         | MEDIUM                   | MEDIUM                   | LOW                    | LOW                    | HIGH            |
| **SG**         | LOW                      | LOW                      | VERY HIGH              | VERY HIGH              | VERY HIGH       |
| **MG**         | MEDIUM                   | MEDIUM                   | MEDIUM                 | MEDIUM                 | HIGH            |
| **Indoor**     | HIGH                     | HIGH                     | HIGH                   | HIGH                   | MEDIUM          |

Scientific basis: Increased rotational traction from FG cleats on artificial turf is a well-documented ACL risk factor (Livesay et al., 2006; Meyers & Barnhill, 2004). AG cleats are specifically engineered to reduce this effect.

## **2.4 Injury History Tracker**

### **2.4.1 Overview**

Previous injury is the single strongest predictor of future injury in soccer. This module allows users to log their injury history and receive adjusted risk scores that account for re-injury vulnerability.

### **2.4.2 Data Inputs**

- Body part affected (from predefined list with body diagram selector)
- Injury type (strain, sprain, fracture, tear, contusion, other)
- Severity (mild - returned in &lt; 1 week, moderate - 1-4 weeks, severe - &gt; 4 weeks)
- Date of injury
- Date of return to full training

### **2.4.3 Risk Adjustment Logic**

- ACL tear history: composite risk score multiplied by 1.4 (40% elevated re-injury risk)
- Ankle sprain history (severe): composite risk score multiplied by 1.25
- Hamstring strain history: composite risk score multiplied by 1.2
- Any injury within past 6 weeks: composite risk score multiplied by 1.3
- Multipliers are additive up to a maximum cap of 2.0x

## **2.5 Composite Risk Score**

### **2.5.1 Calculation**

The Composite Risk Score combines all three modules into a single 0-100 score:

**Composite Score = (ACWR Risk Score x 0.45) + (Recovery Risk Score x 0.30) + (Equipment Risk Score x 0.25)**

Module score conversions:

- ACWR Risk: Sweet spot = 10, Caution = 50, Danger = 85, Undertraining = 40
- Recovery Risk: Good = 10, Moderate = 45, Poor = 80
- Equipment Risk: Low = 5, Medium = 40, High = 75, Very High = 95

After base calculation, apply injury history multipliers (capped at 2.0x total).

Final thresholds:

- 0-30: Green - Low Risk
- 31-59: Yellow - Moderate Risk
- 60-79: Orange - High Risk
- 80-100: Red - Very High Risk

## **2.6 Personalized Training Recommendations**

### **2.6.1 Overview**

Based on the composite risk score, player position, and individual module scores, PitchSafe generates specific, actionable training adjustment recommendations. These are rule-based outputs - not AI-generated - built from conditional logic referencing published sports science guidelines.

### **2.6.2 Recommendation Categories**

- Training volume adjustments (session frequency and duration)
- Intensity distribution (high vs low intensity session ratios)
- Recovery day recommendations
- Position-specific drill modifications
- Equipment change warnings (if cleat-surface mismatch detected)

### **2.6.3 Example Rule Logic**

IF ACWR > 1.5 AND position = Midfielder:

- Reduce total weekly distance by 20-25%
- Replace one high-intensity session with low-intensity technical work
- Ensure minimum 48 hours between high-intensity sessions
- Citation: Malone et al. (2017) - elite soccer workload management

IF Equipment Risk = VERY HIGH:

- Display urgent warning banner before rest of recommendations
- Specific cleat change recommendation with explanation of risk mechanism

## **2.7 Nutritional Recovery Awareness Module**

### **2.7.1 Framing and Disclaimer**

IMPORTANT: This module provides general evidence-based nutritional awareness information for athletes, not personalized dietary advice. A mandatory disclaimer is displayed prominently before all nutritional content: 'The following are general nutritional principles for soccer athletes based on published sports science research. Individual needs vary significantly. Consult a registered sports nutritionist or dietitian for personalized guidance.'

### **2.7.2 Content Logic**

Nutritional content is triggered by risk level and recovery score:

- High training load (ACWR > 1.3): Carbohydrate replenishment information, glycogen depletion explanation, protein timing guidance
- Poor recovery score (< 4): Sleep and nutrition interaction, anti-inflammatory food awareness, hydration impact on performance
- Post-match or high-intensity session logged: Post-exercise recovery nutrition window information

All nutritional statements are cited to peer-reviewed sports nutrition literature (e.g., Burke et al., Thomas et al. 2016 - International Society of Sports Nutrition Position Stand).

## **2.8 Coach PDF Report**

### **2.8.1 Overview**

Users can generate and download a PDF summary of their current risk profile, shareable with a coach or trainer.

### **2.8.2 PDF Contents**

- Player name and position
- Report generation date
- Current ACWR score and trend graph (last 4 weeks)
- Recovery score
- Equipment risk level and current cleat/surface combination
- Composite risk score with color indicator
- Top 3 personalized recommendations
- Methodology note and limitations disclaimer

### **2.8.3 Technical Implementation**

PDF generation using jsPDF or Puppeteer (server-side rendering preferred for consistent formatting). PDF is generated client-side to avoid storing sensitive health data on servers unnecessarily.

# **3\. AI Integration - Recommendation Intelligence**

## **3.1 What Uses AI vs. What Uses Rules**

The majority of PitchSafe's calculations are deterministic and rule-based. AI is NOT used for ACWR calculation, recovery scoring, equipment risk matrix, or composite score calculation. These are mathematical formulas with clear scientific basis and must be reproducible and auditable.

AI IS used for one specific function: generating natural language, context-aware recommendation narratives that explain the risk factors in plain language and provide nuanced, personalized guidance that static rule trees cannot easily replicate.

## **3.2 Recommended AI: Claude API (Anthropic)**

### **3.2.1 Recommended Model**

claude-sonnet-4-20250514 - optimal balance of reasoning quality and API cost for this use case.

### **3.2.2 Why Claude Over Alternatives**

- Superior instruction-following: Claude reliably stays within defined scope boundaries - critical for ensuring it never outputs medical advice beyond the defined framing
- Citation handling: Claude can be prompted to reference specific literature and maintain consistent citation format
- Safety alignment: Claude's training makes it naturally cautious about medical claims - aligns with PitchSafe's liability requirements
- Cost: Claude Sonnet is competitively priced for this call frequency (one API call per risk report generation, not per interaction)

### **3.2.3 When the API is Called**

The AI API is called once per report generation - when the user clicks 'Generate My Risk Report'. It is NOT called on every page load, every form input, or in real-time. This minimizes API costs and latency.

### **3.2.4 Prompt Structure**

The API call sends a structured system prompt plus a user data payload:

**System Prompt (fixed, never changes):**

_You are a sports science assistant for PitchSafe, a soccer injury risk tool. Your role is to explain risk factors and training recommendations in plain, encouraging language for amateur soccer players aged 14-25. You must: (1) Never provide medical diagnoses or treatment advice, (2) Always recommend consulting a professional for pain or injury, (3) Base all recommendations on the data provided, (4) Keep responses under 300 words, (5) Use encouraging, non-alarmist tone, (6) Reference the scientific basis of recommendations without being academic._

**User Data Payload (dynamic, per user):**

_Structured JSON containing: ACWR score and trend, recovery score breakdown, equipment risk level and cleat/surface combination, player position, composite risk score, injury history flags, and the rule-based recommendations already generated._

### **3.2.5 API Response Handling**

- Response is displayed as the 'personalized insight' narrative section of the dashboard
- Response is cached for 24 hours per user - same data does not trigger a new API call within 24 hours
- If API call fails: fall back to rule-based recommendation text only - app remains fully functional without AI
- Maximum tokens: 400 per response

### **3.2.6 API Key Security**

- API key is stored as a server-side environment variable only - NEVER exposed to client-side JavaScript
- All Claude API calls are proxied through a backend endpoint (/api/generate-insight)
- Rate limiting: maximum 10 API calls per user per day to prevent abuse
- API key rotation policy: rotate every 90 days

# **4\. Backend Architecture**

## **4.1 Recommended Stack**

| **Backend Technology Stack** | |
| --- | | --- |
| **Runtime** | Node.js with Express.js |
| **Database** | PostgreSQL (primary data store) |
| **ORM** | Prisma (type-safe database access) |
| **Authentication** | Auth0 or Clerk (managed auth, reduces security burden) |
| **Hosting** | Railway or Render (simple deployment, free tier available) |
| **PDF Generation** | Puppeteer (server-side, consistent rendering) |
| **AI Proxy** | Internal Express route proxying to Anthropic API |
| **Environment** | dotenv for local, platform secrets manager for production |

## **4.2 Database Schema**

### **4.2.1 Users Table**

- id (UUID, primary key)
- email (encrypted, unique)
- created_at (timestamp)
- position (enum: GK, DEF, MID, FWD)
- cleat_type (enum)
- surface_type (enum)
- data_consent (boolean, required true before any data storage)
- last_active (timestamp)

### **4.2.2 Training Sessions Table**

- id (UUID, primary key)
- user_id (foreign key)
- session_date (date)
- duration_minutes (integer)
- rpe (integer 1-10)
- session_type (enum: match, training, gym, rest)
- session_load (computed: duration x rpe, stored for performance)
- created_at (timestamp)

### **4.2.3 Recovery Logs Table**

- id (UUID, primary key)
- user_id (foreign key)
- week_start_date (date)
- sleep_hours (decimal)
- soreness_score (integer 1-10)
- stress_score (integer 1-10)
- nutrition_score (integer 1-10)
- recovery_score (computed, stored)
- created_at (timestamp)

### **4.2.4 Injury History Table**

- id (UUID, primary key)
- user_id (foreign key)
- body_part (enum)
- injury_type (enum)
- severity (enum: mild, moderate, severe)
- injury_date (date)
- return_date (date, nullable)
- created_at (timestamp)

### **4.2.5 Risk Reports Table**

- id (UUID, primary key)
- user_id (foreign key)
- generated_at (timestamp)
- acwr_score (decimal)
- recovery_score (decimal)
- equipment_risk_level (enum)
- composite_score (decimal)
- ai_narrative (text, cached response from Claude API)
- ai_generated_at (timestamp, for 24hr cache invalidation)

## **4.3 API Endpoints**

| **Core API Endpoints** | |
| --- | | --- |
| **POST /api/auth/register** | Create new user account with consent capture |
| **POST /api/auth/login** | Authenticate user, return session token |
| **POST /api/sessions** | Log a new training session |
| **GET /api/sessions** | Retrieve sessions for ACWR calculation (last 28 days) |
| **POST /api/recovery** | Submit weekly recovery questionnaire |
| **GET /api/recovery/latest** | Get most recent recovery log |
| **POST /api/injuries** | Log an injury history entry |
| **GET /api/injuries** | Retrieve all injury history for user |
| **GET /api/risk/calculate** | Compute full composite risk score |
| **POST /api/insight/generate** | Proxy call to Claude API for narrative |
| **GET /api/report/pdf** | Generate and return coach PDF report |
| **DELETE /api/user/data** | Full data deletion (GDPR right to erasure) |

# **5\. Data Protection and Privacy**

## **5.1 Regulatory Framework**

PitchSafe handles health-related data (training logs, injury history, recovery metrics) which is classified as sensitive personal data under GDPR Article 9. Full GDPR compliance is required. If users from the UK are anticipated, UK GDPR compliance is also required. The following data protection architecture is mandatory.

## **5.2 Data Minimization**

- Only data strictly necessary for risk calculation is collected
- No real names required - users may use a pseudonym or first name only
- No location data collected
- No device fingerprinting
- No third-party analytics (no Google Analytics, no Meta Pixel)

## **5.3 Consent Architecture**

- Explicit, informed consent is required before any personal data is stored - a checkbox with clear plain-language explanation, not buried in terms of service
- Consent is granular: users consent separately to (a) account data, (b) training/health data, (c) optional email communications
- Consent records are stored with timestamp and consent text version
- Users can withdraw consent at any time, triggering full data deletion

## **5.4 Encryption**

- All data in transit: TLS 1.3 minimum
- All data at rest: AES-256 encryption at database level
- Email addresses: encrypted before storage using a server-side encryption key stored separately from the database
- Health data fields (injury history, recovery scores): field-level encryption as additional layer

## **5.5 Authentication Security**

- Passwords: never stored in plaintext - hashed with bcrypt (minimum 12 rounds) if building custom auth
- Recommended: use Auth0 or Clerk to offload authentication security entirely to a specialized provider
- Session tokens: JWT with 24-hour expiry, refresh token rotation
- Rate limiting on login endpoint: maximum 5 failed attempts before temporary lockout
- CSRF protection on all state-changing endpoints

## **5.6 GDPR Rights Implementation**

| **GDPR Rights** | |
| --- | | --- |
| **Right to Access** | GET /api/user/export - returns full JSON of all user data within 72 hours |
| **Right to Erasure** | DELETE /api/user/data - hard deletion of all records within 30 days |
| **Right to Rectification** | PUT endpoints for all user-editable data fields |
| **Right to Portability** | Data export in machine-readable JSON format |
| **Right to Object** | Users can disable AI processing of their data while retaining rule-based features |

## **5.7 Data Retention Policy**

- Active user data: retained for duration of account
- Inactive accounts (no login for 12 months): automated deletion warning email, then deletion after 30 days
- Deleted account data: fully purged within 30 days of deletion request
- Anonymized aggregate data (no personal identifiers): may be retained indefinitely for product improvement

## **5.8 Third-Party Data Sharing**

- No user data is shared with any third party except: (a) Claude API - only the computed risk scores and anonymized data fields are sent, never PII such as email or name, (b) Hosting provider - standard data processing agreement required
- Claude API data minimization: the payload sent to Anthropic contains only ACWR score, recovery score, equipment risk level, position, composite score, and risk flags - no name, email, or directly identifying information

## **5.9 Minor Users**

Given the target demographic includes users aged 14+, special consideration is required:

- Users under 16 must provide parental consent (GDPR Article 8) - a parental consent flow must be implemented
- Users under 18 are flagged in the system and their data receives additional protection restrictions
- Marketing communications are disabled entirely for users under 18

# **6\. Non-Functional Requirements**

## **6.1 Performance**

- Page load time: < 2 seconds on standard 4G connection
- Risk calculation response: < 500ms (server-side computation)
- AI narrative generation: < 8 seconds (Claude API latency), with loading indicator
- PDF generation: < 10 seconds

## **6.2 Availability**

- Target uptime: 99.5% (acceptable for a non-critical wellness tool)
- Graceful degradation: if Claude API is unavailable, full functionality is maintained using rule-based recommendations only - the AI narrative section displays a fallback message
- Offline handling: if user loses connection mid-session, form data is preserved in browser localStorage temporarily

## **6.3 Accessibility**

- WCAG 2.1 AA compliance minimum
- All color-coded risk indicators must also use text labels and icons (not color alone)
- Screen reader compatible
- Keyboard navigable

## **6.4 Mobile Responsiveness**

- Full functionality on mobile devices - many users will log sessions on their phone immediately after training
- Touch-friendly sliders for RPE and recovery inputs
- Minimum tap target size: 44x44px

# **7\. Limitations and Disclaimer Requirements**

## **7.1 Mandatory Platform Disclaimers**

The following disclaimer must appear prominently on the dashboard, the about page, and within the PDF report. It is not optional and must not be hidden or minimized:

_PitchSafe is an educational awareness tool, not a medical device or diagnostic service. Risk scores are based on self-reported data and published sports science models - they are indicators, not guarantees. Individual injury risk varies significantly based on factors this tool cannot measure. If you experience pain, discomfort, or suspect injury, stop training and consult a qualified medical professional or physiotherapist. Do not use PitchSafe as a substitute for professional medical advice._

## **7.2 Known Technical Limitations**

- ACWR model limitations: The ACWR model has been critiqued in recent literature for not fully accounting for individual athlete differences (Drew & Finch, 2016). PitchSafe acknowledges this on the methodology page.
- Self-reported data: RPE and recovery scores are subjective and subject to user bias
- No biomechanical data: Without wearable sensors or motion capture, true movement risk factors cannot be assessed
- No clinical validation: PitchSafe has not been clinically validated against actual injury outcomes

## **7.3 What a Production-Grade Solution Would Require**

PitchSafe explicitly documents on its platform what a proper clinical solution would require beyond this prototype:

- Wearable GPS and accelerometer sensors for objective load measurement
- Motion capture or video analysis for biomechanical risk assessment
- Integration with team medical staff systems
- Large-scale longitudinal dataset of athlete injury outcomes for model validation
- Clinical validation study with sports medicine professionals

# **8\. Scientific Citations**

All recommendations and calculations in PitchSafe are based on the following peer-reviewed literature. These must be referenced on the platform's methodology page:

- Hulin, B.T., Gabbett, T.J., Lawson, D.W., Caputi, P. & Sampson, J.A. (2016). The acute:chronic workload ratio predicts injury: high chronic workload may decrease injury risk in elite rugby league players. British Journal of Sports Medicine, 50(4), 231-236.
- Gabbett, T.J. (2016). The training-injury prevention paradox: should athletes be training smarter and harder? British Journal of Sports Medicine, 50(5), 273-280.
- Malone, S., Hughes, B., Doran, D.A., Collins, K. & Gabbett, T.J. (2019). Can the workload-injury relationship be moderated by improved strength, speed and repeated-sprint qualities? Journal of Science and Medicine in Sport, 22(1), 29-34.
- Livesay, G.A., Reda, D.R. & Nauman, E.A. (2006). Peak torque and rotational stiffness developed at the shoe-surface interface. The American Journal of Sports Medicine, 34(3), 415-422.
- Meyers, M.C. & Barnhill, B.S. (2004). Incidence, causes, and severity of high school football injuries on FieldTurf versus natural grass. The American Journal of Sports Medicine, 32(7), 1626-1638.
- Drew, M.K. & Finch, C.F. (2016). The relationship between training load and injury, illness and soreness: a systematic and literature review. Sports Medicine, 46(6), 861-883.
- Thomas, D.T., Erdman, K.A. & Burke, L.M. (2016). Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. Journal of the Academy of Nutrition and Dietetics, 116(3), 501-528.

# **9\. Success Metrics**

The following metrics define what a successful launch looks like for PitchSafe:

| **Key Success Metrics** | |
| --- | | --- |
| **User Adoption** | 50+ registered users within first month of launch (via team outreach) |
| **Engagement** | Average user logs at least 2 sessions per week |
| **Retention** | 40%+ of users still active after 4 weeks |
| **PDF Reports** | 30%+ of users generate at least one coach report |
| **Feedback** | Average satisfaction score of 7+/10 from user survey |
| **Reliability** | Zero critical data loss incidents in first 6 months |

# **10\. Development Phases**

## **Phase 1 - MVP (Weeks 1-6)**

- Training session logging form
- ACWR calculation and display
- Basic risk color indicator
- Equipment and surface risk matrix
- Static rule-based recommendations
- User accounts and data persistence

## **Phase 2 - Core Features (Weeks 7-10)**

- Recovery score module
- Injury history tracker
- Composite risk score
- ACWR trend line chart (Chart.js)
- Body diagram risk visualization
- Position-specific recommendations

## **Phase 3 - Enhanced Features (Weeks 11-14)**

- Claude API integration for narrative recommendations
- Nutritional recovery awareness module
- Coach PDF report generation
- Methodology and limitations pages
- Mobile optimization pass

## **Phase 4 - Polish and Testing (Weeks 15-16)**

- User testing with 10+ real athletes
- Bug fixes based on testing feedback
- GDPR compliance audit
- Performance optimization
- Development blog documentation

_PitchSafe PRD v1.0 - Confidential - For Engineering Team Use Only_