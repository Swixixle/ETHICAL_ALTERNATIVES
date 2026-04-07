import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const w = (slug, obj) => {
  mkdirSync(join(__dirname, 'boards'), { recursive: true });
  writeFileSync(join(__dirname, 'boards', slug + '.json'), JSON.stringify(obj, null, 2));
  console.log('  ✓ ' + slug);
};

console.log('\n=== Writing religious institution board files ===');

w('roman-catholic-church', {
  "brand_slug": "roman-catholic-church",
  "members": [
    {
      "person_slug": "bernard-cardinal-law",
      "full_name": "Cardinal Bernard Francis Law",
      "role": "Archbishop of Boston",
      "tenure_start": "1984",
      "tenure_end": "2002",
      "is_current": false,
      "committees": ["US Conference of Catholic Bishops"],
      "present_during": ["boston_clergy_abuse_cover_up_1984_2002"],
      "departure_reason": "Resigned — Boston Globe Spotlight investigation",
      "departure_context": "Law resigned as Archbishop of Boston on December 13, 2002, after the Boston Globe's Spotlight team documented that he had systematically transferred known abuser priests to new parishes where they reoffended rather than reporting them to law enforcement. A grand jury found probable cause to indict Law for covering up abuse but could not proceed due to his clerical status. Law fled to Rome, where Pope John Paul II appointed him Archpriest of the Basilica of Santa Maria Maggiore — a senior Vatican position he held until his death in 2017. He was never prosecuted. He received full cardinal honors at his death.",
      "revolving_door": true,
      "revolving_door_note": "Archbishop of Boston who covered up abuse → fled to Rome → appointed to senior Vatican position protected by sovereign immunity → died with full honors. Vatican sovereignty provided complete prosecutorial protection.",
      "other_boards": [],
      "prior_government": false,
      "notes": "Grand jury found probable cause to indict. Never prosecuted. Died 2017 in Rome with full Vatican honors. His transfer of abuser priests created new victims in each receiving parish.",
      "sources": ["https://www.bostonglobe.com/arts/movies/spotlight/"]
    },
    {
      "person_slug": "roger-cardinal-mahony",
      "full_name": "Cardinal Roger Mahony",
      "role": "Archbishop of Los Angeles",
      "tenure_start": "1985",
      "tenure_end": "2011",
      "is_current": false,
      "committees": ["US Conference of Catholic Bishops"],
      "present_during": ["la_archdiocese_abuse_cover_up"],
      "departure_reason": "Retired at mandatory retirement age",
      "departure_context": "Internal Church memos released in 2013 — after Mahony had retired — showed he had strategically transferred accused priests out of California to avoid mandatory reporting laws, and had coached subordinates on how to handle abuse allegations to minimize legal exposure. LA Archbishop José Gomez stripped Mahony of his public duties in January 2013 after the memos' release — an unprecedented rebuke of a retired cardinal. Mahony retained his voting rights in the College of Cardinals and voted in the 2013 conclave that elected Pope Francis.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Memos showed strategic transfer of priests out of California to avoid reporting laws. Stripped of public duties by successor — unprecedented. Retained cardinal voting rights. Voted in 2013 papal conclave.",
      "sources": ["https://www.latimes.com/local/la-me-mahony-files-20130122-story.html"]
    },
    {
      "person_slug": "george-cardinal-pell",
      "full_name": "Cardinal George Pell",
      "role": "Archbishop of Melbourne, then Sydney; Vatican Prefect of Secretariat for Economy",
      "tenure_start": "1996",
      "tenure_end": "2023",
      "is_current": false,
      "committees": ["Council for the Economy", "C9 Council of Cardinals"],
      "present_during": ["australia_clergy_abuse_royal_commission","vatican_financial_reform"],
      "departure_reason": "Died January 2023",
      "departure_context": "Pell was convicted in Australia in December 2018 of sexually abusing two 13-year-old choir boys in 1996 — sentenced to six years. The conviction was overturned by the Australian High Court in April 2020 on the grounds of reasonable doubt — not exoneration. The Royal Commission into Institutional Responses to Child Sexual Abuse found Pell had known about abusive priest Gerald Ridsdale and had failed to act. Pell was separately one of the most senior Vatican financial reformers as Prefect of the Secretariat for Economy. He died in Rome in January 2023 days after publishing a diary that characterized his conviction as a political attack.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Convicted 2018, overturned 2020 on reasonable doubt not exoneration. Royal Commission separately found he knew of abuser Ridsdale and failed to act. Died 2023.",
      "sources": ["https://www.childabuseroyalcommission.gov.au"]
    },
    {
      "person_slug": "theodore-cardinal-mccarrick",
      "full_name": "Cardinal Theodore McCarrick",
      "role": "Archbishop of Washington DC",
      "tenure_start": "2000",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["US Conference of Catholic Bishops"],
      "present_during": ["mccarrick_abuse_period","us_political_catholicism"],
      "departure_reason": "Laicized — removed from priesthood",
      "departure_context": "McCarrick was the first cardinal in modern Church history to be laicized (removed from the priesthood) for sexual abuse — formally defrocked by Pope Francis in February 2019. He had abused seminarians and minors over decades. A Vatican investigation found Pope John Paul II had been warned about McCarrick's conduct before appointing him to Washington and elevated him to cardinal anyway. McCarrick was a prominent political figure — dined with presidents, advised on Vatican-US relations — whose influence protected him for decades.",
      "revolving_door": true,
      "revolving_door_note": "Archbishop of Washington → political adviser to presidents and Vatican → laicized for abuse. Vatican investigation found JPII warned before appointment and elevated him anyway. Political influence enabled decades of protection.",
      "other_boards": [],
      "prior_government": false,
      "notes": "First cardinal laicized for abuse in modern history. Vatican investigation confirmed JPII warned before appointment. Political connections with multiple US presidents documented.",
      "sources": ["https://www.vatican.va/resources/resources_rapporto-card-mccarrick_20201110_en.html"]
    },
    {
      "person_slug": "angelo-cardinal-becciu",
      "full_name": "Cardinal Angelo Becciu",
      "role": "Substitute for General Affairs of the Secretariat of State; Prefect of Congregation for Saints' Causes",
      "tenure_start": "2011",
      "tenure_end": "2020",
      "is_current": false,
      "committees": ["Secretariat of State"],
      "present_during": ["vatican_london_real_estate_scandal","vatican_financial_mismanagement"],
      "departure_reason": "Resigned — financial investigation; subsequently convicted",
      "departure_context": "Becciu was the highest-ranking Vatican official to face criminal prosecution in modern history. He was convicted by the Vatican City State court in December 2023 of embezzlement and abuse of office — primarily related to the Vatican's disastrous investment in a London luxury real estate development that lost approximately €200 million of Vatican funds. He was sentenced to 5.5 years and fined €8,000. Becciu had also directed Vatican funds to his brother's cooperative in Sardinia. Pope Francis stripped Becciu of his cardinal rights in September 2020 — another unprecedented action — before charges were filed.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "First senior cardinal convicted of financial crimes in modern Vatican history. 5.5 year sentence. €200M London real estate loss. Pope Francis stripped cardinal rights pre-trial — unprecedented.",
      "sources": ["https://www.reuters.com/world/europe/vatican-court-convicts-cardinal-becciu-other-defendants-2023-12-16/"]
    },
    {
      "person_slug": "rembert-weakland",
      "full_name": "Archbishop Rembert Weakland",
      "role": "Archbishop of Milwaukee",
      "tenure_start": "1977",
      "tenure_end": "2002",
      "is_current": false,
      "committees": ["US Conference of Catholic Bishops"],
      "present_during": ["milwaukee_abuse_cover_up","weakland_personal_scandal"],
      "departure_reason": "Resigned — personal sexual misconduct and cover-up",
      "departure_context": "Weakland resigned in May 2002 after it was revealed that the Archdiocese of Milwaukee had paid $450,000 in 1998 to a man who claimed Weakland had sexually assaulted him. The payment was made from archdiocesan funds — donor money — to silence the claim. Separately, the Milwaukee Archdiocese under Weakland had documented the most egregious single case of clergy abuse cover-up in the US — decades of abuse by Lawrence Murphy at a school for deaf children, where Murphy abused up to 200 deaf boys and was never reported to police, and where Vatican officials including Cardinal Ratzinger (later Pope Benedict XVI) were informed and took no action for years.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "$450,000 archdiocesan funds paid to silence personal assault claim. Lawrence Murphy abused 200 deaf children under his watch; Vatican informed; no police report. Ratzinger/Benedict implicated in delayed response.",
      "sources": ["https://www.nytimes.com/2010/03/25/world/europe/25pope.html"]
    }
  ],
  "connections": [
    {
      "person_slug": "bernard-cardinal-law",
      "brand_slug_a": "roman-catholic-church",
      "brand_slug_b": "roman-catholic-church",
      "overlap_start": "1984",
      "overlap_end": "2017",
      "pattern_type": "revolving_door",
      "description": "Law covered up abuse in Boston, resigned to avoid prosecution, was appointed to a senior Vatican position protected by sovereign immunity, and died with full honors in Rome. Vatican sovereignty functioned as prosecutorial protection for a bishop who had enabled documented harm to hundreds of children.",
      "significance": "The most documented case of a religious institution using sovereign status to shield a leadership figure from criminal accountability for institutional misconduct."
    },
    {
      "person_slug": "theodore-cardinal-mccarrick",
      "brand_slug_a": "roman-catholic-church",
      "brand_slug_b": "roman-catholic-church",
      "overlap_start": "2000",
      "overlap_end": "2019",
      "pattern_type": "revolving_door",
      "description": "McCarrick's political influence — as a diplomatic asset in Vatican-US relations — protected him from accountability for documented abuse of seminarians and minors for decades. The Vatican's own investigation found the pattern of protection was deliberate.",
      "significance": "Political influence operated as an institutional protection mechanism for documented abuse within the Church's most elite diplomatic circles."
    }
  ]
});

