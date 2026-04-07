import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const w = (slug, obj) => {
  mkdirSync(join(__dirname, 'boards'), { recursive: true });
  writeFileSync(join(__dirname, 'boards', slug + '.json'), JSON.stringify(obj, null, 2));
  console.log('  ✓ ' + slug);
};

console.log('\n=== Writing board files ===');

w('purdue-pharma', {
  "brand_slug": "purdue-pharma",
  "members": [
    {
      "person_slug": "richard-sackler",
      "full_name": "Richard Sackler",
      "role": "President, then Board Co-Chair",
      "tenure_start": "1990",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["oxycontin_launch_1996", "2007_guilty_plea", "10b_extraction_period"],
      "departure_reason": "Resigned amid mounting litigation",
      "departure_context": "Internal documents quoted Richard Sackler directing the company to 'hammer on the abusers' when overdose deaths became public. He was president during the 1996 OxyContin launch and the misleading marketing that preceded the 2007 guilty plea.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "No criminal charges filed. NY AG alleged Sackler directed specific deceptive marketing decisions. Internal documents show awareness of addiction crisis and direction to minimize it publicly.",
      "sources": ["https://www.nytimes.com/2019/01/15/health/sacklers-purdue-oxycontin-opioids.html"]
    },
    {
      "person_slug": "mortimer-sackler-sr",
      "full_name": "Mortimer D.A. Sackler",
      "role": "Board Member (Mortimer branch)",
      "tenure_start": "1990",
      "tenure_end": "2019",
      "is_current": false,
      "committees": [],
      "present_during": ["oxycontin_launch_1996", "2007_guilty_plea", "10b_extraction_period"],
      "departure_reason": "Bankruptcy filing",
      "departure_context": "Mortimer branch of the Sackler family received billions in dividends from Purdue during the opioid crisis period. The branch maintained international philanthropic presence including major donations to Oxford University (since declined).",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "No criminal charges filed. Mortimer branch received approximately $4B+ in dividends from Purdue before bankruptcy.",
      "sources": []
    },
    {
      "person_slug": "jonathan-sackler",
      "full_name": "Jonathan Sackler",
      "role": "Board Member (Raymond branch)",
      "tenure_start": "1990",
      "tenure_end": "2019",
      "is_current": false,
      "committees": [],
      "present_during": ["oxycontin_launch_1996", "2007_guilty_plea", "10b_extraction_period"],
      "departure_reason": "Died 2020",
      "departure_context": "Raymond branch board member throughout the OxyContin era.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Died June 2020 before bankruptcy resolution.",
      "sources": []
    },
    {
      "person_slug": "michael-friedman-purdue",
      "full_name": "Michael Friedman",
      "role": "President and CEO",
      "tenure_start": "2000",
      "tenure_end": "2007",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["aggressive_marketing_2000_2007", "2007_guilty_plea"],
      "departure_reason": "Guilty plea — resigned",
      "departure_context": "Pleaded guilty to federal misbranding charges in 2007. Paid $34.5M personal fine. Avoided prison. One of three Purdue executives who pleaded guilty.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Avoided prison despite guilty plea. Fine was $34.5M shared across three executives.",
      "sources": ["https://www.justice.gov/archive/usao/vaw/press_releases/2007/may/purdue_pharma_plea.html"]
    },
    {
      "person_slug": "howard-udell",
      "full_name": "Howard Udell",
      "role": "Chief Legal Officer",
      "tenure_start": "1995",
      "tenure_end": "2007",
      "is_current": false,
      "committees": [],
      "present_during": ["aggressive_marketing_2000_2007", "2007_guilty_plea"],
      "departure_reason": "Guilty plea — resigned",
      "departure_context": "Pleaded guilty to federal misbranding charges in 2007 alongside Friedman and Goldenheim. Paid personal fine as part of $34.5M shared settlement. Avoided prison.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Died 2013.",
      "sources": []
    },
    {
      "person_slug": "paul-goldenheim",
      "full_name": "Paul Goldenheim",
      "role": "Chief Medical Officer",
      "tenure_start": "1995",
      "tenure_end": "2007",
      "is_current": false,
      "committees": [],
      "present_during": ["oxycontin_launch_1996", "aggressive_marketing_2000_2007", "2007_guilty_plea"],
      "departure_reason": "Guilty plea — resigned",
      "departure_context": "Pleaded guilty to federal misbranding charges in 2007. As CMO, had direct oversight of the medical claims that formed the basis of the misbranding conviction. Avoided prison.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "CMO during the period when 'less than 1% addiction rate' claim was deployed by the sales force. Avoided prison despite guilty plea.",
      "sources": []
    },
    {
      "person_slug": "david-haddox",
      "full_name": "David Haddox",
      "role": "Vice President, Health Policy",
      "tenure_start": "1999",
      "tenure_end": "2010",
      "is_current": false,
      "committees": [],
      "present_during": ["aggressive_marketing_2000_2007"],
      "departure_reason": "Left company",
      "departure_context": "Haddox co-authored papers promoting opioid prescribing and was the company's primary public spokesperson defending OxyContin's safety profile during the aggressive marketing period. His academic work on 'pseudoaddiction' — the concept that apparent addiction is actually undertreated pain — was used by the sales force.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Academic work on 'pseudoaddiction' widely criticized as providing intellectual cover for aggressive opioid prescribing.",
      "sources": []
    }
  ],
  "connections": [
    {
      "person_slug": "richard-sackler",
      "brand_slug_a": "purdue-pharma",
      "brand_slug_b": "purdue-pharma",
      "overlap_start": "1990",
      "overlap_end": "2018",
      "pattern_type": "family_control",
      "description": "Sackler family controlled Purdue through both Raymond and Mortimer branches, extracting approximately $10-11 billion in dividends before bankruptcy while the opioid crisis unfolded.",
      "significance": "The family control structure insulated Purdue from standard corporate governance accountability — no independent shareholders could force different conduct."
    }
  ]
});

