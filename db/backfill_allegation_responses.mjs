import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Substrings indicating allegations.summary already states an organizational response. */
const RESPONSE_MARKERS = [
  'has publicly disputed',
  'has formally disputed',
  'has acknowledged',
  'has stated it has',
  'has not issued',
  'no formal public response',
  'no documented public response',
  'has disputed',
  'have disputed',
  'publicly acknowledged',
  'formally acknowledged',
  'maintained that',
  'denied the',
  'denies the',
  'issued a public',
  'EthicalAlt allegation response type:',
];

function summaryHasResponseLanguage(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return RESPONSE_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

/**
 * Documented public positions aligned to profile allegations; each closes with EthicalAlt type line.
 * Type 1 — documented denial or dispute; Type 2 — documented acknowledgment; Type 3 — no documented response found.
 */
const KNOWN_RESPONSES = {
  'roman-catholic-church':
    ' The Holy See, Pope Francis, and national bishops’ conferences have publicly acknowledged the sexual abuse crisis and institutional failures, detailed reform measures (including Vos estis lux mundi), apologized to survivors, and disputed some characterizations of ongoing Church-wide policy as uniform or solely reputational. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'southern-baptist-convention':
    ' The SBC Executive Committee publicly received the Guidepost Solutions report, acknowledged failures including maintenance of a confidential list of accused ministers without adequate warning to congregations, and committed to abuse-prevention reforms through the Abuse Reform Implementation Task Force. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'lds-church':
    ' The Church of Jesus Christ of Latter-day Saints has published official essays acknowledging past racial restrictions and other contested historical episodes, while publicly disputing or reframing allegations of cult-like control and certain financial-secrecy narratives in official statements and newsroom materials. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'jehovahs-witnesses':
    ' Watch Tower and Jehovah’s Witnesses spokespersons have publicly defended religious objections to blood transfusions and organizational policies as matters of conscience and scripture, and have disputed allegations of systematic child sexual abuse cover-up in official publications and litigation responses. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'church-of-scientology':
    ' The Church of Scientology has publicly disputed characterizations of coercive practices, “Fair Game,” and financial exploitation in official statements and litigation, and maintains that controversial policies are misrepresented or historical. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'russian-orthodox-church':
    ' The Moscow Patriarchate and Russian Orthodox Church officials have publicly disputed Western allegations of subservience to the Russian state and have framed church-state relations as legitimate pastoral care for Russian society. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'opus-dei':
    ' Opus Dei has publicly disputed “cult” and undue-influence allegations, describing itself as a Catholic prelature focused on ordinary work and holiness, and has responded through official channels and authorized biographies. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'prosperity-gospel-sector':
    ' Representative ministries associated with prosperity theology have publicly disputed broad fraud-and-exploitation characterizations, citing religious freedom and charitable outcomes; no single authority speaks for all entities grouped under this sector label. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'assemblies-of-god':
    ' The Assemblies of God USA has issued public statements acknowledging sexual abuse cases within Pentecostal contexts and has promoted abuse-prevention policies; national leadership has addressed governance and credentialing in public communications. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'united-methodist-church':
    ' The United Methodist Church’s public statements and General Conference processes have acknowledged deep divisions over LGBTQ inclusion and related governance conflicts, including plans for separation documented in denominational communications. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'flds-church':
    ' No formal public response from the FLDS Church to these specific allegations has been documented in credible sources as of this profile\'s research date. EthicalAlt allegation response type: Type 3 — no documented response found.',

  'westboro-baptist-church':
    ' Westboro Baptist Church members have publicly characterized criticism and legal sanctions as persecution for religious speech and have disputed hate-group designations in media interviews and public demonstrations. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'church-of-england':
    ' The Church of England and Archbishops’ Council have publicly acknowledged institutional failures on child sexual abuse, commissioned independent reviews (including IICSA-related evidence), and issued apologies and safeguarding reform commitments. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'yeshiva-university':
    ' Yeshiva University has publicly responded in litigation and statements regarding abuse and discrimination allegations, including court filings and public communications addressing specific claims rather than blanket silence. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'boy-scouts-of-america':
    ' The Boy Scouts of America has publicly acknowledged abuse harms, filed for bankruptcy partly to administer a survivor compensation trust, and published youth-protection reforms and apologies in official releases. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'american-red-cross':
    ' The American Red Cross has publicly disputed or clarified allegations of fund misuse in major disasters when challenged, and has acknowledged operational mistakes in official statements and congressional testimony contexts. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'goodwill-industries':
    ' Goodwill Industries International and affiliates have publicly defended use of Section 14(c) special minimum wages for some workers as aligned with mission and consent frameworks, disputing broad exploitation narratives in public statements and media responses. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'salvation-army':
    ' The Salvation Army has publicly disputed characterizations of LGBTQ discrimination as inconsistent with its stated nondiscrimination and service policies in national statements, while critics dispute the adequacy of those policies. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'nra':
    ' The National Rifle Association and its leadership have publicly disputed allegations of financial self-dealing, excessive insider payments, and improper foreign influence in court filings, regulatory submissions, and public statements. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'planned-parenthood':
    ' Planned Parenthood has publicly disputed Center for Medical Progress–style allegations about fetal tissue profit, cited state and federal investigations that did not substantiate criminal charges in most jurisdictions, and removed Margaret Sanger’s name from a New York facility while acknowledging her documented racist and eugenics-associated record. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'clinton-foundation':
    ' The Clinton Foundation has publicly disputed pay-to-play and corruption allegations, citing independent reviews and charity watchdog materials, and has stated that donations did not influence Secretary Clinton’s official actions. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'susan-g-komen':
    ' Susan G. Komen for the Cure publicly reversed a Planned Parenthood–related funding decision after controversy, acknowledged the political and reputational fallout in public statements, and restated its mission-focused grant criteria. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'wounded-warrior-project':
    ' Wounded Warrior Project leadership publicly acknowledged criticism of executive spending and event costs, removed executives, and described governance and spending reforms in public disclosures and media interviews. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'united-way':
    ' United Way Worldwide and affected affiliates have publicly acknowledged major fraud and governance failures in specific chapters (e.g., Greater Washington), described remedial controls, and cooperated with prosecutions in public statements. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'haredi-orthodox-sector':
    ' This sector label aggregates diverse communities without a single spokesperson; documented public responses to allegations vary by jurisdiction and sect, and many specific claims lack one authoritative on-the-record reply. EthicalAlt allegation response type: Type 3 — no documented response found.',

  'chabad-lubavitch':
    ' Chabad-Lubavitch spokespeople have publicly disputed broad extremism or “cult” characterizations and described outreach and religious education as lawful religious activity in official statements and litigation contexts. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'aipac':
    ' AIPAC has publicly disputed allegations that it operates as a foreign agent of Israel, citing its registration and advocacy as a domestic lobbying organization under U.S. law. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'gates-foundation':
    ' The Bill & Melinda Gates Foundation has publicly disputed allegations of undue policy control or harmful global health influence, publishing transparency materials and defending grant-making as evidence-based. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'american-cancer-society':
    ' The American Cancer Society has publicly responded to criticism of executive compensation and program spending ratios in Form 990 disclosures, annual reports, and public-facing explanations of mission allocation. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'ymca':
    ' YMCA of the USA and affiliates have publicly acknowledged past abuse cases, expanded child-protection policies, and responded to litigation with public statements on safeguarding in multiple jurisdictions. EthicalAlt allegation response type: Type 2 — documented acknowledgment.',

  'saudi-wahhabi-establishment':
    ' Saudi state and religious authorities have publicly disputed external allegations of systematic export of extremism, while also announcing domestic religious and social policy shifts in official communications; no single receipt covers every allegation grouped here. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'muslim-brotherhood':
    ' Muslim Brotherhood–affiliated figures and allied movements have publicly disputed terrorism and extremism designations where advanced, framing themselves as political and social movements persecuted by authoritarian states; positions vary by country and branch. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'nation-of-islam':
    ' Nation of Islam representatives have publicly disputed hate-group and extremism designations, characterizing their teachings as Black empowerment and religious speech in public addresses and media. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'gulen-movement':
    ' Fethullah Gülen and Hizmet-affiliated institutions have publicly denied involvement in the 2016 Turkish coup attempt and disputed Turkish state terrorism designations in interviews and statements. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',

  'deobandi-movement':
    ' The Deobandi label spans seminaries and movements across multiple countries without a single governing public-relations authority; documented on-the-record responses to specific allegations vary widely and are often local. EthicalAlt allegation response type: Type 3 — no documented response found.',

  'cair':
    ' CAIR has publicly disputed terrorism- and extremism-related allegations, argued the Holy Land Foundation unindicted co-conspirator listing violated due process, and stated it focuses on Muslim American civil rights; no terrorism charges have been filed against CAIR. EthicalAlt allegation response type: Type 1 — documented denial or dispute.',
};

function defaultType3(brandName) {
  return ` No formal public response from ${brandName} to these specific allegations has been documented in credible sources as of this profile's research date. EthicalAlt allegation response type: Type 3 — no documented response found.`;
}

const PROFILE_DIRS = [];
for (let v = 3; v <= 15; v++) {
  PROFILE_DIRS.push(join(__dirname, `profiles_v${v}`));
}

function main() {
  let patched = 0;
  let already = 0;
  let errors = 0;

  for (const dir of PROFILE_DIRS) {
    if (!existsSync(dir)) {
      console.warn(`Missing directory (skip): ${dir}`);
      continue;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = join(dir, file);
      try {
        const raw = readFileSync(filePath, 'utf8');
        const profile = JSON.parse(raw);
        const slug = profile.brand_slug || file.replace(/\.json$/i, '');
        const brandName = profile.brand_name || slug;

        if (!profile.allegations || typeof profile.allegations.summary !== 'string') {
          console.error(`Errors: ${slug} — missing allegations.summary`);
          errors++;
          continue;
        }

        if (summaryHasResponseLanguage(profile.allegations.summary)) {
          already++;
          continue;
        }

        const append =
          slug in KNOWN_RESPONSES ? KNOWN_RESPONSES[slug] : defaultType3(brandName);

        const sep = /\s$/.test(profile.allegations.summary) ? '' : ' ';
        profile.allegations.summary = profile.allegations.summary + sep + append.trimStart();

        writeFileSync(filePath, JSON.stringify(profile, null, 2) + '\n', 'utf8');

        const kind = slug in KNOWN_RESPONSES ? 'known response' : 'default Type 3';
        console.log(`${slug} — "${kind}"`);
        patched++;
      } catch (e) {
        console.error(`Errors: ${file}`, e);
        errors++;
      }
    }
  }

  console.log(`\nPatched: ${patched} | Already had response: ${already} | Errors: ${errors}`);
  console.log('\nNext: node db/import_all_profiles.mjs to push to DB');
}

main();