w('southern-baptist-convention', {
  "brand_slug": "southern-baptist-convention",
  "members": [
    {
      "person_slug": "ronnie-floyd",
      "full_name": "Ronnie Floyd",
      "role": "President and CEO, SBC Executive Committee",
      "tenure_start": "2019",
      "tenure_end": "2021",
      "is_current": false,
      "committees": ["Executive Committee"],
      "present_during": ["guidepost_investigation_period","abuse_reform_resistance"],
      "departure_reason": "Resigned amid Executive Committee crisis",
      "departure_context": "Floyd led the SBC Executive Committee during the period when — per the Guidepost Solutions investigation — EC leaders most actively resisted the creation of an independent investigation into sexual abuse. Floyd and the EC initially claimed attorney-client privilege to resist cooperating with the investigation — a position ultimately rejected by the SBC's messengers (members) in a floor vote. The Guidepost report found that EC leaders during Floyd's tenure misled SBC members about the extent of their knowledge of abuse. Floyd resigned in September 2021 as the EC crisis escalated.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "EC claimed attorney-client privilege to block investigation. Guidepost found EC misled members during his tenure. Resigned 2021 as crisis escalated.",
      "sources": ["https://www.sataskforce.net/updates/guidepost-solutions-report"]
    },
    {
      "person_slug": "paige-patterson",
      "full_name": "Paige Patterson",
      "role": "President, Southwestern Baptist Theological Seminary; former SBC President",
      "tenure_start": "2003",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["SBC Presidency 1998-2000"],
      "present_during": ["patterson_seminary_abuse_mishandling","conservative_resurgence"],
      "departure_reason": "Fired — mishandling of sexual abuse reports",
      "departure_context": "Patterson was fired as Southwestern Seminary president in May 2018 after documents emerged showing he had discouraged a seminary student from reporting rape to police, had instructed another woman to meet with her alleged abuser alone, and had kept a documented abuser on seminary staff. Additionally, recorded audio emerged of Patterson describing in graphic terms how he appreciated the physical appearance of a 16-year-old girl. Patterson had led the SBC's conservative resurgence — a theological realignment that concentrated power in a leadership culture that the Guidepost report later found resistant to abuse accountability.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Fired 2018. Discouraged rape reporting to police. Kept documented abuser on staff. Graphic comments about 16-year-old documented. Led the conservative resurgence that shaped SBC power structure.",
      "sources": []
    },
    {
      "person_slug": "russell-moore-sbc",
      "full_name": "Russell Moore",
      "role": "President, Ethics and Religious Liberty Commission",
      "tenure_start": "2013",
      "tenure_end": "2021",
      "is_current": false,
      "committees": ["ERLC"],
      "present_during": ["guidepost_investigation_period","abuse_reform_resistance"],
      "departure_reason": "Resigned — threats and intimidation from EC leadership",
      "departure_context": "Moore resigned as ERLC president in May 2021. He subsequently published letters documenting that SBC Executive Committee leaders had threatened him and his family, attempted to have him fired, and subjected him to financial pressure when he raised concerns about the SBC's abuse response and the EC's conduct. Moore's letters — which named specific EC leaders including Ronnie Floyd — provided the primary documentary evidence of the EC's intimidation culture. Moore later joined Christianity Today as editor-in-chief.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Published letters documenting EC threats and intimidation when he raised abuse concerns. Primary whistleblower documentation in the SBC crisis. Joined Christianity Today post-resignation.",
      "sources": []
    },
    {
      "person_slug": "johnny-hunt",
      "full_name": "Johnny Hunt",
      "role": "Senior VP for Evangelism and Leadership, North American Mission Board; former SBC President",
      "tenure_start": "2018",
      "tenure_end": "2022",
      "is_current": false,
      "committees": ["SBC Presidency 2008-2010","NAMB"],
      "present_during": ["guidepost_investigation_period"],
      "departure_reason": "Resigned — sexual misconduct finding",
      "departure_context": "The Guidepost Solutions report named Hunt as having sexually assaulted another pastor's wife in 2010. Hunt denied the allegation. He had been a highly prominent SBC figure — former SBC president, lead pastor of a major Georgia congregation, and NAMB VP. His resignation from NAMB came the same day the Guidepost report was published in May 2022.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Named in Guidepost report for 2010 sexual misconduct. Resigned NAMB position same day report published. Former SBC President.",
      "sources": ["https://www.sataskforce.net/updates/guidepost-solutions-report"]
    }
  ],
  "connections": [
    {
      "person_slug": "paige-patterson",
      "brand_slug_a": "southern-baptist-convention",
      "brand_slug_b": "southern-baptist-convention",
      "overlap_start": "1979",
      "overlap_end": "2018",
      "pattern_type": "family_control",
      "description": "Patterson was the primary architect of the SBC Conservative Resurgence — a decades-long political realignment of the denomination that concentrated theological and institutional power in a leadership culture that the Guidepost investigation later found systematically resistant to abuse accountability. The governance structure Patterson built enabled the cover-up the Guidepost report documented.",
      "significance": "The institutional culture that enabled the secret list and EC resistance to investigation was shaped by the Conservative Resurgence Patterson led."
    }
  ]
});