w('volkswagen-group', {
  "brand_slug": "volkswagen-group",
  "members": [
    {
      "person_slug": "martin-winterkorn",
      "full_name": "Martin Winterkorn",
      "role": "CEO",
      "tenure_start": "2007",
      "tenure_end": "2015",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["defeat_device_installation_2006_2015", "defeat_device_disclosure_2015"],
      "departure_reason": "Resigned — defeat device disclosure",
      "departure_context": "Resigned September 23, 2015 — five days after EPA issued notice of violation. German prosecutors subsequently charged Winterkorn with fraud. A May 2014 internal memo — documented by the Wall Street Journal — showed Winterkorn had been briefed on emissions discrepancies over a year before public disclosure.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "German criminal proceedings for fraud ongoing as of 2024. Trial repeatedly delayed citing Winterkorn's health. If convicted, would be the most senior automotive executive jailed for emissions fraud.",
      "sources": ["https://www.wsj.com/articles/volkswagen-ceo-knew-of-possible-emissions-issues-in-may-2014-email-shows-1448998294"]
    },
    {
      "person_slug": "rupert-stadler",
      "full_name": "Rupert Stadler",
      "role": "CEO of Audi AG (VW Group subsidiary)",
      "tenure_start": "2007",
      "tenure_end": "2018",
      "is_current": false,
      "committees": [],
      "present_during": ["defeat_device_installation_2006_2015", "defeat_device_disclosure_2015"],
      "departure_reason": "Convicted — resigned",
      "departure_context": "Convicted by Munich Regional Court in December 2023 of fraud in connection with the diesel emissions scandal affecting Audi vehicles. Received a suspended sentence of 22 months — no prison time. Paid a personal fine of €1.1 million.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Convicted 2023. Suspended sentence. Among the most senior European automotive executives convicted in connection with emissions fraud.",
      "sources": ["https://www.theguardian.com/business/2023/dec/19/former-audi-boss-rupert-stadler-guilty-diesel-emissions-scandal"]
    },
    {
      "person_slug": "ferdinand-piech",
      "full_name": "Ferdinand Piëch",
      "role": "Supervisory Board Chairman",
      "tenure_start": "2002",
      "tenure_end": "2015",
      "is_current": false,
      "committees": ["Supervisory Board"],
      "present_during": ["defeat_device_installation_2006_2015"],
      "departure_reason": "Resigned — internal power struggle with Winterkorn",
      "departure_context": "Ferdinand Piëch — grandson of Ferdinand Porsche and the dominant shareholder figure in VW's controlling structure — resigned from the supervisory board in April 2015 after a power struggle with Winterkorn. The defeat device scandal broke five months later.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": ["porsche-se"],
      "prior_government": false,
      "notes": "Died 2019. The Piëch family and Porsche family together maintain voting control of Volkswagen AG through Porsche Automobil Holding SE.",
      "sources": []
    },
    {
      "person_slug": "hans-dieter-poetsch",
      "full_name": "Hans Dieter Pötsch",
      "role": "CFO, then Supervisory Board Chairman",
      "tenure_start": "2003",
      "tenure_end": null,
      "is_current": true,
      "committees": ["Supervisory Board", "Finance"],
      "present_during": ["defeat_device_installation_2006_2015", "defeat_device_disclosure_2015", "30b_settlement_period"],
      "departure_reason": null,
      "departure_context": "Pötsch was VW's CFO during the defeat device period and became Supervisory Board Chairman in October 2015 — one month after the defeat device disclosure. He faced personal criminal charges in Germany for allegedly delaying disclosure of the defeat device to investors; the charges were settled via personal fine without admission.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Still current as of 2024. Settled personal criminal charges via fine without admission.",
      "sources": []
    },
    {
      "person_slug": "matthias-mueller-vw",
      "full_name": "Matthias Müller",
      "role": "CEO",
      "tenure_start": "2015",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["30b_settlement_period"],
      "departure_reason": "Replaced — board decision",
      "departure_context": "Replaced by Herbert Diess in April 2018 as VW sought to shift leadership image during the settlement period. Had previously been CEO of Porsche AG.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": ["porsche-se"],
      "prior_government": false,
      "notes": "Led the initial crisis management period. Replaced as board sought image shift.",
      "sources": []
    }
  ],
  "connections": [
    {
      "person_slug": "ferdinand-piech",
      "brand_slug_a": "volkswagen-group",
      "brand_slug_b": "volkswagen-group",
      "overlap_start": "2002",
      "overlap_end": "2015",
      "pattern_type": "family_control",
      "description": "The Piëch and Porsche families together control approximately 53% of VW's voting shares through Porsche Automobil Holding SE — creating a governance structure that insulates VW management from standard public company accountability mechanisms.",
      "significance": "Family control meant no outside shareholder could force disclosure of the defeat device or demand different conduct during the 9-year period it was in use."
    }
  ]
});

w('goldman-sachs', {
  "brand_slug": "goldman-sachs",
  "members": [
    {
      "person_slug": "lloyd-blankfein",
      "full_name": "Lloyd Blankfein",
      "role": "CEO and Chairman",
      "tenure_start": "2006",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["2008_financial_crisis", "abacus_cdo_fraud", "1mdb_bribery_period"],
      "departure_reason": "Retired",
      "departure_context": "CEO during the 2008 financial crisis when Goldman received $10 billion in TARP funds and benefited from the AIG bailout. Goldman paid $550 million to the SEC in 2010 for the ABACUS CDO fraud — the largest SEC settlement against a Wall Street bank at the time. Blankfein notoriously told the Times of London in 2009 that Goldman was doing 'God's work.'",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "No criminal charges. CEO during both the ABACUS fraud and the beginning of the 1MDB scheme.",
      "sources": []
    },
    {
      "person_slug": "hank-paulson",
      "full_name": "Henry 'Hank' Paulson",
      "role": "CEO",
      "tenure_start": "1999",
      "tenure_end": "2006",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["pre_crisis_cdo_period"],
      "departure_reason": "Appointed US Treasury Secretary",
      "departure_context": "Left Goldman to become George W. Bush's Treasury Secretary in 2006 — overseeing the 2008 financial crisis response that included the bailout of AIG, which directly benefited Goldman Sachs. Paulson held meetings with Goldman executives during the crisis that were subsequently scrutinized for potential conflicts of interest.",
      "revolving_door": true,
      "revolving_door_note": "CEO of Goldman → US Treasury Secretary → Oversaw bailout that directly benefited Goldman. Classic revolving door with documented conflict of interest scrutiny.",
      "other_boards": [],
      "prior_government": false,
      "notes": "Paradigmatic example of Goldman's Treasury revolving door. Also preceded by Robert Rubin (Goldman co-chairman → Clinton Treasury Secretary).",
      "sources": []
    },
    {
      "person_slug": "jon-corzine",
      "full_name": "Jon Corzine",
      "role": "CEO and Co-Chairman",
      "tenure_start": "1994",
      "tenure_end": "1999",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["goldman_ipo_period"],
      "departure_reason": "Left to run for US Senate (New Jersey)",
      "departure_context": "Left Goldman to successfully run for US Senate from New Jersey in 2000, then became Governor of New Jersey 2006-2010. Later became CEO of MF Global which collapsed in 2011 after $1.6 billion in customer funds went missing; Corzine was sued by the CFTC.",
      "revolving_door": true,
      "revolving_door_note": "Goldman CEO → US Senator → Governor of New Jersey → MF Global CEO (where $1.6B in customer funds went missing before bankruptcy).",
      "other_boards": [],
      "prior_government": false,
      "notes": "MF Global collapsed 2011; CFTC sued Corzine over missing customer funds. Settled 2017 for $5M personal payment.",
      "sources": []
    },
    {
      "person_slug": "david-solomon",
      "full_name": "David Solomon",
      "role": "CEO",
      "tenure_start": "2018",
      "tenure_end": null,
      "is_current": true,
      "committees": ["Executive"],
      "present_during": ["1mdb_settlement_2020", "consumer_bank_losses"],
      "departure_reason": null,
      "departure_context": "CEO during the $2.9 billion 1MDB global resolution in 2020 — the largest DOJ settlement for a bank's role in government corruption. Also oversaw Goldman's ill-fated consumer banking expansion (Marcus) which generated billions in losses before being wound down.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Faced significant internal criticism from partners over management style and Marcus losses. Known as DJ D-Sol outside the office.",
      "sources": []
    },
    {
      "person_slug": "gary-cohn",
      "full_name": "Gary Cohn",
      "role": "President and COO",
      "tenure_start": "2006",
      "tenure_end": "2017",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["2008_financial_crisis", "abacus_cdo_fraud", "1mdb_bribery_period"],
      "departure_reason": "Appointed Director of National Economic Council",
      "departure_context": "Left Goldman to become Trump's Director of the National Economic Council in January 2017. Resigned February 2018 over Trump's steel and aluminum tariffs. Received approximately $285 million in Goldman stock awards upon departure for government service.",
      "revolving_door": true,
      "revolving_door_note": "Goldman President/COO → Trump National Economic Council Director. Received $285M in accelerated Goldman equity upon joining government.",
      "other_boards": [],
      "prior_government": false,
      "notes": "$285M in Goldman equity vested upon joining government. Resigned from NEC over tariffs 2018.",
      "sources": []
    },
    {
      "person_slug": "robert-rubin",
      "full_name": "Robert Rubin",
      "role": "Co-Senior Partner and Co-Chairman",
      "tenure_start": "1966",
      "tenure_end": "1992",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["goldman_partnership_era"],
      "departure_reason": "Appointed to Clinton administration",
      "departure_context": "Left Goldman to become Clinton's Director of the National Economic Council (1993-1995) then Treasury Secretary (1995-1999). His tenure as Treasury Secretary involved repeal of Glass-Steagall and deregulation of derivatives — regulatory changes that contributed to the conditions enabling the 2008 financial crisis. After Treasury, became Chairman of Citigroup's executive committee — where he earned $126 million over 10 years while Citi accumulated the risky positions that nearly destroyed it in 2008.",
      "revolving_door": true,
      "revolving_door_note": "Goldman Co-Chairman → Clinton Treasury Secretary (Glass-Steagall repeal) → Citigroup Chairman ($126M, 10 years) → Citigroup required $476B bailout in 2008.",
      "other_boards": ["citigroup"],
      "prior_government": false,
      "notes": "The paradigmatic Goldman revolving door case. Treasury Secretary role shaped financial deregulation; subsequent Citigroup role captured deregulation benefits.",
      "sources": []
    }
  ],
  "connections": [
    {
      "person_slug": "hank-paulson",
      "brand_slug_a": "goldman-sachs",
      "brand_slug_b": "citigroup",
      "overlap_start": "2006",
      "overlap_end": "2009",
      "pattern_type": "revolving_door",
      "description": "Paulson left Goldman to become Treasury Secretary and oversaw a bailout that benefited Goldman through the AIG rescue. Rubin went from Goldman to Treasury to Citigroup. The Goldman-Treasury pipeline is a documented structural pattern.",
      "significance": "The pattern created documented conflicts of interest during the 2008 crisis when former Goldman executives in government positions made decisions that directly benefited Goldman Sachs."
    },
    {
      "person_slug": "robert-rubin",
      "brand_slug_a": "goldman-sachs",
      "brand_slug_b": "citigroup",
      "overlap_start": "1999",
      "overlap_end": "2009",
      "pattern_type": "revolving_door",
      "description": "Robert Rubin went from Goldman Co-Chairman to Clinton Treasury Secretary to Citigroup Chairman — earning $126M at Citigroup while it accumulated the positions that required a $476B government bailout in 2008.",
      "significance": "Rubin's Treasury deregulation and subsequent Citigroup leadership represent a complete cycle of the revolving door: regulatory dismantlement followed by capture of deregulation benefits."
    }
  ]
});