w('lds-church', {
  "brand_slug": "lds-church",
  "members": [
    {
      "person_slug": "russell-nelson",
      "full_name": "Russell M. Nelson",
      "role": "President and Prophet",
      "tenure_start": "2018",
      "tenure_end": null,
      "is_current": true,
      "committees": ["First Presidency"],
      "present_during": ["ensign_peak_sec_settlement_2023","2019_policy_exclusion_reversal"],
      "departure_reason": null,
      "departure_context": "Nelson became Church President in January 2018 following the death of Thomas Monson. The SEC's Ensign Peak settlement (2023) established that Church leadership had approved the shell LLC concealment structure that the SEC charged as fraud. Nelson reversed the 2015 Policy of Exclusion against children of same-sex couples in 2019. As President, he holds the legal authority over the Church's assets as a corporation sole — the single most powerful position in a multi-billion dollar institution with no board of directors or shareholder accountability.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Corporation sole — single individual controls all Church assets. SEC settlement established leadership approved Ensign Peak concealment. Reversed Policy of Exclusion 2019.",
      "sources": ["https://www.sec.gov/news/press-release/2023-25"]
    },
    {
      "person_slug": "dallin-oaks",
      "full_name": "Dallin H. Oaks",
      "role": "First Counselor in First Presidency",
      "tenure_start": "2018",
      "tenure_end": null,
      "is_current": true,
      "committees": ["First Presidency","Quorum of Twelve (former)"],
      "present_during": ["ensign_peak_sec_settlement_2023","lgbtq_policy_era","prop_8_california"],
      "departure_reason": null,
      "departure_context": "Oaks is a former Utah Supreme Court justice and BYU president who has been one of the most publicly prominent voices on LDS policy regarding LGBTQ members, same-sex marriage, and religious freedom. He was an Apostle during the 2015 Policy of Exclusion. As a former judge and lawyer, his senior role in the First Presidency during the Ensign Peak SEC settlement has generated scrutiny from legal scholars.",
      "revolving_door": true,
      "revolving_door_note": "Utah Supreme Court Justice → BYU President → LDS Apostle → First Presidency. Legal expertise in institutional leadership during the Ensign Peak concealment period that the SEC charged as fraud.",
      "other_boards": [],
      "prior_government": true,
      "notes": "Former Utah Supreme Court justice. Legal background present in Church leadership during SEC fraud finding. Public voice on LGBTQ policy.",
      "sources": []
    },
    {
      "person_slug": "roger-clarke-ensign",
      "full_name": "Roger Clarke",
      "role": "CEO, Ensign Peak Advisors",
      "tenure_start": "1997",
      "tenure_end": "2019",
      "is_current": false,
      "committees": ["Ensign Peak Advisors"],
      "present_during": ["ensign_peak_sec_concealment_period"],
      "departure_reason": "Retired",
      "departure_context": "Clarke led Ensign Peak Advisors during the core period of the SEC-charged concealment — managing the creation and maintenance of the 13 shell LLCs used to hide the fund's size from regulatory disclosure. The SEC settlement documents established that the concealment structure was approved by Church leadership. Clarke was succeeded as CEO before the SEC investigation became public.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Ran Ensign Peak during the 22-year concealment period. SEC fraud finding covered his tenure. Retired before SEC investigation became public.",
      "sources": ["https://www.sec.gov/news/press-release/2023-25"]
    },
    {
      "person_slug": "thomas-monson",
      "full_name": "Thomas S. Monson",
      "role": "President and Prophet",
      "tenure_start": "2008",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["First Presidency"],
      "present_during": ["prop_8_campaign","ensign_peak_concealment_period","2015_policy_exclusion"],
      "departure_reason": "Died January 2018",
      "departure_context": "Monson led the Church during Prop 8 (2008), the 2015 Policy of Exclusion, and through the bulk of the Ensign Peak concealment period. The Church's California FPPC campaign finance violation — for failing to properly disclose approximately $180,000 in Prop 8 spending — occurred during his presidency.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Died 2018. President during Prop 8, Policy of Exclusion, and majority of Ensign Peak concealment period. UK court appearances declined due to health.",
      "sources": []
    }
  ],
  "connections": [
    {
      "person_slug": "dallin-oaks",
      "brand_slug_a": "lds-church",
      "brand_slug_b": "lds-church",
      "overlap_start": "1984",
      "overlap_end": null,
      "pattern_type": "revolving_door",
      "description": "Oaks moved from Utah Supreme Court Justice to LDS Apostle to First Presidency — bringing legal expertise into the Church's senior leadership during the period when the Ensign Peak concealment structure was designed and maintained. The SEC charged the concealment as fraud.",
      "significance": "Legal expertise in institutional leadership raises questions about the advice available to Church leaders during the Ensign Peak concealment design."
    }
  ]
});

w('church-of-scientology', {
  "brand_slug": "church-of-scientology",
  "members": [
    {
      "person_slug": "david-miscavige",
      "full_name": "David Miscavige",
      "role": "Chairman of the Board, Religious Technology Center (RTC)",
      "tenure_start": "1986",
      "tenure_end": null,
      "is_current": true,
      "committees": ["RTC Board"],
      "present_during": ["irs_1993_settlement","lisa_mcpherson_1995","france_conviction_2009","sea_org_rpf_documented"],
      "departure_reason": null,
      "departure_context": "Miscavige has been the effective leader of Scientology since L. Ron Hubbard's death in 1986. He has been named as a defendant or alleged abuser in lawsuits filed by his own father, his niece Jenna Miscavige Hill, and hundreds of former senior officials including Inspector General Marty Rathbun, spokesman Mike Rinder, and former senior executives. He has successfully avoided being served with process in multiple civil cases by maintaining extreme personal security and avoiding predictable locations. The organization has spent millions on private investigators to monitor former members and critics.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Hundreds of sworn declarations from former senior officials alleging physical assault, false imprisonment, and other abuse. Has avoided service of process in multiple cases. Father and niece among plaintiffs. Controls multi-billion dollar organization as single individual through RTC.",
      "sources": ["https://www.tampabay.com/specials/2009/reports/project/"]
    },
    {
      "person_slug": "marty-rathbun",
      "full_name": "Mark 'Marty' Rathbun",
      "role": "Inspector General, Religious Technology Center",
      "tenure_start": "1993",
      "tenure_end": "2004",
      "is_current": false,
      "committees": ["RTC"],
      "present_during": ["irs_1993_settlement","lisa_mcpherson_1995"],
      "departure_reason": "Left organization",
      "departure_context": "Rathbun was one of Scientology's most senior officials — the number two executive behind Miscavige — and played a central role in the 1993 IRS settlement negotiations. After leaving in 2004, he became one of Scientology's most prominent critics, filing sworn declarations describing physical assaults by Miscavige including punching and choking of staff members. He subsequently became a consultant for defendants in Scientology litigation, then in a controversial turn began providing declarations supporting Scientology — a reversal that generated significant coverage.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Number two executive behind Miscavige. Central to 1993 IRS deal. Filed sworn declarations of Miscavige physical assault. Subsequently provided declarations for Scientology in litigation — contested credibility.",
      "sources": ["https://www.tampabay.com/specials/2009/reports/project/"]
    },
    {
      "person_slug": "mike-rinder",
      "full_name": "Mike Rinder",
      "role": "Chief Spokesman, Church of Scientology International",
      "tenure_start": "1982",
      "tenure_end": "2007",
      "is_current": false,
      "committees": ["Office of Special Affairs"],
      "present_during": ["lisa_mcpherson_1995","france_conviction_2009_pre","fair_game_operations"],
      "departure_reason": "Left organization",
      "departure_context": "Rinder was Scientology's chief public spokesman for 25 years and head of the Office of Special Affairs — the unit responsible for legal, PR, and intelligence operations. After leaving in 2007, he became one of the organization's most prominent critics, filing sworn declarations about Miscavige's conduct and co-hosting Leah Remini's documentary series 'Scientology and the Aftermath.' The Church has pursued him with private investigators and sent family members to publicly confront him in staged events.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "25-year spokesman. Ran OSA intelligence operations. Leah Remini documentary co-host post-departure. Family used in staged confrontation operations.",
      "sources": ["https://www.tampabay.com/specials/2009/reports/project/"]
    },
    {
      "person_slug": "l-ron-hubbard",
      "full_name": "Lafayette Ronald Hubbard",
      "role": "Founder",
      "tenure_start": "1954",
      "tenure_end": "1986",
      "is_current": false,
      "committees": ["Founder"],
      "present_during": ["operation_snow_white","operation_freakout","sea_org_founding","fair_game_doctrine"],
      "departure_reason": "Died January 1986",
      "departure_context": "Hubbard founded Dianetics in 1950 and the Church of Scientology in 1954. He authored the Fair Game policy (1967), directed Operation Snow White (the largest domestic espionage operation against the US government by a private organization — infiltrating 136 agencies), and authored Operation Freakout (the campaign to frame journalist Paulette Cooper with a bomb threat). His wife Mary Sue Hubbard was convicted in Operation Snow White. Hubbard spent the last years of his life in hiding, communicating with the Church through intermediaries. His death was not reported to authorities for approximately 24 hours.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Authored Fair Game policy. Directed Operation Snow White. Authored Operation Freakout to frame journalist Cooper. Wife convicted. Died in hiding — death delayed 24 hours before reporting.",
      "sources": ["https://vault.fbi.gov/scientology"]
    }
  ],
  "connections": [
    {
      "person_slug": "david-miscavige",
      "brand_slug_a": "church-of-scientology",
      "brand_slug_b": "church-of-scientology",
      "overlap_start": "1986",
      "overlap_end": null,
      "pattern_type": "family_control",
      "description": "Miscavige controls Scientology through the Religious Technology Center without any board oversight, shareholder accountability, or succession mechanism beyond his own designation. Hundreds of former senior officials have filed sworn declarations about his conduct; he has successfully avoided legal accountability through the organization's resources and his own evasion of service.",
      "significance": "Single-person control of a multi-billion dollar organization with no external accountability structure, active pursuit of critics, and documented evasion of legal process."
    }
  ]
});

console.log('\nAll religious institution board files written.');
console.log('Run: node db/import_board_members.mjs');