w('3m', {
  "brand_slug": "3m",
  "members": [
    {
      "person_slug": "livio-desimone",
      "full_name": "Livio D. DeSimone",
      "role": "CEO and Chairman",
      "tenure_start": "1991",
      "tenure_end": "2001",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["pfas_knowledge_accumulation_1970s_2000s"],
      "departure_reason": "Retired",
      "departure_context": "Led 3M during the period when PFAS health concerns were accumulating internally but not publicly disclosed. The 2000 voluntary phase-out of PFOS — the specific PFAS compound in Scotchgard — began under DeSimone after EPA pressure.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "CEO during the 2000 PFOS phase-out — the first public acknowledgment that a specific 3M PFAS compound required action.",
      "sources": []
    },
    {
      "person_slug": "james-mcnerney",
      "full_name": "W. James McNerney Jr.",
      "role": "CEO and Chairman",
      "tenure_start": "2001",
      "tenure_end": "2005",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["pfas_knowledge_accumulation_1970s_2000s"],
      "departure_reason": "Left to become CEO of Boeing",
      "departure_context": "Left 3M to become CEO of Boeing in 2005. His 3M tenure coincided with the post-PFOS phase-out period when PFAS replacement compounds continued to be manufactured and sold despite accumulating evidence of their health effects.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": ["boeing"],
      "prior_government": false,
      "notes": "Moved from 3M CEO to Boeing CEO — Boeing subsequently experienced its own series of safety and compliance failures.",
      "sources": []
    },
    {
      "person_slug": "george-buckley-3m",
      "full_name": "George W. Buckley",
      "role": "CEO and Chairman",
      "tenure_start": "2005",
      "tenure_end": "2012",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["pfas_knowledge_accumulation_1970s_2000s", "earplug_defect_known_2000s"],
      "departure_reason": "Retired",
      "departure_context": "CEO during the period when the Combat Arms earplug (CAEv2) was being sold to the US military with the known loosening defect. The defect was identified in internal Aearo Technologies testing before the contract was awarded.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "CEO during earplug sale period 2005-2012. No criminal charges.",
      "sources": []
    },
    {
      "person_slug": "inge-thulin",
      "full_name": "Inge G. Thulin",
      "role": "CEO and Chairman",
      "tenure_start": "2012",
      "tenure_end": "2018",
      "is_current": false,
      "committees": ["Executive"],
      "present_during": ["earplug_sale_period_2003_2015", "minnesota_pfas_897m_settlement"],
      "departure_reason": "Retired",
      "departure_context": "CEO during the $897 million Minnesota PFAS settlement (2018) — the first major PFAS water contamination settlement against 3M. Also CEO during the final years of Combat Arms earplug sales to the military (contract ended 2015).",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "CEO during $897M Minnesota settlement. Retired before the $10.3B water system settlement and $9.1B earplug settlement.",
      "sources": []
    },
    {
      "person_slug": "mike-roman",
      "full_name": "Mike Roman",
      "role": "CEO and Chairman",
      "tenure_start": "2018",
      "tenure_end": null,
      "is_current": true,
      "committees": ["Executive"],
      "present_during": ["10_3b_pfas_settlement_2023", "9_1b_earplug_settlement_2023", "aearo_texas_two_step_failed"],
      "departure_reason": null,
      "departure_context": "CEO during the two largest settlements in 3M history — $10.3 billion for PFAS water system contamination and $9.1 billion for defective military earplugs. Also oversaw the failed Texas Two-Step bankruptcy attempt through Aearo Technologies that courts rejected as lacking good faith.",
      "revolving_door": false,
      "revolving_door_note": null,
      "other_boards": [],
      "prior_government": false,
      "notes": "Oversaw $20B+ in combined settlements. Aearo bankruptcy Texas Two-Step rejected. Solventum healthcare spinoff completed 2024.",
      "sources": []
    }
  ],
  "connections": [
    {
      "person_slug": "james-mcnerney",
      "brand_slug_a": "3m",
      "brand_slug_b": "3m",
      "overlap_start": "2001",
      "overlap_end": "2005",
      "pattern_type": "interlocking_directorate",
      "description": "McNerney moved from 3M CEO to Boeing CEO. Boeing subsequently experienced documented safety and compliance failures. The executive pipeline between major industrial companies creates shared governance culture.",
      "significance": "Illustrates how executive mobility shapes corporate culture across industries."
    }
  ]
});

console.log('\nAll board files written.');
console.log('Run: node db/import_board_members.mjs');
