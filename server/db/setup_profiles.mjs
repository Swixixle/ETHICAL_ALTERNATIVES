import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const profiles = {
  "profiles_v7/goldman-sachs.json": {
  "brand_name": "Goldman Sachs",
  "brand_slug": "goldman-sachs",
  "parent_company": "The Goldman Sachs Group Inc.",
  "ultimate_parent": "The Goldman Sachs Group Inc.",
  "subsidiaries": ["Goldman Sachs Bank USA", "Goldman Sachs Asset Management", "Marcus by Goldman Sachs", "Ayco"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "GOLDMAN SACHS PAID $1.6 BILLION IN BRIBES TO STEAL FROM A MALAYSIAN DEVELOPMENT FUND AND CALLED IT BANKING",
  "executive_summary": "Goldman Sachs is one of the most powerful investment banks on earth, generating over $47 billion in net revenue in 2024. The bank pleaded guilty — through its Malaysian subsidiary — to conspiracy to violate the Foreign Corrupt Practices Act in 2020, paying a combined $5.1 billion to settle with the U.S. DOJ, SEC, Malaysian government, and international regulators. The 1MDB scandal involved paying $1.6 billion in bribes to Malaysian and Abu Dhabi officials to secure Goldman's role as underwriter of $6.5 billion in bonds for a Malaysian development fund — from which $4.5 billion was subsequently stolen. It is the largest FCPA settlement in history. Goldman's record also includes its central role in the 2008 financial crisis, where it simultaneously sold mortgage-backed securities to clients while betting against them.",
  "verdict_tags": ["bribery_1_6b", "1mdb_criminal_guilty_plea", "mortgage_crisis_role", "sec_fraud", "conflict_of_interest", "inequality_engine"],
  "concern_flags": {"labor": false, "environmental": true, "political": true, "tax": true, "health": false, "legal": true},
  "tax": {
    "summary": "Goldman Sachs uses offshore structures in the Cayman Islands, Ireland, and other jurisdictions to minimize U.S. tax exposure on international operations. The company received significant benefits from the 2017 Tax Cuts and Jobs Act. Goldman has marketed aggressive tax shelter strategies to corporate clients — some of which have been challenged by the IRS. The bank's partnership structure historically allowed partners to receive compensation in ways that minimized payroll tax exposure.",
    "flags": ["offshore_cayman_structures", "tax_shelter_client_marketing", "tcja_windfall"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "1MDB (2020): Goldman's Malaysian subsidiary pleaded guilty; parent company entered Deferred Prosecution Agreement; combined $5.1 billion in settlements with DOJ, SEC, Malaysian government, UK FCA, Singapore, and Hong Kong regulators — the largest FCPA settlement in history. The scheme involved paying $1.6 billion in bribes to secure underwriting of $6.5 billion in bonds, generating $600 million in fees for Goldman while $4.5 billion was stolen from the fund. 2016 Mortgage Crisis Settlement: Goldman paid $5 billion to resolve DOJ claims for selling toxic mortgage-backed securities while its own traders bet against them. 2012: Goldman paid $22 million to settle SEC charges for giving hedge fund clients advance notice of analyst downgrades. Goldman has a documented history of conflict of interest settlements.",
    "flags": ["1mdb_5_1b_fcpa_record", "malaysian_subsidiary_guilty_plea", "5b_mortgage_crisis_settlement", "advance_notice_analyst_downgrades"],
    "sources": ["https://www.justice.gov", "https://www.sec.gov"]
  },
  "labor": {
    "summary": "Goldman Sachs employs approximately 46,000 people. The bank's internal culture — detailed in Greg Smith's 2012 New York Times resignation letter and subsequent book — described a client-hostile environment where employees called clients 'muppets' and revenue extraction was the explicit goal. Goldman's workforce is bifurcated between extremely well-compensated managing directors and partners, and lower-paid support and operational staff. The bank has conducted multiple rounds of layoffs during market downturns while maintaining executive compensation.",
    "flags": ["client_hostile_culture_documented", "muppet_culture_resignation_letter", "layoff_vs_executive_pay_pattern"],
    "sources": ["https://www.nytimes.com"]
  },
  "environmental": {
    "summary": "Goldman Sachs has been among the largest financiers of fossil fuel projects globally, providing hundreds of billions in lending and underwriting to oil, gas, and coal companies. The bank has made net-zero commitments while continuing to finance fossil fuel expansion. Goldman's Lee Raymond — former ExxonMobil CEO and the corporate leader most associated with climate denial — served on Goldman's board of directors for years. The bank has faced criticism from shareholders for the gap between its climate commitments and its fossil fuel financing.",
    "flags": ["fossil_fuel_financing_scale", "lee_raymond_board_connection", "net_zero_commitment_gap"],
    "sources": ["https://www.banktrack.org"]
  },
  "political": {
    "summary": "Goldman Sachs spent $5.8 million on federal lobbying in 2023. The bank has produced more senior U.S. government officials than virtually any other institution — Henry Paulson (Treasury Secretary), Robert Rubin (Treasury Secretary), Steve Mnuchin (Treasury Secretary), Gary Cohn (National Economic Council Director). This revolving door gives Goldman extraordinary access to financial regulation. Goldman alumni hold positions across the Federal Reserve, SEC, CFTC, and Treasury at any given time.",
    "flags": ["revolving_door_treasury_multiple_secretaries", "sec_cftc_fed_alumni_penetration", "regulatory_access_unmatched"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO David Solomon received $39 million in total compensation in 2024 — among the highest of any U.S. bank CEO. Former CEO Lloyd Blankfein, who oversaw the 1MDB and mortgage crisis periods, famously said Goldman was 'doing God's work.' Tim Leissner, the Goldman partner at the center of the 1MDB scheme, has pleaded guilty and cooperated with prosecutors. Roger Ng, Goldman's former Malaysia head, was sentenced to 10 years in prison — one of the few Goldman employees to face meaningful criminal consequences.",
    "flags": ["doing_gods_work_blankfein", "leissner_guilty_plea", "ng_10_year_sentence", "solomon_39m_compensation"],
    "sources": ["https://www.justice.gov", "https://www.sec.gov"]
  },
  "connections": {
    "summary": "Goldman Sachs' alumni network in government — sometimes called 'Government Sachs' — is the most documented corporate-to-government revolving door in the United States. Multiple Treasury Secretaries, Fed governors, and regulatory commissioners have come directly from or returned to Goldman. The bank's underwriting relationships connect it to virtually every major corporation's capital structure. Goldman's role in the 1MDB scandal connected it to Malaysian Prime Minister Najib Razak (now imprisoned), fugitive financier Jho Low (connected to The Wolf of Wall Street film), and Abu Dhabi sovereign wealth funds.",
    "flags": ["government_sachs_revolving_door_documented", "najib_razak_prison_connected", "jho_low_fugitive_connected"],
    "sources": ["https://www.icij.org/inside-icij/2020/11/goldman-sachs-1mdb-settlement"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "During the 2008 financial crisis, Goldman simultaneously sold mortgage-backed securities to clients — recommending them as sound investments — while its own proprietary trading desk was shorting the same securities. This 'Abacus' transaction, settled with the SEC for $550 million, has been alleged by regulators and researchers to represent a systemic conflict of interest that was not isolated to one transaction. Former Goldman employees have alleged that the bank's culture explicitly prioritized extracting maximum fees from clients over serving their interests — contradicting Goldman's public positioning as a trusted advisor.",
    "flags": ["abacus_short_while_selling_alleged", "systematic_client_conflict_alleged", "fee_extraction_culture_documented"],
    "sources": ["https://www.sec.gov"]
  },
  "health_record": {
    "summary": "Goldman's financing of fossil fuels contributes to climate change with documented public health consequences. The bank's role in the 2008 financial crisis — packaging and selling toxic mortgage securities — contributed to the foreclosure crisis that caused documented health impacts: increased suicide rates, stress-related health deterioration, and loss of housing stability for millions of Americans. Goldman's private equity investments in healthcare have included strategies that reduced clinical staffing to maximize profit margins.",
    "flags": ["fossil_fuel_financing_health", "foreclosure_crisis_health_impacts", "healthcare_pe_staffing_reduction"],
    "sources": []
  },
  "alternatives": {
    "cheaper": ["Credit unions — member-owned, FDIC/NCUA insured, lower fees, profits stay with members", "Community banks — local ownership, no investment banking conflicts, relationship lending", "Online banks (including Goldman's own Marcus) — for savings, Marcus actually offers competitive rates"],
    "healthier": ["Community Development Financial Institutions — mission-driven lending to underserved communities", "Cooperative banks — democratic member governance"],
    "diy": ["Understanding that Goldman and other investment banks are not neutral advisors — they earn fees on transactions they recommend", "Index funds — the best evidence suggests most actively managed funds underperform index funds after fees; Goldman charges fees on active management", "Divesting retirement accounts from bank stocks with documented harm records"]
  },
  "timeline": [
    {"year": 1869, "event": "Marcus Goldman founds Goldman Sachs in New York", "severity": "neutral", "source_url": ""},
    {"year": 1999, "event": "Goldman IPO; partners become billionaires; shift from partnership to public corporation changes incentive structure", "severity": "neutral", "source_url": ""},
    {"year": 2007, "event": "Goldman bets against mortgage market while selling mortgage securities to clients — 'Abacus' transactions", "severity": "critical", "source_url": ""},
    {"year": 2008, "event": "Financial crisis; Goldman receives $10B TARP bailout and $12.9B indirectly through AIG bailout", "severity": "critical", "source_url": ""},
    {"year": 2010, "event": "SEC charges Goldman for Abacus CDO fraud; $550M settlement — largest SEC penalty for a Wall Street firm at time", "severity": "critical", "source_url": ""},
    {"year": 2012, "event": "$22M settlement for giving hedge funds advance analyst downgrade information", "severity": "high", "source_url": ""},
    {"year": 2012, "event": "Greg Smith's NYT op-ed resignation documents 'muppet' culture and client hostility", "severity": "high", "source_url": ""},
    {"year": 2016, "event": "$5B mortgage crisis settlement with DOJ for selling toxic securities", "severity": "critical", "source_url": ""},
    {"year": 2020, "event": "$5.1B total 1MDB settlements across DOJ, SEC, Malaysia, UK, Singapore, Hong Kong — largest FCPA settlement in history; Malaysian subsidiary guilty plea", "severity": "critical", "source_url": "https://www.justice.gov"},
    {"year": 2022, "event": "Consumer banking unit Marcus winds down after $3B+ in losses — Goldman's failed attempt at retail banking", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Goldman's mortgage crisis role — packaging and selling securities that Goldman's own traders knew were likely to fail — contributed to a foreclosure crisis that displaced millions of American families from their homes. Black and Latino homeowners who were disproportionately targeted with subprime mortgages lost wealth that has not recovered.",
    "price_illusion": "Goldman's advisory fees and underwriting spreads are paid by corporations, governments, and pension funds — which means they are ultimately paid by shareholders, taxpayers, and retirees. The 1MDB fees ($600 million for underwriting three bond deals) were paid from a development fund that was supposed to build Malaysia's economy. The fees came from money that was then stolen.",
    "tax_math": "Goldman received $10 billion in TARP bailout funds and an additional $12.9 billion through the AIG bailout — public funds used to stabilize the bank after a crisis it contributed to. Goldman subsequently reported record profits and paid record bonuses in 2009. The bailout socialized the losses; the recovery privatized the gains.",
    "wealth_velocity": "Goldman's profits flow to shareholders and, historically, to partners and employees in the form of bonuses. The bank's activities — underwriting, advisory, trading — redistribute wealth between its clients according to Goldman's advantage. The 1MDB scandal demonstrates the extreme version: arranging deals that generate fees for Goldman while enabling theft from developing economies."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Goldman partners and shareholders", "how": "$600M in 1MDB fees; billions in mortgage crisis profits while clients lost money"},
      {"group": "Tim Leissner (cooperation deal)", "how": "Pleaded guilty; years of delay before sentencing; reportedly free on $20M bail"},
      {"group": "Malaysian officials and Jho Low", "how": "$4.5B stolen from 1MDB with Goldman's facilitation"}
    ],
    "who_paid": [
      {"group": "Malaysian people", "how": "$4.5B stolen from national development fund; Najib Razak government fell; country still pursuing full recovery"},
      {"group": "Goldman's institutional clients in mortgage crisis", "how": "Bought securities Goldman was simultaneously betting against"},
      {"group": "U.S. taxpayers", "how": "$22.9B in direct and indirect bailout funds; crisis costs borne broadly by the economy"}
    ],
    "the_gap": "Goldman earned $600 million underwriting bonds for a fund from which $4.5 billion was stolen. Goldman paid $5.1 billion in settlements. One banker went to prison. The CEO said the firm was doing God's work."
  }
},
  "profiles_v7/koch-industries.json": {
  "brand_name": "Koch Industries",
  "brand_slug": "koch-industries",
  "parent_company": "Koch Industries Inc.",
  "ultimate_parent": "Charles Koch (84% ownership)",
  "subsidiaries": ["Georgia-Pacific", "Molex", "Flint Hills Resources", "Koch Fertilizer", "Invista (Lycra)", "Guardian Industries", "Koch Ag & Energy Solutions"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "KOCH INDUSTRIES SPENT $127 MILLION FUNDING CLIMATE DENIAL WHILE OPERATING OIL REFINERIES RESPONSIBLE FOR BILLIONS IN POLLUTION",
  "executive_summary": "Koch Industries is the second-largest privately held company in the United States with estimated annual revenue exceeding $115 billion, owned 84% by Charles Koch. Its businesses span oil refining, chemicals, paper products (Georgia-Pacific), fertilizers, and synthetic fibers (Lycra/Invista). Koch Industries and its owners have funded the most extensive private climate change denial network in history — over $127 million to 84 denial front groups since 1997, more than ExxonMobil spent by a factor of three. The Koch political network has spent over $900 million in single election cycles, built Americans for Prosperity into a nationwide political machine, and was described by Greenpeace as the 'kingpin of climate science denial.' Koch companies have simultaneously accumulated over $400 million in EPA and environmental violation fines.",
  "verdict_tags": ["climate_denial_kingpin", "127m_denial_funding", "environmental_violations", "dark_money_network", "union_suppression", "political_influence_900m", "oil_spills"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "As a private company, Koch Industries does not disclose its finances. However, the company has lobbied aggressively against corporate taxes, supported the 2017 Tax Cuts and Jobs Act (which its political network spent $20M+ to pass), and uses complex partnership and pass-through structures. The private structure allows Koch to avoid public disclosure requirements that apply to publicly traded competitors. Koch's political network has spent hundreds of millions opposing estate taxes that would affect Charles Koch's wealth transfer.",
    "flags": ["private_no_disclosure", "tcja_lobbying_beneficiary", "estate_tax_opposition", "pass_through_structures"],
    "sources": []
  },
  "legal": {
    "summary": "Koch Industries and its subsidiaries have paid over $400 million in fines and settlements for environmental violations. 2000: Koch Pipeline paid $35 million — the largest penalty in history for oil spills at the time — for 300 oil spills across Texas and 5 other states, dumping 3 million gallons of crude oil into waterways. Koch also paid $8 million in a criminal plea for a Texas refinery benzene emissions cover-up. 1999: Koch Industries paid $10 million to settle DOJ claims of stealing oil from federal and Native American lands through systematic meter manipulation — approximately 300 million gallons stolen over three years. Additional environmental settlements span EPA, state environmental agencies, and community plaintiffs across multiple decades.",
    "flags": ["35m_oil_spill_record_fine_2000", "oil_theft_native_american_federal_lands", "benzene_criminal_plea", "400m_total_environmental_violations"],
    "sources": ["https://violationtracker.goodjobsfirst.org", "https://www.epa.gov"]
  },
  "labor": {
    "summary": "Koch Industries is one of the most significant funders of union suppression in American history. Americans for Prosperity — the Koch-funded political group — has spent tens of millions fighting collective bargaining rights in Wisconsin, Michigan, and other states. Koch companies have been subject to OSHA enforcement actions for worker safety violations across their industrial operations. The company's 'Market-Based Management' ideology — its internal management philosophy — has been described by former employees as a system for minimizing worker compensation.",
    "flags": ["systematic_union_suppression_funding", "afp_collective_bargaining_attacks", "osha_violations_industrial_facilities", "wage_minimization_philosophy"],
    "sources": ["https://www.nlrb.gov", "https://www.osha.gov"]
  },
  "environmental": {
    "summary": "Koch Industries' environmental record is among the worst of any major U.S. industrial company. The 300 oil spills across 6 states dumped 3 million gallons of crude oil. Koch's Flint Hills Resources refineries have been major sources of air pollution in Texas and Minnesota. Georgia-Pacific's paper mills have generated significant water pollution. Koch's fertilizer operations create nitrous oxide emissions and water contamination. Koch's PFAS and benzene releases have contaminated groundwater near multiple facilities. Simultaneously, Koch's political network has spent over $127 million to prevent the climate regulations that would limit its environmental damage.",
    "flags": ["3m_gallons_oil_spilled", "flint_hills_refinery_air_pollution", "georgia_pacific_water_pollution", "pfas_groundwater_contamination", "denial_while_polluting"],
    "sources": ["https://echo.epa.gov", "https://www.epa.gov"]
  },
  "political": {
    "summary": "The Koch political network is the most extensively documented private political influence operation in U.S. history. Americans for Prosperity — founded and funded by the late David Koch — has branches in 35+ states and has spent hundreds of millions on elections and lobbying. The Koch network spent $889 million in the 2016 election cycle. Over 400 members of Congress signed an AFP pledge to oppose greenhouse gas legislation. The network funds ALEC, the Cato Institute, Heritage Foundation, Heartland Institute, Manhattan Institute, and dozens of other organizations that produce coordinated policy positions. Kert Davies of Climate Investigations Center: 'you'd have a carbon tax today if not for the Kochs.'",
    "flags": ["889m_single_election_cycle", "400_congress_members_pledge_signed", "alec_cato_heritage_heartland_funded", "climate_policy_block_documented"],
    "sources": ["https://www.greenpeace.org/usa/climate/climate-deniers/koch-industries", "https://www.sourcewatch.org"]
  },
  "executives": {
    "summary": "Charles Koch, 89, controls approximately 84% of Koch Industries. His net worth exceeds $60 billion. His brother David Koch, who co-owned the company, died in 2019. Charles Koch has led the company since 1967 and built the political network over four decades. He has written extensively on 'Market-Based Management' and libertarian economics. The company's political spending — which directly benefits its own bottom line by blocking environmental and labor regulations — represents one of the clearest documented examples of regulatory capture investment.",
    "flags": ["60b_net_worth_charles_koch", "political_network_direct_business_benefit", "regulatory_capture_investment_documented"],
    "sources": []
  },
  "connections": {
    "summary": "The Koch network's reach is documented across American conservatism: Cato Institute (Charles Koch co-founder), Americans for Prosperity, Heritage Foundation, ALEC, Heartland Institute, Club for Growth, and hundreds of state-level organizations. Koch money flows through Donors Trust and Donors Capital Fund — identity-laundering vehicles that allow wealthy donors to give to front groups without public disclosure. The network influences judicial appointments through the Federalist Society, which Koch has funded. The $127 million in documented climate denial funding is separate from the hundreds of millions in political spending that blocks climate legislation.",
    "flags": ["donors_trust_identity_laundering", "federalist_society_judicial_influence", "cato_co_founder", "alec_funder", "coordinated_denial_network"],
    "sources": ["https://www.greenpeace.org/usa/climate/climate-deniers/koch-industries", "https://en.wikipedia.org/wiki/Koch_network"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Senate investigators have alleged that Koch Industries' oil meter manipulation — stealing oil from federal and Native American lands — was systematic and conducted with executive knowledge over multiple years. Environmental researchers have alleged that Koch's political network deliberately modeled its climate denial strategy on the tobacco industry's doubt-manufacturing playbook, using the same public relations firms and tactics. Former Koch employees have alleged that the company's internal culture explicitly connects political activity to business benefit — that employees are expected to view political spending as an investment in regulatory outcomes.",
    "flags": ["oil_theft_executive_knowledge_alleged", "tobacco_denial_playbook_documented", "political_spending_as_business_investment_culture"],
    "sources": ["https://www.whistleblower.org", "https://insideclimatenews.org"]
  },
  "health_record": {
    "summary": "Koch's oil spills contaminated waterways across 6 states, affecting drinking water and aquatic ecosystems used by communities. Koch's benzene emissions — which generated the criminal plea — are a documented carcinogen affecting refinery workers and nearby communities. The climate denial network Koch funded has directly impeded climate action, contributing to ongoing emissions that drive heat deaths, extreme weather, air quality deterioration, and vector-borne disease expansion. Koch fertilizer operations contribute to nitrogen pollution in waterways including the Gulf of Mexico dead zone.",
    "flags": ["oil_spill_drinking_water_contamination", "benzene_carcinogen_criminal_plea", "climate_denial_public_health_consequences", "gulf_dead_zone_fertilizer_contribution"],
    "sources": ["https://www.epa.gov", "https://www.ncbi.nlm.nih.gov"]
  },
  "alternatives": {
    "cheaper": ["Koch's consumer brands include Georgia-Pacific products (Brawny, Quilted Northern, Dixie, Angel Soft, Sparkle) — alternatives include Seventh Generation, Who Gives A Crap, recycled-content store brands", "Lycra/Invista synthetic fibers — alternatives include natural fibers (cotton, wool, linen) or recycled synthetic fibers from non-Koch manufacturers"],
    "healthier": ["Natural fiber clothing — cotton, wool, linen — avoids synthetic fiber manufacturing pollution", "Recycled paper products — reduces virgin timber demand and associated water pollution from Georgia-Pacific mills"],
    "diy": ["Washable cloths replace paper towels (Brawny/Sparkle) — eliminates ongoing purchase and reduces waste", "Identify Koch brands at KochBrands.com or through consumer apps — making informed purchasing decisions is the direct action available"]
  },
  "timeline": [
    {"year": 1940, "event": "Fred Koch founds Wood River Oil and Refining Company; builds refineries for Stalin's Soviet Union and Hitler's Germany", "severity": "high", "source_url": ""},
    {"year": 1967, "event": "Charles Koch takes control of company; begins systematic expansion", "severity": "neutral", "source_url": ""},
    {"year": 1980, "event": "David Koch runs for Vice President on Libertarian ticket; begins political network development", "severity": "neutral", "source_url": ""},
    {"year": 1997, "event": "Greenpeace identifies Koch as largest corporate funder of climate denial — outspending ExxonMobil 3:1", "severity": "critical", "source_url": ""},
    {"year": 1999, "event": "$10M settlement: stealing oil from Native American and federal lands through meter manipulation over 3 years", "severity": "critical", "source_url": ""},
    {"year": 2000, "event": "$35M record oil spill settlement: 300 spills, 3 million gallons; $8M criminal plea for benzene emissions cover-up", "severity": "critical", "source_url": ""},
    {"year": 2004, "event": "Americans for Prosperity formally established by David Koch; becomes primary political vehicle", "severity": "high", "source_url": ""},
    {"year": 2010, "event": "Citizens United decision; Koch network dramatically expands political spending", "severity": "high", "source_url": ""},
    {"year": 2016, "event": "Koch network pledges $889M for election cycle — rivaling the Republican National Committee in scale", "severity": "critical", "source_url": ""},
    {"year": 2019, "event": "David Koch dies; Charles continues network; Koch network pivots from Trump toward institutional conservatism", "severity": "moderate", "source_url": ""},
    {"year": 2022, "event": "Total documented climate denial funding exceeds $127M to 84 organizations since 1997", "severity": "critical", "source_url": "https://www.greenpeace.org/usa/climate/climate-deniers/koch-industries"}
  ],
  "community_impact": {
    "displacement": "Communities near Koch refineries in Texas, Minnesota, and other states bear disproportionate air quality impacts. The 300 oil spills contaminated waterways in communities that relied on them for drinking water, fishing, and recreation. Native American communities whose lands were targeted for oil theft had no recourse for the stolen resources beyond the eventual DOJ settlement.",
    "price_illusion": "Koch Industries' products — paper towels, toilet paper, synthetic fibers, fertilizer, oil — are priced without accounting for the externalized costs of pollution, climate damage, and political spending to prevent accountability. The price at the checkout does not include the cost of the oil spills, the benzene cancer, or the climate action blocked.",
    "tax_math": "Koch's political network spent $20M+ lobbying for the 2017 Tax Cuts and Jobs Act, which benefited the company through reduced corporate rates and pass-through provisions. The return on that $20M political investment — in reduced tax liability on $100B+ in annual revenue — is enormous. This is regulatory capture as explicit financial strategy.",
    "wealth_velocity": "Charles Koch's $60B+ fortune is concentrated in a private company with no disclosure requirements. The political network that protects that fortune operates through untraceable dark money channels. The profits of Koch's industrial operations — generated through environmental violations and denial of climate regulation — flow to one of the wealthiest individuals on earth."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Charles and David Koch", "how": "$60B+ fortune built on fossil fuels, paper, and chemicals while blocking the regulations that would have increased costs"},
      {"group": "Koch political network beneficiaries", "how": "Conservative movement funded at $889M per election cycle; judicial appointments shaped; climate legislation blocked"},
      {"group": "Koch's industrial competitors", "how": "By opposing environmental regulations, Koch leveled the playing field at the lowest compliance standard"}
    ],
    "who_paid": [
      {"group": "Communities near Koch facilities", "how": "Air pollution, benzene contamination, oil spills in waterways, water contamination"},
      {"group": "Native American communities", "how": "300 million gallons of oil stolen from tribal lands over 3 years"},
      {"group": "Future generations", "how": "Climate action delayed by decades by the most well-funded private denial network in history"},
      {"group": "Workers whose unions were targeted", "how": "AFP campaigns in Wisconsin, Michigan, and elsewhere attacked collective bargaining rights"}
    ],
    "the_gap": "The same company that paid $35 million for 300 oil spills spent $127 million telling the public that environmental science is fraudulent. The spills are documented. The funding is documented. The blocked climate legislation is documented. Charles Koch's $60 billion is documented."
  }
},
  "profiles_v7/samsung.json": {
  "brand_name": "Samsung",
  "brand_slug": "samsung",
  "parent_company": "Samsung Electronics Co. Ltd.",
  "ultimate_parent": "Samsung Group (Lee family)",
  "subsidiaries": ["Samsung Display", "Samsung Semiconductor", "Samsung SDI", "Samsung SDS", "Samsung Heavy Industries"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "SAMSUNG'S CHAIRMAN WAS CONVICTED OF BRIBERY AND SENT TO PRISON — THEN PARDONED AND PUT BACK IN CHARGE",
  "executive_summary": "Samsung is South Korea's largest conglomerate and the world's largest manufacturer of smartphones, semiconductors, and consumer electronics, with annual revenue exceeding $200 billion. Samsung Group companies account for approximately 20% of South Korea's total exports. Lee Jae-yong, Samsung's de facto chairman, was convicted of bribery in connection with South Korea's 2016 corruption scandal involving President Park Geun-hye — he paid bribes to the president's confidante to secure government support for a merger. He was imprisoned twice, released on parole, and received a presidential pardon in 2022 — returning to lead Samsung despite his criminal conviction. Samsung has also faced documented labor violations, union suppression, and environmental contamination at semiconductor facilities.",
  "verdict_tags": ["chairman_bribery_conviction", "presidential_corruption_scandal", "pardon_return_to_power", "union_suppression", "labor_violations", "semiconductor_contamination"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Samsung uses complex intercompany transactions among its numerous subsidiaries to minimize tax obligations. South Korea's chaebol structure — family-controlled conglomerates with complex cross-ownership — allows significant wealth transfer between generations through opaque mechanisms. The Lee family controls Samsung through a web of cross-shareholdings with relatively small direct ownership. Samsung Electronics has been cited for transfer pricing arrangements and has faced tax authority challenges in multiple countries.",
    "flags": ["chaebol_cross_ownership_structure", "transfer_pricing_international", "family_control_complex_shareholding"],
    "sources": []
  },
  "legal": {
    "summary": "2017: Lee Jae-yong convicted of bribery and embezzlement in connection with the 'Choi gate' scandal — bribing then-President Park Geun-hye's confidante Choi Soon-sil with 8.6 billion won ($7.4 million) to secure government support for a Samsung merger. Lee was sentenced to 5 years, had the sentence reduced to 2.5 years, was released on parole after 1 year, then re-arrested in 2021 and sentenced to 30 months, paroled in August 2022, and received a full presidential pardon from President Yoon Suk-yeol in August 2022. Samsung has been repeatedly fined and cited by Korean labor authorities for union suppression. The company has faced multiple NLRB-equivalent actions for systematic anti-union activities.",
    "flags": ["bribery_conviction_criminal", "double_imprisonment_double_release", "presidential_pardon_return_to_control", "systematic_union_suppression"],
    "sources": []
  },
  "labor": {
    "summary": "Samsung has operated a documented 'no union' policy for most of its history. The company deployed a dedicated internal team to monitor and suppress union organizing — a practice documented by Korean labor authorities and human rights organizations. In 2020, Samsung's new chairman Lee Jae-yong publicly apologized for the company's anti-union practices and pledged to allow unionization — the first acknowledgment in the company's history. Despite the apology, union suppression complaints have continued at various Samsung facilities. Workers at Samsung semiconductor facilities in South Korea have raised documented concerns about occupational cancer rates linked to chemical exposure.",
    "flags": ["decades_no_union_policy", "dedicated_union_suppression_team", "semiconductor_worker_occupational_cancer", "2020_apology_insufficient"],
    "sources": []
  },
  "environmental": {
    "summary": "Samsung's semiconductor manufacturing involves extensive use of toxic chemicals including hydrofluoric acid, arsenic, and various solvents. Workers at Samsung's semiconductor plants in South Korea have developed occupational cancers — leukemia, lymphoma, and brain tumors — at rates that have been documented in research and litigation. Samsung initially denied any connection between its chemicals and worker health outcomes. An advocacy group called SHARPS (Supporters for Health and Rights of People in the Semiconductor Industry) has documented over 200 cases of cancer and other serious diseases among Samsung semiconductor workers. The company eventually established a compensation program. Samsung's massive electronics manufacturing generates significant e-waste globally.",
    "flags": ["semiconductor_chemical_toxicity", "200_worker_cancer_cases_documented", "occupational_disease_denial_then_settlement", "e_waste_scale"],
    "sources": []
  },
  "political": {
    "summary": "Samsung's bribery scandal exposed the fundamental relationship between South Korea's chaebol conglomerates and political power. The Lee family's payment to President Park's confidante was for government support of a Samsung merger — a transaction that would benefit the Lee family's control of Samsung Group. This type of transactional relationship between chaebols and Korean political power has been documented across multiple conglomerates. In the United States, Samsung has lobbied extensively on trade policy, semiconductor subsidies (CHIPS Act), and patent law.",
    "flags": ["chaebol_political_corruption_system", "park_geun_hye_scandal_link", "us_chips_act_lobbying", "trade_policy_lobbying"],
    "sources": []
  },
  "executives": {
    "summary": "Lee Jae-yong — pardoned chairman — controls Samsung through the family's cross-shareholding structure. His father Lee Kun-hee, who died in 2020, had also been convicted of tax evasion and received a presidential pardon. The pattern of criminal conviction and presidential pardon is documented across two generations of Samsung leadership. The Korean government's dependence on Samsung — which represents 20% of national exports — creates structural pressure to pardon Samsung executives rather than allow criminal consequences to stand.",
    "flags": ["two_generation_pardon_pattern", "father_also_convicted_pardoned", "national_export_dependence_creates_pardon_pressure"],
    "sources": []
  },
  "connections": {
    "summary": "Samsung Group operates through approximately 60 affiliated companies in areas including electronics, insurance, construction, and theme parks. This conglomerate structure — common among Korean chaebols — creates interconnections between Samsung Electronics (which consumers know) and the broader business empire. Samsung's semiconductor manufacturing connects it to every major technology company — Apple, Qualcomm, NVIDIA, and others rely on Samsung chips. This dependency gives Samsung leverage in its business relationships. Samsung's political connections extend through its relationship with South Korean government economic policy.",
    "flags": ["60_affiliated_companies", "semiconductor_supply_critical_dependency", "apple_qualcomm_nvidia_supply_dependence"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "SHARPS and Korean labor researchers have alleged that Samsung's internal health monitoring of semiconductor workers was designed to minimize documentation of chemical exposures rather than protect worker health — creating a record that would be difficult to use in occupational disease litigation. Former Samsung managers have alleged that the company's internal epidemiological studies showing elevated cancer rates among semiconductor workers were suppressed rather than disclosed to workers or regulators. Labor rights researchers have alleged that Samsung's 2020 anti-union apology was strategic rather than sincere — that anti-union monitoring continued through different organizational structures.",
    "flags": ["health_monitoring_suppression_alleged", "cancer_study_suppression_alleged", "continued_union_monitoring_post_apology_alleged"],
    "sources": []
  },
  "health_record": {
    "summary": "Samsung semiconductor facilities' chemical environment has been linked to elevated rates of occupational cancer among workers. SHARPS documented over 200 cases of serious disease — leukemia, lymphoma, brain tumors, multiple sclerosis — among Samsung semiconductor workers and their family members. Samsung denied for years that working conditions caused these outcomes. The company eventually established a compensation program, paying settlements to affected workers and families. The semiconductor industry's occupational disease risk is not unique to Samsung, but Samsung's denial and suppression of health concerns is documented.",
    "flags": ["200_documented_cancer_cases", "leukemia_lymphoma_brain_tumor_pattern", "denial_then_compensation_program", "family_member_impacts"],
    "sources": []
  },
  "alternatives": {
    "cheaper": ["Refurbished smartphones — dramatically lower cost, reduces e-waste, avoids full manufacturing chain", "Google Pixel phones — different manufacturer, competitive pricing", "OnePlus, Motorola — often 50-60% lower price than flagship Samsung with comparable features"],
    "healthier": ["Extended product lifecycles — keeping phones 3-4 years instead of 2 reduces total manufacturing demand", "Right-to-repair advocacy — Samsung has opposed right-to-repair legislation that would allow independent repair and extend device life"],
    "diy": ["Phone repair services for cracked screens and battery replacements dramatically extend device life — Samsung has opposed making this easier", "Second-hand electronics markets — extends useful life of existing devices before entering waste stream", "Buying one generation old models at 30-40% discount — same hardware, fraction of the price"]
  },
  "timeline": [
    {"year": 1938, "event": "Samsung founded by Lee Byung-chul as a trading company in Korea", "severity": "neutral", "source_url": ""},
    {"year": 1969, "event": "Samsung Electronics established; begins consumer electronics manufacturing", "severity": "neutral", "source_url": ""},
    {"year": 1996, "event": "Samsung chairman Lee Kun-hee (Lee Jae-yong's father) convicted of bribery — first generation conviction", "severity": "high", "source_url": ""},
    {"year": 2008, "event": "Lee Kun-hee receives presidential pardon — first generation pardon", "severity": "high", "source_url": ""},
    {"year": 2007, "event": "SHARPS begins documenting semiconductor worker cancers; Samsung denies connection", "severity": "critical", "source_url": ""},
    {"year": 2016, "event": "South Korea 'Choi gate' scandal; Lee Jae-yong implicated in presidential bribery", "severity": "critical", "source_url": ""},
    {"year": 2017, "event": "Lee Jae-yong arrested and convicted of bribery; sentenced to 5 years", "severity": "critical", "source_url": ""},
    {"year": 2018, "event": "Sentence reduced; paroled after 1 year; returns to control Samsung", "severity": "high", "source_url": ""},
    {"year": 2020, "event": "Lee publicly apologizes for anti-union practices; pledges to allow unionization", "severity": "moderate", "source_url": ""},
    {"year": 2021, "event": "Re-arrested; sentenced to 30 months for additional bribery charges", "severity": "critical", "source_url": ""},
    {"year": 2022, "event": "Paroled August 2022; full presidential pardon from President Yoon; returns to lead Samsung", "severity": "critical", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Samsung's dominance of South Korea's economy creates a 'too big to fail' dynamic that enables executive criminal conduct to be pardoned rather than penalized. The Lee family's accumulation of control through the chaebol structure has been documented to concentrate South Korea's economic power in a single family in ways that distort competitive markets.",
    "price_illusion": "Samsung smartphones are priced as premium consumer products. The price does not include the occupational disease costs of semiconductor workers, the environmental cost of rare earth mining, or the political corruption cost of maintaining the Lee family's control through government bribery.",
    "tax_math": "The chaebol structure allows the Lee family to maintain control of Samsung through complex cross-shareholdings while minimizing the inheritance taxes that would apply to direct ownership transfer. Lee Kun-hee's heirs paid approximately $11 billion in inheritance taxes in 2021 — significant but a fraction of what direct ownership transfer would have required.",
    "wealth_velocity": "Samsung's global consumer electronics revenue — generated from hundreds of millions of devices sold globally — concentrates in the Lee family's control through the chaebol cross-ownership structure. The presidential pardons that return Lee Jae-yong to power ensure this concentration continues."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Lee family", "how": "Control of Samsung Group despite criminal convictions; two presidential pardons across two generations"},
      {"group": "Korean government (transactional)", "how": "Bribery payments enabled government officials to fund personal enrichment"},
      {"group": "Samsung shareholders globally", "how": "Stock value maintained through continuity of Lee family control despite criminal conduct"}
    ],
    "who_paid": [
      {"group": "Semiconductor workers with occupational cancer", "how": "200+ documented cases of leukemia, lymphoma, brain tumors; Samsung denied connection for years"},
      {"group": "Samsung workers denied unionization", "how": "Decades of suppressed collective bargaining rights; lower wages and worse conditions than unionized peers"},
      {"group": "South Korean democratic institutions", "how": "Presidential corruption enabled by chaebol bribery culture; Park Geun-hye imprisoned; entire political system destabilized"}
    ],
    "the_gap": "Lee Jae-yong's father was convicted and pardoned. Lee Jae-yong was convicted twice and pardoned. The next generation will likely be convicted and pardoned. This is not corruption as exception — it is the operating system."
  }
},
  "profiles_v7/shell.json": {
  "brand_name": "Shell",
  "brand_slug": "shell",
  "parent_company": "Shell PLC",
  "ultimate_parent": "Shell PLC",
  "subsidiaries": ["Shell Chemicals", "Shell Energy", "Shell Trading", "Raízen (biofuels JV)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "SHELL KNEW ABOUT CLIMATE CHANGE IN 1986 AND SPENT THE NEXT 40 YEARS DENYING IT WHILE OPERATING IN THE NIGER DELTA",
  "executive_summary": "Shell PLC is the second-largest oil company in Europe and one of the largest corporations on earth, with annual revenues exceeding $280 billion. Internal Shell documents from 1986 — revealed in investigative reporting — show the company had detailed scientific understanding of climate change and its own contribution to it. Rather than disclose this knowledge, Shell funded or participated in climate denial organizations and lobbied against climate regulations for four decades. Simultaneously, Shell's operations in Nigeria's Niger Delta have caused decades of oil contamination across millions of acres, affecting communities that have received little compensation or remediation. A Dutch court in 2021 ordered Shell to cut emissions 45% by 2030 — Shell appealed and won a partial reversal in 2024.",
  "verdict_tags": ["climate_denial_internal_knowledge", "niger_delta_contamination", "court_ordered_emissions_cut", "human_rights_violations", "greenwashing", "political_influence"],
  "concern_flags": {"labor": false, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Shell has used complex international holding structures, transfer pricing between subsidiaries in different tax jurisdictions, and commodity trading arrangements to minimize global tax obligations. The company's trading arm in Singapore and Switzerland routes significant profit through low-tax jurisdictions. Shell has received substantial government subsidies globally through fossil fuel support programs. In multiple countries Shell has paid effective tax rates well below statutory rates.",
    "flags": ["transfer_pricing_singapore_switzerland", "fossil_fuel_subsidies_global", "below_statutory_effective_rates"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2021: A Dutch District Court ordered Shell to cut its global carbon emissions 45% by 2030 compared to 2019 levels — the first court ruling globally to order a private company to align with the Paris Agreement. Shell appealed; a Dutch appeals court in 2024 overturned the hard 45% target while affirming Shell has a duty to reduce emissions. Multiple Nigerian courts have ordered Shell to clean up Niger Delta oil contamination; Shell has paid partial settlements while contamination continues. Shell paid $84 million to Nigerian Ogoni communities in 2015 after a 13-year lawsuit over contamination from oil spills. In 1995, Shell's Nigerian subsidiary was implicated in the execution of Ken Saro-Wiwa and eight other Ogoni activists by the Nigerian military government — Shell denied requesting the executions but paid $15.5 million to settle a U.S. lawsuit brought by the activists' families.",
    "flags": ["dutch_court_emissions_order", "niger_delta_contamination_courts", "ken_saro_wiwa_execution_settlement", "15_5m_activists_settlement"],
    "sources": ["https://www.courtlistener.com", "https://amnesty.org"]
  },
  "labor": {
    "summary": "Shell employs approximately 90,000 people globally. The company has made multiple rounds of workforce reductions in its 'energy transition' restructuring. Shell's operations in Nigeria, the Philippines, and other developing countries have employed workers under documented conditions that have been criticized by labor rights organizations. The company's shift toward renewable energy — while maintaining offshore oil drilling — has created workforce uncertainty.",
    "flags": ["developing_country_labor_standards", "energy_transition_layoffs", "workforce_uncertainty"],
    "sources": []
  },
  "environmental": {
    "summary": "Shell's operations in Nigeria's Niger Delta since the 1950s have caused what Amnesty International has called one of the world's worst ongoing environmental disasters. Decades of pipeline leaks and spills have contaminated 2,000-3,000 square kilometers of land and 70 years of oil production have left communities without clean water, destroyed fishing economies, and contaminated food sources. Shell has settled multiple lawsuits while contamination continues. Separately, Shell's global operations contribute approximately 2% of global greenhouse gas emissions annually. The 1986 internal documents showed Shell understood its products were the primary driver of climate change.",
    "flags": ["niger_delta_worst_environmental_disaster", "2000_sq_km_contamination", "internal_climate_knowledge_1986", "2pct_global_emissions"],
    "sources": ["https://www.amnesty.org", "https://www.theguardian.com"]
  },
  "political": {
    "summary": "Shell has been documented funding climate denial organizations while publicly stating it supports climate action. The company was a member of the Global Climate Coalition — an industry group that downplayed climate science — until the coalition dissolved in 2002. Shell funds ALEC in the United States. The company has lobbied against climate regulations in the EU, UK, US, and internationally through trade associations. In the Netherlands, Shell successfully lobbied for years against the regulatory framework that ultimately led to the court order against it.",
    "flags": ["global_climate_coalition_membership", "alec_funding", "multi_jurisdiction_climate_lobbying", "public_support_vs_private_denial"],
    "sources": []
  },
  "executives": {
    "summary": "CEO Wael Sawan received $9.7 million in total compensation in 2023. Shell's executive compensation is tied to production metrics and financial performance, creating incentives that conflict with the emissions reduction the company publicly supports. Sawan, who took over in 2023, signaled a pivot away from some renewable energy commitments, reducing targets in favor of higher short-term fossil fuel returns.",
    "flags": ["production_tied_compensation", "renewable_energy_retreat_under_sawan"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Shell shares major institutional investors with BP, TotalEnergies, and ExxonMobil — creating aligned incentives across the major oil companies against aggressive climate regulation. Shell's membership in trade associations including the American Petroleum Institute, International Association of Oil & Gas Producers, and the Oil and Gas Climate Initiative connects it to industry-wide lobbying coordination. Shell's Nigerian operations were conducted through Shell Petroleum Development Company — a joint venture with the Nigerian government — creating a documented relationship between Shell's operations and the Nigerian military government implicated in human rights abuses.",
    "flags": ["cross_oil_company_investor_alignment", "api_industry_lobbying_coordination", "nigerian_military_joint_venture"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Amnesty International and Nigerian civil society organizations have alleged that Shell knew about specific pipeline spills in the Niger Delta for years before undertaking any remediation, and that the company's internal leak reports significantly undercounted the actual volume of contamination. Investigative reporting by the Guardian in 2023 revealed Shell's internal 1986 and 1988 documents showing sophisticated understanding of climate change — and documented that Shell continued funding denial organizations with this knowledge. Environmental lawyers have alleged that Shell's claims about source of Nigeria spills — attributing contamination to 'oil theft' and 'sabotage' rather than company negligence — are used systematically to avoid remediation liability.",
    "flags": ["niger_delta_spill_underreporting_alleged", "1986_climate_knowledge_denial_documented", "oil_theft_sabotage_liability_avoidance_alleged"],
    "sources": ["https://www.theguardian.com", "https://www.amnesty.org"]
  },
  "health_record": {
    "summary": "Communities in Nigeria's Niger Delta experience some of the worst documented environmental health impacts of any oil-producing region. Studies of Ogoni communities — where Shell operations were most concentrated — have found elevated cancer rates, respiratory disease, and maternal health complications associated with contaminated water and air. Fish and crops in contaminated areas have been found to contain hydrocarbon levels far above safe consumption thresholds, destroying the food security of fishing communities. Shell's global emissions contribute to climate-driven heat deaths, extreme weather, and disease pattern shifts affecting billions globally.",
    "flags": ["ogoni_cancer_respiratory_rates", "food_source_hydrocarbon_contamination", "fishing_economy_destruction", "global_emissions_health_impacts"],
    "sources": ["https://www.amnesty.org", "https://www.ncbi.nlm.nih.gov"]
  },
  "alternatives": {
    "cheaper": ["Electric vehicles + home solar eliminate gasoline dependency on Shell entirely over time", "Public transit — collective transport dramatically reduces per-person fuel consumption", "E-bikes for urban commuting — zero fuel cost, zero emissions"],
    "healthier": ["Community solar and wind programs — electricity that doesn't require burning hydrocarbons", "Heat pumps replacing gas heating — more efficient and decouples home energy from fossil fuels"],
    "diy": ["Boycott Shell specifically at the pump — Mobil, BP, Chevron remain problematic but Shell's Nigeria record makes it a distinct choice", "Reduce home natural gas use through weatherization and electrification", "Vote for candidates who support carbon pricing — the structural solution that changes Shell's business model"]
  },
  "timeline": [
    {"year": 1907, "event": "Royal Dutch Shell formed from merger of Royal Dutch Petroleum and Shell Transport and Trading", "severity": "neutral", "source_url": ""},
    {"year": "1950s", "event": "Shell begins oil extraction in Nigeria's Niger Delta", "severity": "neutral", "source_url": ""},
    {"year": 1986, "event": "Internal Shell report documents detailed understanding of climate change — never disclosed publicly", "severity": "critical", "source_url": ""},
    {"year": 1995, "event": "Ken Saro-Wiwa and eight Ogoni activists executed by Nigerian military; Shell implicated in facilitating the action", "severity": "critical", "source_url": ""},
    {"year": 2009, "event": "$15.5M settlement with families of Saro-Wiwa and other executed activists — no admission of wrongdoing", "severity": "high", "source_url": ""},
    {"year": 2015, "event": "$84M settlement with Ogoni communities for Niger Delta contamination after 13-year lawsuit", "severity": "high", "source_url": ""},
    {"year": 2021, "event": "Dutch court orders Shell to cut global emissions 45% by 2030 — first such corporate climate ruling globally", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "Guardian investigation publishes Shell's 1986 internal climate documents showing decades-long denial with internal knowledge", "severity": "critical", "source_url": "https://www.theguardian.com"},
    {"year": 2024, "event": "Dutch appeals court partially overturns 45% emissions target; Shell retreats from renewable energy commitments", "severity": "high", "source_url": ""},
    {"year": 2024, "event": "CEO announces shift toward higher fossil fuel returns; renewable energy spending reduced", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Shell's Niger Delta operations have made large areas of the Ogoni territory — and broader Niger Delta communities — uninhabitable for traditional fishing and agricultural economies. Communities that subsisted on fishing and farming for generations have lost their livelihoods to oil contamination. The political repression that accompanied Shell's operations — culminating in the execution of activists — displaced community leadership.",
    "price_illusion": "Gasoline prices at Shell stations do not include the cost of Niger Delta contamination remediation, climate change damage, or the public health impacts of fossil fuel combustion. The price is artificially low because these costs are externalized to Nigerian communities, to the global atmosphere, and to future generations.",
    "tax_math": "Shell receives fossil fuel subsidies globally estimated in the billions annually. The company's tax arrangements in trading hubs like Singapore and Switzerland reduce tax obligations in the operating countries where environmental damage occurs — Nigeria, for example, receives less in Shell tax revenue than it bears in environmental cost.",
    "wealth_velocity": "Shell's profits flow to institutional shareholders globally — predominantly in the United Kingdom, Netherlands, and the United States. The Niger Delta communities where the oil is extracted see environmental destruction. The financial returns accrue to shareholders on three continents."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Shell shareholders globally", "how": "Seven decades of oil profits from Nigerian extraction; ongoing global fossil fuel revenue"},
      {"group": "Nigerian government (partial)", "how": "Royalties and taxes from oil production — though far less than the environmental liability externalized to communities"},
      {"group": "Consumer economies", "how": "Cheap oil priced without environmental externalities"}
    ],
    "who_paid": [
      {"group": "Ogoni and Niger Delta communities", "how": "70 years of contamination; destroyed fishing and agricultural economies; Ken Saro-Wiwa and eight others executed"},
      {"group": "Global climate", "how": "40 years of climate denial with internal knowledge; 2% of global emissions annually"},
      {"group": "Future generations", "how": "Climate damage from emissions locked in by decades of denial-funded inaction"}
    ],
    "the_gap": "Shell knew in 1986. They funded denial for 40 more years. The Ogoni knew the entire time — they were living in it. Saro-Wiwa was executed for saying so. Shell paid $15.5 million to his family and admitted nothing."
  }
},
  "profiles_v7/tiktok-bytedance.json": {
  "brand_name": "TikTok / ByteDance",
  "brand_slug": "tiktok-bytedance",
  "parent_company": "ByteDance Ltd.",
  "ultimate_parent": "ByteDance Ltd. (Zhang Yiming, founder)",
  "subsidiaries": ["TikTok", "Douyin (China)", "CapCut", "Lemon8", "Pico (VR)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "TIKTOK COLLECTED U.S. USER DATA, ROUTED IT TO CHINA, AND PAID $92 MILLION FOR SPYING ON CHILDREN",
  "executive_summary": "TikTok is the most-downloaded app in the world with approximately 1.7 billion users globally and 170 million in the United States. ByteDance, the Chinese parent company, is one of the most valuable private companies on earth. TikTok has been the subject of sustained national security concerns from the U.S. government based on: its Chinese ownership, the potential for ByteDance to share U.S. user data with the Chinese government under China's National Intelligence Law, documented cases of ByteDance employees accessing U.S. user data from China, and TikTok's algorithm potentially being used to influence information environments. TikTok paid $92 million in 2021 to settle federal class action lawsuits for illegally collecting biometric data from minors. The U.S. passed legislation requiring ByteDance to divest TikTok or face a ban — ByteDance appealed and continues operating.",
  "verdict_tags": ["child_data_collection", "biometric_data_92m_settlement", "national_security_concerns", "chinese_data_access_documented", "algorithm_manipulation_alleged", "congressional_ban_legislation"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "ByteDance uses a Cayman Islands holding structure with operating subsidiaries in Singapore and China. This variable interest entity (VIE) structure — common for Chinese companies listing internationally — creates complex ownership arrangements designed to circumvent Chinese restrictions on foreign ownership of internet companies. TikTok's U.S. revenues — estimated at $16 billion in 2023 — are routed through this structure in ways that minimize U.S. tax obligations. ByteDance's effective global tax rate has been examined by tax authorities in multiple jurisdictions.",
    "flags": ["cayman_islands_holding", "vie_structure_opacity", "us_revenue_offshore_routing"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2021: TikTok paid $92 million to settle a federal class action lawsuit for illegally collecting biometric data — including faceprints and voiceprints — from minors under BIPA (Illinois Biometric Information Privacy Act) without consent. 2023: FTC referred ByteDance/TikTok to DOJ for violations of COPPA (Children's Online Privacy Protection Act) — the same violations TikTok had previously settled for $5.7 million in 2019. The FTC found ongoing violations after the initial settlement. U.S. Congress passed legislation in 2024 requiring ByteDance to divest TikTok within 9 months or face a ban — ByteDance appealed to the Supreme Court; the Court unanimously upheld the law. TikTok continued operating under Biden administration forbearance and Trump administration negotiations.",
    "flags": ["92m_biometric_data_settlement", "coppa_violations_ftc_doj_referral", "repeat_child_privacy_violations", "divestiture_law_supreme_court_upheld"],
    "sources": ["https://www.ftc.gov", "https://www.justice.gov"]
  },
  "labor": {
    "summary": "TikTok employs approximately 7,000 people in the United States. The company has conducted multiple rounds of layoffs globally as it manages the uncertainty of its U.S. operational future. Content moderators at TikTok — including contractors — have reported significant psychological harm from exposure to violent, abusive, and disturbing content required for moderation review. ByteDance's workforce in China operates under the labor conditions common to Chinese technology companies, including documented pressure cultures.",
    "flags": ["content_moderator_psychological_harm", "workforce_uncertainty_layoffs", "chinese_labor_conditions"],
    "sources": []
  },
  "environmental": {
    "summary": "TikTok's server infrastructure and global data centers represent a significant and growing energy consumption footprint. The video streaming model — short-form video requires more data per viewing minute than other content types — generates substantial energy use. ByteDance's data centers in China rely heavily on coal-powered electricity. The company's environmental commitments lag well behind its global peers.",
    "flags": ["data_center_coal_energy_china", "video_streaming_energy_intensity", "environmental_commitment_gap"],
    "sources": []
  },
  "political": {
    "summary": "The national security concern about TikTok is not primarily about what ByteDance has done — it is about what China's National Intelligence Law could require ByteDance to do: share user data, manipulate the algorithm for propaganda purposes, or conduct surveillance of specific individuals. Documented cases include: ByteDance employees in China accessing U.S. user data without authorization (admitted by ByteDance); TikTok executives stating that China-based employees can access global user data; and a ByteDance employee surveilling a Forbes reporter's TikTok data to identify their sources. TikTok's lobbying operation — including hiring dozens of former congressional staffers and spending $8.7 million in 2023 — is among the most aggressive of any technology company.",
    "flags": ["china_national_intelligence_law_obligation", "us_user_data_china_access_admitted", "reporter_surveillance_documented", "aggressive_lobbying_post_threat"],
    "sources": ["https://www.forbes.com"]
  },
  "executives": {
    "summary": "TikTok CEO Shou Zi Chew testified before Congress in 2023 in a hearing that became one of the most-watched congressional testimonions in recent history. He denied that TikTok was a national security threat while unable to guarantee that ByteDance would never share U.S. user data with the Chinese government. ByteDance founder Zhang Yiming stepped down as CEO in 2021 while remaining a major shareholder. The company's leadership is predominantly Chinese nationals, raising questions — which ByteDance disputes — about the practical separation between ByteDance and Chinese government influence.",
    "flags": ["shou_zi_chew_congressional_testimony", "unable_guarantee_data_protection", "chinese_national_leadership"],
    "sources": []
  },
  "connections": {
    "summary": "ByteDance's major investors include Sequoia Capital, SoftBank, Susquehanna International Group, and KKR — major U.S. and international investors with significant financial interest in TikTok's continued operation. These investors have lobbied against the divestiture requirement. TikTok's algorithm — which ByteDance has said is proprietary and cannot be divested with the platform — is the core product that makes TikTok valuable. The algorithm determines what 1.7 billion users see, creating an extraordinary information influence capability. ByteDance's Douyin — the Chinese version of TikTok — operates under Chinese content censorship rules while TikTok claims editorial independence.",
    "flags": ["sequoia_kkr_softbank_investors_lobby_against_divestiture", "algorithm_information_control_1_7b_users", "douyin_censorship_tiktok_claimed_independence_contradiction"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Former TikTok employees have alleged that the company maintained a shadow list of content to suppress — boosting certain political content while demoting other content — in ways not disclosed to users or researchers. Senate Intelligence Committee documents have alleged that ByteDance has provided the Chinese Communist Party with non-public data about U.S. users. Child safety researchers have alleged that TikTok's algorithm actively recommends harmful content — eating disorder content, self-harm content, and extremist content — to teenagers in ways that compound mental health risks. The Wall Street Journal's 2021 investigation documented that TikTok's algorithm fed increasingly extreme content to test accounts set up to appear as depressed or suicidal teenagers.",
    "flags": ["shadow_content_suppression_alleged", "ccp_data_sharing_senate_alleged", "harmful_content_algorithm_documented", "wsj_teen_mental_health_investigation"],
    "sources": ["https://www.wsj.com"]
  },
  "health_record": {
    "summary": "TikTok's algorithmic amplification of harmful content to minors is the most documented health concern. The Wall Street Journal investigation in 2021 found that TikTok's algorithm served increasingly extreme content to accounts exhibiting signs of depression or suicidal ideation — compounding rather than interrupting mental health crises. The American Psychological Association has documented associations between short-form video use and decreased attention span, sleep disruption, and increased anxiety in adolescents. Multiple states have filed lawsuits against TikTok for deliberately designing features that maximize addiction in minors. The biometric data collection — paying $92 million to settle — involved collecting data from children without consent.",
    "flags": ["algorithm_serves_harmful_content_to_depressed_teens", "apa_adolescent_mental_health_documented", "state_lawsuits_addiction_by_design", "child_biometric_collection"],
    "sources": ["https://www.wsj.com", "https://www.apa.org"]
  },
  "alternatives": {
    "cheaper": ["YouTube Shorts — same short-form video format, U.S.-headquartered, no ByteDance data concerns", "Instagram Reels — Meta-owned, same format; Meta has documented data issues but different national security profile", "Pinterest — lower engagement-optimization, less documented harm to teen mental health"],
    "healthier": ["Digital time limits — iOS Screen Time and Android Digital Wellbeing allow hard limits on TikTok use", "Grayscale mode reduces dopamine response to the app — built into both iOS and Android settings", "Following accounts that promote healthy content rather than relying on TikTok's algorithm to curate"],
    "diy": ["TikTok's algorithm is driven by engagement — liking, sharing, and commenting trains it toward your actual interests rather than addictive content", "Parents: TikTok Family Pairing allows monitoring of teen accounts, but the algorithm still operates", "Advocacy for algorithmic transparency legislation — requiring platforms to disclose how content is recommended and give users meaningful control"]
  },
  "timeline": [
    {"year": 2012, "event": "ByteDance founded by Zhang Yiming in Beijing", "severity": "neutral", "source_url": ""},
    {"year": 2017, "event": "TikTok launched internationally; ByteDance acquires Musical.ly and merges it into TikTok", "severity": "neutral", "source_url": ""},
    {"year": 2019, "event": "FTC: $5.7M settlement for COPPA violations — illegally collecting data from children under 13", "severity": "high", "source_url": ""},
    {"year": 2020, "event": "Trump administration attempts to ban TikTok; courts block; ByteDance negotiations with Oracle and Walmart fail", "severity": "high", "source_url": ""},
    {"year": 2021, "event": "$92M settlement for BIPA biometric data violations — collecting faceprints and voiceprints from minors", "severity": "critical", "source_url": ""},
    {"year": 2021, "event": "WSJ investigation documents TikTok algorithm serving harmful content to simulated depressed teen accounts", "severity": "critical", "source_url": ""},
    {"year": 2022, "event": "ByteDance employee surveils Forbes journalist's TikTok data to identify sources — admitted and employee fired", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "Shou Zi Chew testifies before Congress; FTC refers case to DOJ for COPPA violations — second COPPA action", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "U.S. law passed requiring ByteDance divestiture or ban; Supreme Court upholds unanimously; TikTok continues operating", "severity": "critical", "source_url": ""},
    {"year": 2025, "event": "Trump administration grants extensions; negotiations with various buyers continue; status unresolved", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "TikTok's business model — maximizing engagement time — has displaced other activities, particularly among teenagers. Research documents decreased reading, face-to-face social interaction, sleep, and physical activity among heavy TikTok users. The platform has also displaced other social media and content platforms by capturing attention share.",
    "price_illusion": "TikTok is free to use. The price is the data — including biometric data collected from children — and the attention, which is sold to advertisers. The mental health cost of addictive design, the national security cost of potential Chinese government data access, and the civic cost of potential algorithmic influence on political information are not visible in the app's pricing.",
    "tax_math": "TikTok's $16 billion in U.S. advertising revenue (estimated) flows through ByteDance's offshore structure. The U.S. generates the revenue; the taxes are minimized through Cayman Islands and Singapore structures. American advertisers pay; the tax obligation is minimized.",
    "wealth_velocity": "TikTok's revenue — generated from the attention of 170 million U.S. users — flows to ByteDance's investors and ultimately to Zhang Yiming, whose net worth exceeds $40 billion. Chinese tech wealth accumulated through American user engagement."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "ByteDance / Zhang Yiming", "how": "$40B+ net worth; most downloaded app in history; advertising revenue from 1.7B global users"},
      {"group": "ByteDance investors (Sequoia, SoftBank, KKR)", "how": "Investment in highest-valued private tech company; financial interest in blocking divestiture"},
      {"group": "Advertisers", "how": "Unprecedented engagement rates from addictive algorithm allow highly targeted advertising"}
    ],
    "who_paid": [
      {"group": "Teenagers with mental health impacts", "how": "Algorithm-driven harmful content exposure; attention and sleep disruption; anxiety amplification"},
      {"group": "Children whose biometric data was collected", "how": "Faceprints and voiceprints collected without consent; settled for $92M"},
      {"group": "U.S. national security interests", "how": "Potential Chinese government access to data on 170 million Americans; admitted China-based employee data access"},
      {"group": "Forbes journalist and sources", "how": "Surveilled through their TikTok data by ByteDance employee seeking to identify journalist's sources"}
    ],
    "the_gap": "ByteDance admitted its employees in China accessed U.S. user data. China's National Intelligence Law requires Chinese companies to cooperate with intelligence requests. There are 170 million American users. The Supreme Court unanimously upheld the divestiture law. TikTok is still operating."
  }
},
  "profiles_v8/bank-of-america.json": {
  "brand_name": "Bank of America",
  "brand_slug": "bank-of-america",
  "parent_company": "Bank of America Corporation",
  "ultimate_parent": "Bank of America Corporation",
  "subsidiaries": ["Merrill Lynch", "BofA Securities", "Bank of America Private Bank", "Countrywide (acquired 2008)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "BANK OF AMERICA PAID $17 BILLION FOR FRAUDULENT MORTGAGES AND STILL DISCRIMINATED AGAINST BLACK AND HISPANIC BORROWERS",
  "executive_summary": "Bank of America is the second-largest bank in the United States with approximately $3.3 trillion in assets. The bank's acquisition of Countrywide Financial in 2008 — at the height of the subprime mortgage crisis — saddled it with the liabilities of the most predatory mortgage lender in American history. BofA subsequently paid $17 billion to the DOJ in 2014 — the largest civil settlement with a single entity in U.S. history at the time — for Countrywide's fraudulent mortgage practices. The bank has also paid billions more for its own mortgage violations, systematic overdraft fee extraction, unlawful debt collection, and documented racial discrimination in lending. The CFPB has repeatedly cited Bank of America for consumer protection violations.",
  "verdict_tags": ["countrywide_17b_settlement", "racial_discrimination_lending", "overdraft_fee_extraction", "mortgage_fraud", "consumer_protection_violations", "unlawful_debt_collection"],
  "concern_flags": {"labor": false, "environmental": true, "political": true, "tax": true, "health": false, "legal": true},
  "tax": {
    "summary": "Bank of America uses offshore subsidiaries in the Cayman Islands, Ireland, and other jurisdictions to minimize tax obligations. The bank benefited significantly from the 2017 Tax Cuts and Jobs Act. BofA has been cited for aggressive transfer pricing between its international subsidiaries. The bank holds significant deferred tax assets from losses during the financial crisis — reducing its effective tax rate for years.",
    "flags": ["cayman_offshore_structures", "tcja_windfall", "crisis_era_deferred_tax_assets"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2014: $17 billion DOJ settlement — largest civil settlement with a single entity at the time — for Countrywide's fraudulent mortgage-backed securities. 2011: $8.5 billion settlement with investors for mortgage securities fraud. 2013: $1.7 billion FHA mortgage settlement. CFPB actions: 2022, BofA paid $225 million for botched pandemic unemployment benefit payments; 2023, $250 million for junk fees, withholding credit card rewards, and opening fake accounts. DOJ: $335 million for racial discrimination against Black and Hispanic borrowers (2011). Multiple state settlements for unlawful debt collection. FTC: settlements for student loan and debt collection abuses. Total regulatory penalty payments since 2010 approach $80 billion.",
    "flags": ["17b_doj_settlement_countrywide", "225m_pandemic_benefits_botch", "250m_cfpb_junk_fees_fake_accounts", "335m_racial_lending_discrimination", "80b_total_penalties"],
    "sources": ["https://www.justice.gov", "https://www.consumerfinance.gov"]
  },
  "labor": {
    "summary": "Bank of America employs approximately 213,000 people. The bank has conducted multiple rounds of layoffs during economic downturns while maintaining executive compensation. BofA has been subject to NLRB complaints for workplace violations. The bank's call center and branch workforce has faced high-pressure sales metrics — a documented pattern across large banks following the Wells Fargo fake account scandal.",
    "flags": ["high_pressure_sales_metrics", "layoff_cycles_vs_executive_pay", "nlrb_complaints"],
    "sources": []
  },
  "environmental": {
    "summary": "Bank of America has made significant renewable energy commitments and is considered relatively progressive among major banks on climate finance. However, the bank continues to finance fossil fuel extraction projects and has been named in shareholder resolutions challenging the gap between its commitments and its financing. BofA provided approximately $198 billion in fossil fuel financing between 2016 and 2022.",
    "flags": ["fossil_fuel_financing_198b", "climate_commitment_gap"],
    "sources": ["https://www.banktrack.org"]
  },
  "political": {
    "summary": "Bank of America spent $4.9 million on federal lobbying in 2023. The bank has lobbied against CFPB oversight authority, overdraft fee regulation, and debt collection restrictions. The revolving door between BofA's government affairs team and Treasury, SEC, and CFPB is documented. BofA's PAC contributes to both parties with concentration among banking committee members.",
    "flags": ["cfpb_oversight_opposition", "overdraft_regulation_opposition", "revolving_door_treasury_cfpb"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Brian Moynihan received $29.5 million in total compensation in 2023. Moynihan has led BofA since 2010 and has presided over the resolution of Countrywide liabilities while building the bank back to profitability. Countrywide founder Angelo Mozilo — whose predatory lending practices generated BofA's largest liabilities — settled SEC charges for $67.5 million and avoided criminal prosecution despite documenting his own concern about Countrywide's practices in emails that later emerged in discovery.",
    "flags": ["mozilo_67_5m_personal_settlement_no_criminal", "moynihan_29_5m_post_countrywide"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Bank of America shares major institutional investors with JPMorgan Chase, Wells Fargo, and Citigroup — creating aligned incentives across the four largest U.S. banks. BofA's Merrill Lynch acquisition gave it access to wealth management and investment banking, creating conflicts of interest between retail banking clients and institutional trading clients. The Countrywide acquisition — driven by then-CEO Ken Lewis's desire for market share — created the liability that required $17 billion in settlements paid by BofA shareholders, not the Countrywide executives who designed the predatory lending.",
    "flags": ["big_four_bank_shared_investor_alignment", "countrywide_liability_shareholder_bore", "merrill_lynch_retail_institutional_conflict"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The CFPB's 2023 enforcement action found that BofA opened fake accounts and credit cards in customers' names without consent — a practice nearly identical to the Wells Fargo scandal. Former BofA employees alleged that sales pressure created an environment where unauthorized account opening was the path of least resistance. Bloomberg reporting in 2022 documented that BofA's algorithm for pandemic unemployment benefits wrongfully froze hundreds of thousands of accounts — affecting some of the most vulnerable Americans at their most desperate moment — without adequate review.",
    "flags": ["fake_accounts_similar_to_wells_fargo_alleged", "pandemic_benefit_algorithm_wrongful_freezes_documented"],
    "sources": ["https://www.consumerfinance.gov", "https://www.bloomberg.com"]
  },
  "health_record": {
    "summary": "Bank of America's predatory mortgage lending — through Countrywide — contributed to the foreclosure crisis that generated documented health consequences including increased suicide rates, stress-related disease, and housing instability. Black and Hispanic borrowers were disproportionately steered into subprime mortgages, generating the racial discrimination settlement — and the wealth destruction from foreclosures fell disproportionately on communities of color, with documented generational health consequences. The pandemic benefits botch — wrongfully freezing accounts of vulnerable workers — caused direct economic harm during a public health emergency.",
    "flags": ["foreclosure_crisis_health_impacts", "racial_discrimination_wealth_health_consequences", "pandemic_benefits_wrongful_freeze_harm"],
    "sources": []
  },
  "alternatives": {
    "cheaper": ["Credit unions — member-owned, lower fees, no shareholder profit extraction, NCUA insured", "Online banks (Ally, Marcus, Discover) — higher savings rates, lower fees, no overdraft fee traps", "Local community banks — relationship banking, profits stay local"],
    "healthier": ["Credit unions have documented better customer satisfaction and lower fee structures than Bank of America", "Community Development Financial Institutions for underserved borrowers — mission-driven lending without predatory terms"],
    "diy": ["Switch banks — moving a checking account takes 30 minutes and the impact of reducing deposits at BofA is real", "Opt out of overdraft 'protection' — BofA's overdraft fee product is a high-interest loan masquerading as a feature", "File CFPB complaints for any fee or account issue — the CFPB database is public and enforcement is driven by complaint volume"]
  },
  "timeline": [
    {"year": 1904, "event": "Bank of Italy founded in San Francisco; later renamed Bank of America", "severity": "neutral", "source_url": ""},
    {"year": 1998, "event": "NationsBank acquires Bank of America; takes the Bank of America name", "severity": "neutral", "source_url": ""},
    {"year": 2008, "event": "Acquires Countrywide Financial — the most predatory mortgage lender in U.S. history — as housing market collapses", "severity": "critical", "source_url": ""},
    {"year": 2008, "event": "Acquires Merrill Lynch during financial crisis; takes on additional mortgage liability", "severity": "high", "source_url": ""},
    {"year": 2010, "event": "Receives $45B in TARP bailout funds; CEO Ken Lewis departs", "severity": "high", "source_url": ""},
    {"year": 2011, "event": "$335M DOJ settlement for racial discrimination in lending against Black and Hispanic borrowers", "severity": "critical", "source_url": ""},
    {"year": 2011, "event": "$8.5B investor settlement for mortgage securities fraud", "severity": "critical", "source_url": ""},
    {"year": 2014, "event": "$17B DOJ settlement for Countrywide mortgage fraud — largest civil DOJ settlement in U.S. history at time", "severity": "critical", "source_url": "https://www.justice.gov"},
    {"year": 2022, "event": "CFPB: $225M for botching pandemic unemployment benefit payments; wrongful account freezes", "severity": "critical", "source_url": "https://www.consumerfinance.gov"},
    {"year": 2023, "event": "CFPB: $250M for junk fees, withholding credit card rewards, opening fake accounts without consent", "severity": "critical", "source_url": "https://www.consumerfinance.gov"}
  ],
  "community_impact": {
    "displacement": "Countrywide's predatory lending — which BofA inherited — specifically targeted Black and Hispanic communities with subprime mortgages that were designed to fail. The resulting foreclosures destroyed generational wealth in communities of color. Neighborhoods with high foreclosure concentrations experienced documented increases in crime, decreased property values, and population loss that have not recovered.",
    "price_illusion": "Bank of America's fees — overdraft fees, monthly maintenance fees, wire transfer fees — extract billions from account holders, disproportionately affecting low-income customers. The $250 million CFPB settlement for junk fees and withheld rewards represents documented consumer extraction. The $35 overdraft fee on a $5 transaction represents a 25,000% annualized interest rate.",
    "tax_math": "BofA received $45 billion in TARP bailout funds during the financial crisis it helped create. The bank returned to profitability quickly and paid the funds back with interest — but the public bore the risk of the bailout while the bank captured the recovery upside.",
    "wealth_velocity": "BofA's fees and interest margins flow to shareholders globally. The bank's largest customers — investment banking and wealth management clients — receive services that cross-subsidize the retail banking division's compliance costs, while retail customers bear the fee burden."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Countrywide executives (pre-acquisition)", "how": "Angelo Mozilo's $470M in compensation during predatory lending period; $67.5M personal settlement — no criminal charges"},
      {"group": "BofA shareholders (long-term)", "how": "Bank returned to profitability after absorbing crisis liabilities; bailout backstopped the downside"},
      {"group": "Brian Moynihan", "how": "$29.5M in 2023 compensation for managing crisis aftermath"}
    ],
    "who_paid": [
      {"group": "Black and Hispanic mortgage borrowers", "how": "Steered into predatory subprime loans; $335M discrimination settlement represents partial acknowledgment"},
      {"group": "All BofA retail customers", "how": "Junk fees, withheld rewards, overdraft extraction; CFPB settlements represent documented pattern"},
      {"group": "U.S. taxpayers", "how": "$45B TARP backstop for crisis created by predatory practices"},
      {"group": "Pandemic unemployment recipients", "how": "Wrongful account freezes during economic emergency; $225M settlement"}
    ],
    "the_gap": "Countrywide targeted Black and Hispanic homeowners with predatory loans that were designed to fail. BofA bought Countrywide, paid $17 billion to settle, and Angelo Mozilo avoided prison. The wealth that was destroyed in those communities has not returned."
  }
},
  "profiles_v8/bp.json": {
  "brand_name": "BP",
  "brand_slug": "bp",
  "parent_company": "BP PLC",
  "ultimate_parent": "BP PLC",
  "subsidiaries": ["BP America", "BP Castrol", "BP Solar (sold)", "TravelCenters of America (partial)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "BP KILLED 11 WORKERS, SPILLED 4.9 MILLION BARRELS OF OIL, AND PAID $65 BILLION — THE MOST EXPENSIVE CORPORATE ACCIDENT IN HISTORY",
  "executive_summary": "BP is the fourth-largest oil company in the world, with annual revenues exceeding $200 billion. On April 20, 2010, the Deepwater Horizon drilling platform — leased by BP and operated in the Gulf of Mexico — exploded, killing 11 workers and triggering the largest marine oil spill in U.S. history. An estimated 4.9 million barrels of oil flowed into the Gulf over 87 days. BP's total financial liability exceeded $65 billion — the largest environmental settlement in history. Federal investigations found a pattern of cost-cutting decisions that directly caused the blowout. BP also has a documented history of prior catastrophic safety failures: the 2005 Texas City refinery explosion killed 15 workers. BP's 'Beyond Petroleum' rebranding — launched in 2000 — was widely criticized as greenwashing that preceded the worst oil spill in American history.",
  "verdict_tags": ["deepwater_horizon_11_deaths", "4_9m_barrels_spilled", "65b_total_liability", "criminal_guilty_plea_14_felonies", "cost_cutting_safety_failures", "greenwashing", "texas_city_explosion"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "BP uses offshore structures and transfer pricing to minimize global tax obligations. The company's exploration and production operations in multiple jurisdictions are structured to maximize deductible costs. Settlement payments — including portions of the $65 billion Deepwater Horizon liability — may be partially tax-deductible as business expenses. BP has received significant government subsidies for offshore drilling in the United States through depletion allowances and favorable lease terms.",
    "flags": ["settlement_partial_deductibility", "offshore_structures", "drilling_subsidies"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Deepwater Horizon (2010-2015): 11 felony manslaughter counts resolved through $4.5 billion in criminal penalties — the largest criminal fine in U.S. history at the time. Civil settlement: $20.8 billion — the largest DOJ settlement with a single entity in history. Total financial liability including cleanup, compensation, and penalties exceeded $65 billion. BP pleaded guilty to 14 felony counts related to the deaths of 11 workers and subsequent misconduct. Texas City (2005): BP paid $50 million in criminal fines and $21 million in OSHA fines for the refinery explosion that killed 15 workers — the largest OSHA fine in history at the time. Prudhoe Bay (2006): BP paid $20 million for a pipeline rupture that spilled 267,000 gallons in Alaska, the largest North Slope spill in history.",
    "flags": ["deepwater_14_felony_guilty_plea", "20_8b_largest_doj_single_entity", "65b_total_liability", "texas_city_15_deaths", "prudhoe_bay_alaska_spill"],
    "sources": ["https://www.justice.gov/archives/opa/pr/us-and-five-gulf-states-reach-historic-settlement-bp-resolve-civil-lawsuit-over-deepwater"]
  },
  "labor": {
    "summary": "BP has a documented history of worker safety failures. The 2005 Texas City explosion — caused by cost-cutting on safety systems — killed 15 workers and injured 180. Internal BP documents revealed a pattern of deferred maintenance and safety investment at Texas City. The Deepwater Horizon explosion killed 11 platform workers. Federal investigations found BP pressured contractors to proceed despite documented safety concerns on the day of the blowout. BP's pattern of cost-cutting on safety — documented across Texas City, Deepwater Horizon, and Prudhoe Bay — reflects systematic prioritization of financial targets over worker safety.",
    "flags": ["systematic_cost_cutting_worker_safety", "texas_city_15_deaths", "deepwater_11_deaths", "safety_concern_pressure_to_proceed"],
    "sources": ["https://www.osha.gov", "https://www.csb.gov"]
  },
  "environmental": {
    "summary": "The Deepwater Horizon spill released 4.9 million barrels of oil into the Gulf of Mexico over 87 days — contaminating 1,000+ miles of Gulf coastline, killing an estimated 1 million seabirds, 5,000 marine mammals, and causing documented damage to Gulf fisheries that continues. BP's Prudhoe Bay pipeline rupture (2006) caused the largest oil spill in North Slope history. BP has received EPA enforcement citations at multiple U.S. facilities. The company's 'Beyond Petroleum' rebranding — which presented BP as a clean energy pioneer — was launched in 2000, a decade before the worst oil spill in American history.",
    "flags": ["4_9m_barrels_gulf_spill", "1000_miles_coastline_contaminated", "1m_seabirds_5000_mammals_killed", "beyond_petroleum_greenwashing"],
    "sources": ["https://www.epa.gov", "https://www.noaa.gov/explainers/deepwater-horizon-oil-spill-settlements-where-money-went"]
  },
  "political": {
    "summary": "BP spent $13.5 million on federal lobbying in 2010 — the year of Deepwater Horizon. The company has been a consistent opponent of offshore drilling safety regulations, arguing that industry self-regulation was sufficient. BP funded climate-friendly political messaging through its 'Beyond Petroleum' campaign while lobbying against climate regulations through industry trade associations. The revolving door between BP's government affairs team and federal regulatory agencies overseeing offshore drilling has been documented.",
    "flags": ["offshore_safety_regulation_opposition", "beyond_petroleum_vs_lobbying_contradiction", "revolving_door_offshore_regulators"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Tony Hayward, who led BP during the Deepwater Horizon disaster, became infamous for statements including 'I'd like my life back' — said while cleanup workers were still dying from exposure. Hayward stepped down in 2010 with a $1.6 million pension and 600,000 shares of BP stock. Current CEO Murray Auchincloss received £8.7 million in total compensation in 2023. No BP executive was criminally convicted for the deaths of 11 workers — two BP employees faced manslaughter charges that were eventually dismissed.",
    "flags": ["hayward_i_want_my_life_back", "hayward_1_6m_pension_departure", "no_executive_criminal_conviction_11_deaths"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "BP shares major institutional investors with Shell, TotalEnergies, and ExxonMobil, creating aligned incentives against safety regulation and climate action. The Deepwater Horizon platform was owned by Transocean and the well was cemented by Halliburton — distributing legal and financial responsibility across multiple companies. This distributed supply chain of offshore drilling creates accountability gaps that BP exploited in initial liability defenses. BP's connections to the UK government — through its position as a major employer and pension fund holding — created political pressure for lenient treatment that played out in the settlement timeline.",
    "flags": ["cross_oil_company_investor_alignment", "transocean_halliburton_distributed_liability", "uk_government_pension_fund_pressure"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The Chemical Safety Board investigation found that BP's Texas City disaster was predictable and resulted from a pattern of cost-cutting decisions by senior management. Former BP employees have alleged that the pressure to reduce costs — including safety costs — was explicit and came from senior UK leadership. Congressional investigators documented that BP's Deepwater Horizon blowout was caused in part by a decision to use fewer centralizers (equipment that centers the wellbore casing) than recommended by its own contractors — a decision that saved approximately $10,000. BP's internal investigation found misconduct that it reported partially to the DOJ while retaining documents, which generated subsequent legal action.",
    "flags": ["10000_decision_caused_billions_in_damage", "centralized_cost_cutting_uk_leadership_alleged", "selective_disclosure_investigation_alleged"],
    "sources": ["https://www.csb.gov"]
  },
  "health_record": {
    "summary": "The Deepwater Horizon disaster caused direct health impacts to cleanup workers — tens of thousands of workers were exposed to crude oil and Corexit dispersant with documented respiratory, neurological, and dermatological health consequences. Studies have found elevated cancer rates, chronic respiratory conditions, and mental health disorders among Gulf cleanup workers. Gulf fishing communities experienced economic devastation and associated health impacts. Marine ecosystem disruption affected seafood safety for years. The Texas City explosion caused immediate deaths and long-term health impacts for survivors and nearby community members exposed to toxic chemicals.",
    "flags": ["cleanup_worker_corexit_exposure", "elevated_cancer_rates_cleanup_workers", "gulf_seafood_safety_impacts", "texas_city_toxic_chemical_exposure"],
    "sources": ["https://www.ncbi.nlm.nih.gov"]
  },
  "alternatives": {
    "cheaper": ["Public transit eliminates gasoline purchase from all sources including BP", "Electric vehicles — removes gasoline dependency entirely; charging at home is significantly cheaper than gasoline", "E-bikes for urban distances — zero fuel cost"],
    "healthier": ["Community solar and wind power eliminates home energy dependence on fossil fuels", "Heat pumps replace gas heating — more efficient and decouples home from natural gas supply chains"],
    "diy": ["Avoid BP stations specifically — Shell, Chevron, and ExxonMobil are all problematic but BP's worker safety record makes it a distinct choice", "Advocate for stronger offshore drilling safety regulation — the regulations that would have required additional safety systems on Deepwater Horizon", "Support Gulf Coast fishing community organizations still affected by the 2010 spill"]
  },
  "timeline": [
    {"year": 1908, "event": "Anglo-Persian Oil Company founded; predecessor to BP; first major Middle East oil discovery", "severity": "neutral", "source_url": ""},
    {"year": 2000, "event": "'Beyond Petroleum' rebranding launched; BP presents itself as transitioning to clean energy", "severity": "moderate", "source_url": ""},
    {"year": 2005, "event": "Texas City refinery explosion: 15 killed, 180 injured; $50M criminal fine, $21M OSHA fine (record)", "severity": "critical", "source_url": "https://www.csb.gov"},
    {"year": 2006, "event": "Prudhoe Bay pipeline rupture: 267,000 gallons spilled; largest North Slope spill in history", "severity": "high", "source_url": ""},
    {"year": 2010, "event": "April 20: Deepwater Horizon explosion; 11 workers killed; largest marine oil spill in U.S. history begins", "severity": "critical", "source_url": ""},
    {"year": 2010, "event": "87 days: 4.9 million barrels spill; CEO Hayward says 'I'd like my life back'; steps down with $1.6M pension", "severity": "critical", "source_url": ""},
    {"year": 2012, "event": "$4.5B criminal settlement; 14 felony guilty pleas; largest criminal fine in U.S. history at time", "severity": "critical", "source_url": "https://www.justice.gov"},
    {"year": 2015, "event": "$20.8B civil settlement — largest DOJ settlement with single entity in U.S. history", "severity": "critical", "source_url": "https://www.justice.gov/archives/opa/pr/us-and-five-gulf-states-reach-historic-settlement-bp-resolve-civil-lawsuit-over-deepwater"},
    {"year": 2018, "event": "Total financial liability from Deepwater Horizon exceeds $65B", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "BP retreats from renewable energy targets; announces plans to increase oil and gas output", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Gulf Coast fishing communities — particularly in Louisiana, Mississippi, Alabama, and Florida — lost years of fishing income from contaminated waters. Vietnamese-American fishing communities in Louisiana were disproportionately affected and faced language barriers in accessing compensation. Tourism-dependent communities along 1,000 miles of coastline experienced economic devastation. Restoration of Gulf ecosystems continues more than a decade after the spill.",
    "price_illusion": "BP's gasoline prices do not include the cost of the $65 billion Deepwater Horizon liability, the Gulf ecosystem damage, the deaths of 11 workers, or the ongoing health impacts on cleanup workers. The 'Beyond Petroleum' branding that preceded the disaster was a communications investment, not a business strategy.",
    "tax_math": "BP's settlement payments may be partially tax-deductible as ordinary business expenses — effectively subsidizing the penalty through reduced U.S. tax obligations. The $65 billion total liability, while historic, represents a fraction of the economic damage to Gulf communities, estimated by researchers at approximately $144 billion.",
    "wealth_velocity": "BP's profits — generated from oil extraction globally — flow to institutional shareholders in the UK, US, and internationally. The Gulf Coast communities that bore the environmental and economic damage of the Deepwater Horizon disaster receive settlement distributions but the ongoing economic damage exceeds any compensated amount."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "BP shareholders prior to spill", "how": "Decades of offshore drilling profits generated without adequate safety investment"},
      {"group": "Tony Hayward", "how": "$1.6M pension and 600,000 shares at departure; said 'I'd like my life back' while cleanup workers were dying"},
      {"group": "Contractors (Transocean, Halliburton)", "how": "Distributed liability reduced individual accountability for contributing factors"}
    ],
    "who_paid": [
      {"group": "11 killed workers and their families", "how": "Deaths caused by documented cost-cutting decisions; no executive criminally convicted"},
      {"group": "Cleanup workers", "how": "Exposure to crude oil and Corexit; documented cancer and chronic health consequences"},
      {"group": "Gulf Coast communities", "how": "Economic devastation of fishing and tourism industries; ongoing ecosystem damage"},
      {"group": "Gulf ecosystem", "how": "1 million seabirds, 5,000 marine mammals, 4.9 million barrels of crude oil contamination"}
    ],
    "the_gap": "BP saved $10,000 by using fewer centralizers than its own contractors recommended. The blowout cost $65 billion and 11 lives. The CEO got a $1.6 million pension. No executive went to prison. The Gulf is still recovering."
  }
},
  "profiles_v8/eli-lilly.json": {
  "brand_name": "Eli Lilly",
  "brand_slug": "eli-lilly",
  "parent_company": "Eli Lilly and Company",
  "ultimate_parent": "Eli Lilly and Company",
  "subsidiaries": ["Lilly USA", "Lilly Oncology", "Lilly Diabetes", "Alnylam (partner)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "ELI LILLY RAISED INSULIN PRICES 1,000% OVER 20 YEARS ON A DRUG DISCOVERED IN 1921 AND DONATED TO HUMANITY",
  "executive_summary": "Eli Lilly is one of the three dominant insulin manufacturers in the United States — alongside Novo Nordisk and Sanofi — collectively controlling 99% of the insulin market by value. Insulin was discovered in 1921 by Frederick Banting and Charles Best, who sold the patent to the University of Toronto for $1 each, explicitly so the drug would remain affordable. Over the following century, Eli Lilly and its competitors raised insulin prices by over 1,000% — turning a drug that costs approximately $2-6 to manufacture into a product priced at $274-530 per vial. Over 8 million Americans require insulin to survive. People have died rationing insulin due to cost. Lilly has faced lawsuits from over 20 state attorneys general, hundreds of municipalities, and federal regulators. The company has also made enormous profit from Mounjaro/Zepbound (tirzepatide) for diabetes and weight loss, raising new pricing concerns.",
  "verdict_tags": ["insulin_price_gouging_1000pct", "price_fixing_pbm_coordination", "state_ag_lawsuits_20_plus", "rationing_deaths", "patent_abuse_evergreening", "lobbying_against_price_regulation"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Eli Lilly is headquartered in Indianapolis but uses Irish and other international subsidiary structures to minimize U.S. tax obligations on global pharmaceutical profits. The company's Puerto Rico manufacturing operations benefit from pharmaceutical-specific tax provisions. Lilly spent $395 million on insulin R&D between 2014 and 2018 while spending $1.5 billion on insulin sales and marketing over the same period — generating $22.4 billion in insulin revenue. The R&D deduction justification for high insulin prices does not hold up against these ratios.",
    "flags": ["irish_subsidiary_structures", "puerto_rico_tax_provisions", "marketing_exceeds_r_and_d_documented"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "MDL 3080 — In re Insulin Pricing Litigation — consolidates hundreds of lawsuits from state attorneys general and municipalities alleging that Eli Lilly, Novo Nordisk, Sanofi, and the Big Three PBMs coordinated to artificially inflate insulin prices. As of April 2026, over 416 cases are pending. Minnesota settlement (February 2024): Eli Lilly agreed to cap insulin prices at $35/month for all Minnesotans for 5 years. Prior class action settlement: $13.5 million to resolve consumer claims, contested by 9 state AGs as insufficient. Senate Finance Committee investigations documented how Lilly's list price increases for Humalog (its primary insulin) far outpaced inflation and manufacturing cost increases. DOJ has investigated Lilly for anti-competitive pricing tactics.",
    "flags": ["416_pending_lawsuits_mld_3080", "20_plus_state_ag_actions", "senate_investigation_documented", "minnesota_35_settlement"],
    "sources": ["https://www.ag.state.mn.us/Office/Communications/2024/02/07_EliLilly.asp", "https://levinlaw.com/insulin-overpricing-lawsuit"]
  },
  "labor": {
    "summary": "Eli Lilly employs approximately 43,000 people. The company has conducted workforce reductions while maintaining executive compensation and investing in new product marketing. Lilly's manufacturing workforce in Indianapolis has been stable relative to its growth. The company's marketing force — which spent $1.5 billion marketing insulin in four years — significantly outnumbers its research workforce.",
    "flags": ["marketing_workforce_exceeds_research_proportion", "executive_compensation_maintained_through_pricing_controversy"],
    "sources": []
  },
  "environmental": {
    "summary": "Eli Lilly's pharmaceutical manufacturing generates chemical waste streams requiring specialized handling. The company has faced EPA enforcement actions at manufacturing facilities. Pharmaceutical pollution from manufacturing discharge — including active pharmaceutical ingredients in wastewater — is a documented environmental concern at Lilly's global facilities.",
    "flags": ["pharmaceutical_manufacturing_waste", "api_wastewater_discharge"],
    "sources": ["https://echo.epa.gov"]
  },
  "political": {
    "summary": "Eli Lilly spent $10.2 million on federal lobbying in 2023. The company has consistently opposed legislation that would allow Medicare to negotiate drug prices — insulin negotiation specifically. Lilly lobbied against the Inflation Reduction Act's drug pricing provisions while simultaneously making public announcements of voluntary price caps ($35/month) that generated positive press. The Senate Finance Committee investigation documented the gap between Lilly's public statements about affordability and its actual pricing practices. Lilly's PAC contributes to members of both parties on healthcare committees.",
    "flags": ["ira_drug_pricing_opposition", "medicare_negotiation_opposition", "voluntary_caps_vs_lobbying_contradiction"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO David Ricks received $25.3 million in total compensation in 2023. Ricks has presided over both the insulin pricing controversy and the dramatic rise of Lilly's GLP-1 drug tirzepatide (Mounjaro/Zepbound), which has driven Lilly's market capitalization above $700 billion. The company's stock performance — driven by tirzepatide — has enriched executives and shareholders while insulin pricing lawsuits continue. Lilly's response to the insulin pricing crisis has been to announce voluntary price caps while simultaneously lobbying against mandatory price regulation.",
    "flags": ["25m_ceo_compensation_during_pricing_crisis", "tirzepatide_windfall_vs_insulin_lawsuits", "voluntary_caps_lobbying_against_mandatory"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Eli Lilly's insulin pricing is inseparable from the PBM pricing system — Lilly, Novo Nordisk, and Sanofi raised list prices primarily to fund PBM rebates, which are calculated as a percentage of list price. The higher the list price, the larger the rebate a PBM can claim. This rebate system — which the FTC's 2024 lawsuit against the Big Three PBMs addresses — means Lilly's list price increases and PBM pricing practices are a coordinated system. Lilly shares major institutional investors with Pfizer, AbbVie, and other pharma companies, creating aligned incentives against drug price regulation across the sector.",
    "flags": ["pbm_rebate_list_price_coordination", "three_insulin_manufacturers_99pct_market_control", "cross_pharma_shared_investor_alignment"],
    "sources": ["https://www.ftc.gov"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "State attorneys general have alleged that Lilly's 'evergreening' strategy — making minor reformulations to reset patent clocks and delay generic competition — was a deliberate tactic to maintain monopoly pricing on insulin products for which the underlying patents had expired. Advocacy groups have documented deaths of diabetic patients who rationed insulin due to cost, including Josh Wilkerson (26), Alec Raeshawn Smith (26), and Shane Patrick Boyle (48) — individuals who could not afford their insulin. Lilly has described its pricing as a 'complex system' while simultaneously claiming its insulin remains affordable — a characterization contradicted by the documented deaths and rationing behavior.",
    "flags": ["evergreening_patent_extension_alleged", "rationing_deaths_documented_named_individuals", "affordability_claim_contradicted_by_deaths"],
    "sources": ["https://www.acpjournals.org"]
  },
  "health_record": {
    "summary": "Insulin is not optional for Type 1 diabetics — they die within days without it. The 1,000% price increase over 20 years has documented consequences: people rationing doses, skipping injections, developing complications from under-treatment, and dying. The American Diabetes Association documented that 1 in 4 insulin users report rationing doses due to cost. Documented deaths from insulin rationing include multiple named individuals whose families have testified before Congress. Meanwhile, Lilly's Humalog — a biologic insulin first approved in 1996 — costs approximately $35 in Canada for the same product that costs $274-530 in the United States.",
    "flags": ["1_in_4_rationing_documented_aha", "named_deaths_congressional_testimony", "35_canada_vs_274_530_us_identical_product"],
    "sources": ["https://www.diabetes.org", "https://www.acpjournals.org"]
  },
  "alternatives": {
    "cheaper": ["Mark Cuban's Cost Plus Drugs — offers insulin at dramatically reduced prices; Eli Lilly's Basaglar at $33/vial vs $280+ list price", "Canadian pharmacies by mail — legally accessible for personal use; prices 70-90% lower for identical products", "Walmart's ReliOn insulin — OTC insulin at $25/vial (older formulation, less effective for some diabetics, consult physician)", "Eli Lilly's Insulin Value Program — caps out-of-pocket at $35/month for commercially insured patients"],
    "healthier": ["Biosimilar insulins — when patent protections expire, generic equivalents become available at lower prices; Civica Rx is developing affordable biosimilar insulin", "Patient advocacy groups can assist with manufacturer patient assistance programs for those below income thresholds"],
    "diy": ["State attorney general complaints — most state AGs have active insulin pricing investigations; reporting your experience contributes to enforcement record", "Advocacy for Medicare drug price negotiation — the single policy change most likely to reduce insulin prices across the board", "Insulin rationing is medically dangerous — if rationing, contact your local FQHC, free clinic, or state pharmaceutical assistance program for emergency access"]
  },
  "timeline": [
    {"year": 1921, "event": "Insulin discovered by Banting and Best; patent sold to University of Toronto for $1 each to ensure affordability", "severity": "neutral", "source_url": ""},
    {"year": 1923, "event": "Eli Lilly licenses insulin; begins commercial production", "severity": "neutral", "source_url": ""},
    {"year": 1996, "event": "Humalog (insulin lispro) approved — one of Lilly's core insulin products; list price ~$21/vial", "severity": "neutral", "source_url": ""},
    {"year": 2010, "event": "Humalog list price reaches $93/vial; 4x increase over 14 years", "severity": "high", "source_url": ""},
    {"year": 2017, "event": "Alec Raeshawn Smith, 26, dies rationing insulin after aging off parents' insurance; case becomes national symbol", "severity": "critical", "source_url": ""},
    {"year": 2018, "event": "Humalog list price reaches $274/vial; Senate Finance Committee opens investigation", "severity": "critical", "source_url": ""},
    {"year": 2018, "event": "Minnesota AG files first major state lawsuit against insulin manufacturers", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Lilly announces voluntary 70% price cut on most-used insulins; expands $35/month cap program", "severity": "moderate", "source_url": ""},
    {"year": 2023, "event": "MDL 3080 created: 416+ lawsuits consolidated in NJ federal court against insulin manufacturers and PBMs", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "Minnesota settlement: Lilly caps insulin at $35/month for all Minnesotans for 5 years", "severity": "moderate", "source_url": "https://www.ag.state.mn.us/Office/Communications/2024/02/07_EliLilly.asp"},
    {"year": 2026, "event": "416 lawsuits pending; Lilly's market cap exceeds $700B driven by tirzepatide weight loss drug", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "The insulin pricing crisis has hit uninsured, underinsured, and lower-income diabetics hardest. People who lose employer-sponsored insurance face sudden exposure to list prices — the transition between jobs, the loss of a job, or the failure of the ACA marketplace can mean the difference between $35/month and $530/vial. Rural communities with higher rates of uninsured patients bear disproportionate exposure.",
    "price_illusion": "Lilly's insulin is priced at $274-530/vial in the United States and $35 in Canada for the identical product. The manufacturing cost is approximately $2-6/vial. The price is not a function of cost — it is a function of market power, patent protection, and PBM rebate incentives.",
    "tax_math": "Lilly's insulin R&D investment from 2014-2018 was $395 million. Its insulin marketing spend over the same period was $1.5 billion. Its insulin revenue was $22.4 billion. The R&D deduction argument for high prices does not withstand scrutiny against these numbers.",
    "wealth_velocity": "Insulin revenue — extracted from diabetics who have no choice but to pay — flows to Lilly shareholders. CEO compensation of $25.3 million annually is funded by the pricing system that causes documented patient rationing and death."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Eli Lilly shareholders", "how": "$700B+ market cap; insulin pricing generated enormous returns"},
      {"group": "PBMs (CVS Caremark, Express Scripts, OptumRx)", "how": "Rebates calculated on list prices; higher list prices = larger rebates"},
      {"group": "CEO David Ricks and executives", "how": "$25.3M annual compensation from pricing system that causes rationing"}
    ],
    "who_paid": [
      {"group": "Uninsured and underinsured diabetics", "how": "1 in 4 reported rationing; named deaths including Alec Raeshawn Smith, Josh Wilkerson, Shane Patrick Boyle"},
      {"group": "Employers and insurers", "how": "Health plan costs driven by inflated insulin prices; now suing in MDL 3080"},
      {"group": "Medicare and Medicaid", "how": "Government programs paid inflated prices for decades before IRA negotiation authority"},
      {"group": "Banting and Best's legacy", "how": "Sold the patent for $1 to ensure affordability; Lilly raised the price 1,000% in 100 years"}
    ],
    "the_gap": "Frederick Banting sold the insulin patent for $1 so no one would die from diabetes because they couldn't afford treatment. Alec Raeshawn Smith was 26 years old and died rationing it. Lilly's CEO made $25 million last year."
  }
},
  "profiles_v8/ford.json": {
  "brand_name": "Ford",
  "brand_slug": "ford",
  "parent_company": "Ford Motor Company",
  "ultimate_parent": "Ford Motor Company",
  "subsidiaries": ["Ford Pro", "Ford Blue", "Ford Model e", "Lincoln", "Ford Credit"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "FORD KNEW THE PINTO GAS TANK WOULD KILL PEOPLE AND CALCULATED IT WAS CHEAPER TO PAY SETTLEMENTS THAN FIX IT",
  "executive_summary": "Ford Motor Company is the second-largest U.S. automaker with annual revenues exceeding $185 billion. Ford's corporate history includes the most documented case of deliberate cost-benefit analysis used to justify knowingly selling a dangerous product: the 1970s Pinto, whose rear-mounted gas tank Ford knew would rupture in rear-end collisions, causing fatal fires. Internal Ford documents — obtained in litigation — showed the company calculated that paying injury and death settlements would be cheaper than redesigning the tank. In more recent history, Ford's Explorer rollover problem, multiple recall failures, emissions testing manipulation, and labor violations have continued a pattern of prioritizing financial outcomes over safety and accountability.",
  "verdict_tags": ["pinto_knowingly_dangerous", "cost_benefit_death_calculation", "explorer_rollover_deaths", "emissions_cheating", "recall_failures", "labor_violations"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Ford uses complex international subsidiary structures across its global manufacturing and sales operations to minimize tax obligations. The company has significant operations in Ireland, Germany, and other lower-tax jurisdictions for European operations. Ford Credit — its financing arm — uses additional tax structures. Ford has received significant government subsidies for EV manufacturing through the Inflation Reduction Act and state-level manufacturing incentives.",
    "flags": ["international_subsidiary_structures", "ev_manufacturing_subsidies", "ford_credit_tax_structures"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Pinto (1970s): Ford's internal documents — revealed in the Grimshaw v. Ford case — showed the company calculated paying injury/death costs at $49.5M would be cheaper than the $137M cost to fix the gas tank. Ford paid $100+ million in Pinto settlements. Explorer/Firestone (2000s): Ford's Explorer had documented rollover risk with Firestone tires — 271 people died; Ford paid $300M+ in settlements. Emissions (2014-present): Ford settled EPA and California air board investigations for emissions testing irregularities. Recall failures: Ford has been involved in multiple large recalls including the Takata airbag recall (affecting millions of vehicles) and multiple powertrain recalls. NHTSA has investigated Ford for recall timeliness failures.",
    "flags": ["pinto_cost_benefit_death_documented", "explorer_271_deaths", "emissions_testing_irregularities", "takata_airbag_recall", "nhtsa_recall_timeliness"],
    "sources": ["https://www.nhtsa.gov"]
  },
  "labor": {
    "summary": "Ford employs approximately 175,000 people globally. The UAW's 2023 strike against Ford, GM, and Stellantis — the first simultaneous strike against all three — resulted in significant wage increases after Ford had proposed smaller increases despite record profits. Ford has also faced NLRB complaints for union-related conduct. The company's shift toward EV manufacturing has created significant uncertainty for workers at traditional combustion engine plants, with documented cases of plant closures in communities built around Ford manufacturing.",
    "flags": ["uaw_2023_strike_record_profits_vs_wage_offers", "ev_transition_worker_uncertainty", "plant_closure_community_impact"],
    "sources": ["https://www.nlrb.gov"]
  },
  "environmental": {
    "summary": "Ford has faced EPA enforcement for emissions violations across multiple vehicle lines. The company's F-150 — the best-selling vehicle in America — is a major source of tailpipe emissions. Ford's emissions testing irregularities, investigated by the EPA, involved testing under conditions that did not represent real-world driving. Ford has been cited by CARB (California Air Resources Board) for failing to comply with California emissions standards for specific models.",
    "flags": ["emissions_testing_irregularities", "f150_emissions_scale", "carb_violations"],
    "sources": ["https://www.epa.gov"]
  },
  "political": {
    "summary": "Ford spent $5.8 million on federal lobbying in 2023. The company has lobbied on fuel economy standards, emissions regulations, EV incentive structures, and trade policy. Ford has been a beneficiary of the Inflation Reduction Act's EV manufacturing credits while simultaneously lobbying on implementation details. The company's UAW relationship is politically complex — Ford maintains cooperative relationships with union leadership while its operational decisions periodically create conflicts.",
    "flags": ["cafe_standards_lobbying", "ira_beneficiary_while_lobbying_implementation", "trade_policy_lobbying"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Jim Farley received $26.8 million in total compensation in 2023. Executive Chair Bill Ford — great-grandson of Henry Ford — received $14.9 million. Ford's executive compensation significantly outpaced the wage increases offered to UAW workers before the 2023 strike, which became a central union talking point. Ford's transition to EV manufacturing has been accompanied by significant losses in the Model e division — $4.7 billion in 2023 alone — while the F-150 combustion truck line continues to generate most of the company's profit.",
    "flags": ["executive_pay_vs_uaw_wage_offer_contrast", "4_7b_ev_division_losses", "f150_profit_dependence"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Ford shares major institutional investors with GM, Stellantis, and Toyota — creating some aligned incentives on regulatory issues. Ford's relationship with Firestone/Bridgestone during the Explorer crisis revealed how supplier relationships can distribute liability while obscuring responsibility. Ford's BlueOval City battery plant in Tennessee — a $5.6 billion investment with SK Innovation — connects it to Korean battery supply chains with documented labor concerns. The auto industry's trade associations coordinate lobbying against emissions and fuel economy regulations.",
    "flags": ["firestone_distributed_liability", "blueoval_city_korean_battery_supply_labor", "auto_industry_emissions_lobbying_coordination"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Former Ford engineers have alleged that the Pinto's design flaws were known before production and that the decision not to fix them was made at executive levels with awareness of the risk. NHTSA investigators have alleged that Ford's response to early Explorer rollover complaints was to dispute the data rather than investigate the safety concern — a pattern that delayed recall action and contributed to additional deaths. Environmental researchers have alleged that Ford's real-world emissions from its truck and SUV fleet — which dominate U.S. sales — significantly exceed the numbers reported in fuel economy testing.",
    "flags": ["pinto_executive_awareness_alleged", "explorer_data_dispute_delay_alleged", "real_world_truck_emissions_gap_alleged"],
    "sources": []
  },
  "health_record": {
    "summary": "The Pinto gas tank defect killed an estimated 27 people in fuel-fed fires in rear-end collisions — deaths Ford's internal documents show the company anticipated. The Explorer/Firestone rollover problem killed 271 people. Takata airbag failures — affecting millions of Ford vehicles — have been linked to deaths and injuries. Tailpipe emissions from Ford's dominant truck and SUV fleet contribute to air quality degradation and related respiratory and cardiovascular disease in communities near high-traffic areas.",
    "flags": ["pinto_27_documented_fire_deaths", "explorer_firestone_271_deaths", "takata_airbag_deaths", "truck_suv_fleet_air_quality_impact"],
    "sources": ["https://www.nhtsa.gov"]
  },
  "alternatives": {
    "cheaper": ["Used vehicles — buying 2-3 year old vehicles avoids the steepest depreciation curve regardless of brand", "Public transit in urban areas — often dramatically cheaper than vehicle ownership when all costs are counted", "Toyota — generally better reliability ratings; Honda — comparable pricing"],
    "healthier": ["Electric vehicles from any manufacturer eliminate tailpipe emissions entirely", "Toyota hybrids — significantly better fuel economy than Ford's truck-dominant lineup", "Walking, cycling, and transit for daily commuting — eliminates vehicle ownership costs and emissions"],
    "diy": ["VIN check for recalls at NHTSA.gov before purchasing any vehicle — including Ford vehicles with outstanding Takata airbag or other recalls", "Vehicle maintenance extends life and reduces need to buy new — Ford's reliability varies significantly by model", "Checking crash test ratings at IIHS.org before purchase"]
  },
  "timeline": [
    {"year": 1903, "event": "Ford Motor Company founded by Henry Ford", "severity": "neutral", "source_url": ""},
    {"year": 1970, "event": "Pinto introduced; Ford engineers document gas tank vulnerability; company chooses not to redesign", "severity": "critical", "source_url": ""},
    {"year": 1977, "event": "Mother Jones investigation reveals Ford's internal cost-benefit analysis valuing lives at $200,000 each", "severity": "critical", "source_url": ""},
    {"year": 1978, "event": "NHTSA orders Pinto recall; Ford recalled 1.5 million vehicles", "severity": "high", "source_url": ""},
    {"year": 1980, "event": "Indiana jury finds Ford not guilty of reckless homicide; civil settlements continue", "severity": "high", "source_url": ""},
    {"year": 2000, "event": "Firestone recall: 6.5 million tires on Ford Explorer; 271 deaths attributed to rollover crashes", "severity": "critical", "source_url": ""},
    {"year": 2001, "event": "Ford recalls 13 million Explorer tires; relationship with Firestone ends; $300M+ in settlements", "severity": "high", "source_url": ""},
    {"year": 2014, "event": "Takata airbag recall begins; affects millions of Ford vehicles; inflators can fire shrapnel", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "UAW strike: Ford offers 23% wage increase after union demands highlight gap with executive compensation", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Model e EV division loses $4.7B; F-150 combustion sales carry company profitability", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Ford plant closures and transitions — including the announced closure of the Avon Lake, Ohio stamping plant as EV transition proceeds — devastate communities built around auto manufacturing. These communities often have limited economic alternatives. The UAW's concern about the EV transition is specifically about the displacement of well-paying union jobs with lower-wage battery manufacturing positions.",
    "price_illusion": "Ford vehicles — particularly its dominant F-150 trucks — are priced as if they include the externalized costs of tailpipe emissions, traffic congestion, road wear, and climate change contributions. They do not. The true cost of the most popular vehicle in America is significantly higher than the sticker price.",
    "tax_math": "Ford received significant manufacturing subsidies for its BlueOval City battery plant through state incentives and IRA production credits. The company simultaneously reports losses in its EV division. The public subsidy of the EV transition flows to a company whose combustion truck line is its primary profit engine.",
    "wealth_velocity": "Ford's profits from truck and SUV sales — generated from American drivers who have few alternatives in a car-dependent country — flow to shareholders. The Bill Ford family retains significant ownership and control. Communities dependent on Ford manufacturing are at the mercy of the company's production decisions."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Ford shareholders and Ford family", "how": "Decades of profit while Pinto fire settlements were cheaper than the fix"},
      {"group": "Ford executives", "how": "Jim Farley: $26.8M in 2023; Bill Ford: $14.9M; paid while UAW workers were on strike for wage increases"},
      {"group": "F-150 buyers", "how": "Truck subsidized by not paying full externalized cost of emissions and fuel consumption"}
    ],
    "who_paid": [
      {"group": "Pinto fire victims and families", "how": "27+ deaths from a defect Ford knew about and calculated it was cheaper to settle than fix"},
      {"group": "Explorer rollover victims", "how": "271 deaths; Ford disputed data rather than investigate early warning signs"},
      {"group": "UAW workers", "how": "Real wages below executive compensation growth; plant closure risk from EV transition"},
      {"group": "Communities with air quality impacts", "how": "Ford's truck-dominant fleet is a major tailpipe emissions source; companies in emissions-heavy corridors"}
    ],
    "the_gap": "Ford calculated that it would cost $137 million to fix the Pinto gas tank and $49.5 million to pay injury and death settlements. They chose the settlements. The memo was called the 'Ford Pinto Memo.' They put a dollar value on your life and it came out cheaper than the fix."
  }
},
  "profiles_v8/verizon.json": {
  "brand_name": "Verizon",
  "brand_slug": "verizon",
  "parent_company": "Verizon Communications Inc.",
  "ultimate_parent": "Verizon Communications Inc.",
  "subsidiaries": ["Verizon Wireless", "Fios", "Yahoo (Oath/Verizon Media)", "Visible", "TracFone"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "VERIZON SOLD REAL-TIME LOCATION DATA TO BOUNTY HUNTERS AND COOPERATED WITH WARRANTLESS NSA MASS SURVEILLANCE",
  "executive_summary": "Verizon is the largest wireless carrier in the United States with approximately 143 million wireless subscribers and annual revenues exceeding $134 billion. The company has a documented history of selling customer location data to third parties without consent, cooperating with NSA mass surveillance programs, throttling network speeds for emergency responders, and systematic consumer deception through hidden fees and misleading pricing. The FCC has proposed $57 million in fines for Verizon's location data sales to bounty hunters. Edward Snowden's leaked NSA documents revealed Verizon as a primary partner in the PRISM mass surveillance program, providing the government with bulk metadata on millions of Americans without individual warrants.",
  "verdict_tags": ["location_data_sale_bounty_hunters", "nsa_prism_surveillance", "emergency_responder_throttling", "deceptive_pricing", "fcc_fines", "data_privacy_violations"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": false, "legal": true},
  "tax": {
    "summary": "Verizon has used complex depreciation schedules and offshore structures to minimize U.S. tax obligations. The company received approximately $3 billion in tax benefits from the 2017 Tax Cuts and Jobs Act. Verizon's international operations route profits through Ireland and Luxembourg. The company has been cited for aggressive transfer pricing between its domestic and international subsidiaries.",
    "flags": ["tcja_3b_windfall", "ireland_luxembourg_structures", "aggressive_depreciation_schedules"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Location data (2020): FCC proposed $57.3 million in fines for selling customers' real-time location data to third-party aggregators who resold it to bounty hunters, bail bond companies, and other parties without customer consent — despite Verizon's promises to stop. The FCC found Verizon violated CPNI (Customer Proprietary Network Information) rules. NSA cooperation (2013): Snowden documents revealed Verizon provided bulk telephone metadata to NSA under a classified FISA court order — affecting millions of customers who had no knowledge of the program. Multiple state attorney general investigations for deceptive advertising of network speeds. FTC and state AG investigations for hidden fees and misleading promotional pricing.",
    "flags": ["57m_fcc_location_data_fine_proposed", "nsa_bulk_metadata_collection_documented", "deceptive_advertising_investigations", "hidden_fee_pattern"],
    "sources": ["https://www.fcc.gov"]
  },
  "labor": {
    "summary": "Verizon employs approximately 105,000 people. CWA (Communications Workers of America) represents approximately 25,000 Verizon employees. The 2016 CWA strike — 39,000 workers for 45 days — was one of the largest U.S. strikes in years, citing forced overtime, offshoring of call center jobs, and benefit reductions. The company has systematically moved call center jobs offshore and to non-union contractors. Verizon's workforce reductions have been conducted while executive compensation has grown.",
    "flags": ["2016_cwa_39000_worker_strike", "offshore_call_center_movement", "workforce_reduction_vs_executive_pay"],
    "sources": ["https://www.cwa-union.org"]
  },
  "environmental": {
    "summary": "Verizon's network infrastructure — millions of cell towers, data centers, and cable installations — is a significant energy consumer. The company has made renewable energy commitments but its actual carbon footprint from network operations remains substantial. Verizon's data centers and cell tower infrastructure generate significant electronic waste.",
    "flags": ["data_center_tower_energy_consumption", "e_waste_infrastructure"],
    "sources": []
  },
  "political": {
    "summary": "Verizon spent $12.3 million on federal lobbying in 2023 — among the highest of any U.S. company. The company has been a primary opponent of net neutrality regulations, lobbied successfully for the 2017 FCC repeal of net neutrality rules, and challenged the FCC's 2024 attempt to restore them. The revolving door between Verizon, the FCC, and Congress is extensively documented. Verizon's former general counsel Randal Milch joined the Trump campaign; former FCC Chairman Ajit Pai joined Verizon-backed Searchlight Capital. Verizon's NSA cooperation — providing bulk metadata under secret FISA orders — represented a documented government-private surveillance partnership.",
    "flags": ["net_neutrality_repeal_primary_lobbyist", "revolving_door_fcc", "ajit_pai_verizon_backed_firm", "nsa_surveillance_partner"],
    "sources": ["https://www.opensecrets.org", "https://theintercept.com"]
  },
  "executives": {
    "summary": "CEO Hans Vestberg received $20.3 million in total compensation in 2023. Verizon's executive compensation has grown through the period of its location data sales controversy and net neutrality lobbying. The company's executive leadership has maintained close relationships with FCC commissioners — a revolving door that critics argue enabled the net neutrality repeal and limited FCC enforcement against location data violations.",
    "flags": ["executive_pay_through_location_data_controversy", "fcc_revolving_door_executive_relationships"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Verizon shares major institutional investors with AT&T, T-Mobile, and Comcast — creating aligned incentives across the telecom industry against net neutrality and consumer privacy regulations. Verizon's NSA cooperation connects it to the U.S. intelligence apparatus in ways that are structurally similar to AT&T's documented surveillance relationship. Verizon's location data sales connected it to a network of data brokers, bounty hunters, and bail bond companies whose operations have been documented to endanger domestic violence survivors and witness protection participants.",
    "flags": ["telecom_shared_investor_alignment", "nsa_surveillance_parallel_att", "location_data_broker_network_danger"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Civil liberties researchers have alleged that Verizon's cooperation with NSA surveillance went beyond the FISA court order revealed in 2013 — that the company provided additional access through cooperative relationships not covered by court orders. Net neutrality advocates have alleged that Verizon's throttling of Netflix and other streaming services — which it throttled until confronted in 2018 — was a deliberate strategy to disadvantage competitors to its own streaming offerings. Former Verizon sales employees have alleged that pressure to add unauthorized services to customer accounts was a documented practice in some call centers.",
    "flags": ["nsa_cooperation_beyond_court_order_alleged", "netflix_throttling_competitive_strategy_alleged", "unauthorized_service_addition_alleged"],
    "sources": ["https://theintercept.com"]
  },
  "health_record": {
    "summary": "Verizon's throttling of Santa Clara Fire Department communications during the 2018 Mendocino Complex wildfire — which AT&T also did — demonstrated how carrier throttling can directly impair life-safety emergency response. The location data sales to bounty hunters created documented risk for domestic violence survivors, stalking victims, and witness protection participants — individuals for whom real-time location disclosure can be life-threatening. Verizon's resistance to net neutrality has implications for telemedicine access — where throttling could slow or degrade remote healthcare services.",
    "flags": ["emergency_responder_throttling_life_safety", "location_data_domestic_violence_risk", "net_neutrality_telemedicine_implications"],
    "sources": ["https://www.fcc.gov"]
  },
  "alternatives": {
    "cheaper": ["T-Mobile — consistently lower prices than Verizon and AT&T; comparable coverage in most markets", "Mint Mobile — MVNO on T-Mobile network; $15-30/month vs Verizon's $80+ for similar service", "Visible — Verizon MVNO at $25-45/month; uses Verizon network without supporting Verizon directly", "Consumer Cellular — lower prices, AARP-affiliated, good customer service"],
    "healthier": ["MVNOs (Mobile Virtual Network Operators) use Verizon's infrastructure without supporting its data sales and lobbying directly", "Encrypted messaging (Signal) reduces the value of any communication data collected", "VPN services reduce ISP monitoring of browsing activity"],
    "diy": ["Opt out of Verizon's Custom Experience program in your account settings — limits data sharing for targeted advertising", "Check your account regularly for unauthorized service additions", "File FCC complaints for throttling or data sharing concerns — the FCC database is a public record"]
  },
  "timeline": [
    {"year": 2000, "event": "Verizon Communications formed from Bell Atlantic and GTE merger", "severity": "neutral", "source_url": ""},
    {"year": 2006, "event": "USA Today reports NSA secretly collecting phone records from tens of millions of Americans via Verizon and others", "severity": "critical", "source_url": ""},
    {"year": 2013, "event": "Snowden documents confirm Verizon FISA order — NSA collecting bulk metadata on all Verizon customers", "severity": "critical", "source_url": ""},
    {"year": 2017, "event": "FCC repeals net neutrality; Verizon primary corporate beneficiary and lobbying force behind repeal", "severity": "critical", "source_url": ""},
    {"year": 2018, "event": "Verizon caught throttling Santa Clara Fire Department during Mendocino Complex wildfire emergency", "severity": "critical", "source_url": ""},
    {"year": 2018, "event": "Vice/Motherboard investigation documents Verizon location data sale to bounty hunters via third-party aggregators", "severity": "critical", "source_url": ""},
    {"year": 2020, "event": "FCC proposes $57.3M in fines for location data violations; Verizon disputes and appeals", "severity": "high", "source_url": "https://www.fcc.gov"},
    {"year": 2023, "event": "Verizon spends $12.3M on lobbying — among highest of any U.S. company", "severity": "moderate", "source_url": ""},
    {"year": 2024, "event": "Major AT&T data breach affecting 110M customers; Verizon's data practices face increased scrutiny", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Verizon's net neutrality lobbying — if successful — enables tiered internet access that disproportionately affects low-income communities dependent on mobile internet as their primary connection. Communities where Verizon is the dominant carrier have limited competitive alternatives, making Verizon's pricing and data practices impossible to escape through market choice.",
    "price_illusion": "Verizon's advertised plan prices consistently exclude 'administrative fees,' 'network access charges,' and various other fees that add $10-20/month to bills. The FCC has investigated Verizon's pricing disclosures. The total cost of a Verizon plan is consistently 20-30% higher than the advertised price.",
    "tax_math": "Verizon received $3 billion in TCJA tax benefits. The company's location data sales — now subject to $57M in proposed FCC fines — generated revenue from selling customers' private data without consent, while the company paid no compensation to the customers whose data was sold.",
    "wealth_velocity": "Monthly phone bills from 143 million wireless subscribers — a near-necessity in modern American life — flow to Verizon shareholders globally. In many markets, Verizon and AT&T effectively operate as a duopoly, limiting competitive pressure on prices."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Verizon shareholders", "how": "Monopoly-adjacent pricing power; data sale revenue; net neutrality repeal enables future revenue from tiered access"},
      {"group": "NSA surveillance apparatus", "how": "Bulk metadata access to all Verizon customer communications"},
      {"group": "Bounty hunters and bail bond companies", "how": "Real-time location data for tracking individuals — purchased through aggregators from Verizon without customer knowledge"}
    ],
    "who_paid": [
      {"group": "Domestic violence survivors", "how": "Real-time location data could be accessed by abusers through aggregator network"},
      {"group": "Santa Clara firefighters", "how": "Emergency communications throttled during active wildfire for nonpayment of plan upgrade"},
      {"group": "143 million Verizon customers", "how": "Location data sold without consent; communications metadata collected by NSA; hidden fees"},
      {"group": "Net neutrality advocates", "how": "Open internet protections stripped through Verizon-funded lobbying"}
    ],
    "the_gap": "Verizon sold your location to people who needed to find you — without telling you. During an active wildfire, it throttled the firefighters' data connection. Then it spent $12 million lobbying to stay unregulated. The $57 million fine is still proposed — not paid."
  }
},
  "profiles_v9/cargill.json": {
  "brand_name": "Cargill",
  "brand_slug": "cargill",
  "parent_company": "Cargill Incorporated",
  "ultimate_parent": "Cargill Family (75% ownership)",
  "subsidiaries": ["Cargill Protein", "Cargill Grain", "Cargill Salt", "Cargill Agriculture Supply Chain", "Sterling Sugars", "Provimi"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "CARGILL IS THE LARGEST PRIVATE COMPANY IN AMERICA — IT CONTROLS THE GLOBAL FOOD SUPPLY AND ANSWERS TO NO ONE",
  "executive_summary": "Cargill is the largest privately held company in the United States with annual revenues exceeding $177 billion — it is also one of the largest corporations on earth. Because it is private, Cargill is not required to disclose financial details, lobbying expenditures, or executive compensation that public companies must report. Cargill handles approximately 25% of all U.S. grain exports, is one of the world's largest agricultural commodity traders, and controls significant portions of the global supply chains for corn, soy, wheat, palm oil, beef, and poultry. The company has been documented to source from suppliers that drive Amazon deforestation, use child and forced labor in cocoa supply chains, engage in price manipulation of agricultural commodities, and systematically avoid regulatory scrutiny through its private structure.",
  "verdict_tags": ["amazon_deforestation_sourcing", "cocoa_child_labor", "grain_price_manipulation", "private_no_disclosure", "antitrust_concerns", "environmental_contamination"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": false, "legal": true},
  "tax": {
    "summary": "As a private company, Cargill does not disclose its tax arrangements. The company is known to use extensive offshore structures — with significant operations in Switzerland, Singapore, and other jurisdictions — for its commodity trading operations. Cargill's private structure means no public disclosure of its effective tax rate, offshore holdings, or tax arrangements with any jurisdiction. The Cargill family's ownership structure — through a complex system of trusts and holding companies — minimizes estate tax obligations across generations.",
    "flags": ["private_no_disclosure", "swiss_singapore_trading_structures", "family_trust_estate_tax_minimization"],
    "sources": []
  },
  "legal": {
    "summary": "Cargill has faced multiple significant legal actions across its operations. 2015: Cargill paid $11.5 million to settle CFTC charges for manipulating wheat futures — cornering the futures market. 2002: Cargill paid $25 million to settle antitrust charges for lysine price-fixing. Cargill has been sued by environmental groups for sourcing soy and beef from suppliers connected to Amazon deforestation in Brazil. Cargill has been named in child labor lawsuits related to its cocoa sourcing from West African farms — the Supreme Court ruled in 2021 that the case could not proceed in U.S. courts on jurisdictional grounds, not merits. Cargill's beef processing facilities have faced multiple OSHA enforcement actions for worker safety violations.",
    "flags": ["11_5m_wheat_futures_manipulation", "25m_lysine_price_fixing", "amazon_deforestation_sourcing_lawsuits", "child_labor_cocoa_supreme_court", "osha_beef_processing_violations"],
    "sources": ["https://www.cftc.gov", "https://www.justice.gov"]
  },
  "labor": {
    "summary": "Cargill employs approximately 155,000 people globally. The company's U.S. meatpacking and processing operations — which employ significant immigrant and refugee workforces — have faced OSHA enforcement for workplace injuries. During COVID-19, Cargill's meat processing plants became major outbreak sites; a Cargill plant in High River, Alberta contributed to one of Canada's deadliest workplace COVID outbreaks. The company's global supply chain involves cocoa farmers in West Africa — where child labor on cocoa farms has been documented by the U.S. Department of Labor and multiple investigative reports.",
    "flags": ["meatpacking_osha_violations", "covid_high_river_outbreak", "cocoa_child_labor_supply_chain", "immigrant_workforce_conditions"],
    "sources": ["https://www.osha.gov", "https://www.dol.gov"]
  },
  "environmental": {
    "summary": "Cargill is one of the primary drivers of Amazon deforestation through its soy and beef sourcing in Brazil. Greenpeace and others have documented Cargill-linked suppliers clearing Amazon rainforest for soy cultivation — soy that is then exported as animal feed. Cargill made a 2006 moratorium commitment not to source from recently deforested areas; environmental groups have documented ongoing violations of this commitment. Cargill's fertilizer and chemical operations generate significant environmental impacts. The company's nitrogen fertilizer use contributes to the Gulf of Mexico dead zone — a hypoxic zone of depleted oxygen caused by nitrogen runoff from midwestern agriculture.",
    "flags": ["amazon_deforestation_primary_driver", "soy_moratorium_violations", "gulf_dead_zone_contribution", "nitrogen_runoff_agriculture"],
    "sources": ["https://www.greenpeace.org", "https://www.ran.org"]
  },
  "political": {
    "summary": "As a private company, Cargill's lobbying expenditures are not fully disclosed. The company participates in agricultural trade associations — including the U.S. Grains Council, American Farm Bureau, and Grocery Manufacturers Association — that coordinate lobbying on commodity pricing, agricultural subsidies, trade policy, and food safety regulations. Cargill has lobbied against country-of-origin labeling for meat — a transparency measure that would allow consumers to know where their beef comes from. The company's global scale gives it leverage in negotiations with developing country governments over land rights and agricultural policy.",
    "flags": ["private_lobbying_not_disclosed", "country_of_origin_labeling_opposition", "developing_country_government_leverage"],
    "sources": []
  },
  "executives": {
    "summary": "CEO Brian Sikes took over in 2023. Cargill does not disclose executive compensation as a private company — one of the few major corporate decisions that private status genuinely enables. The Cargill and MacMillan families — descendants of the founder — collectively own approximately 90% of the company. Their combined wealth is estimated to exceed $50 billion. Cargill has approximately 14 family shareholders who represent one of the most concentrated private fortunes in American history built on commodity trading.",
    "flags": ["no_executive_pay_disclosure_private", "family_50b_wealth_commodity_trading", "14_family_shareholders"],
    "sources": []
  },
  "connections": {
    "summary": "Cargill, Archer-Daniels-Midland (ADM), Bunge, and Louis Dreyfus together are known as the 'ABCD' companies — four trading companies that collectively control the majority of global grain trading. This oligopoly over the food system's most critical infrastructure — grain trading, storage, and transport — gives these four companies enormous leverage over global food prices and food security. The ABCD companies' concentration is particularly significant in developing countries, where they effectively set commodity prices that determine farmer income and food costs for billions of people.",
    "flags": ["abcd_grain_oligopoly", "global_food_price_control", "developing_country_food_security_leverage"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Environmental investigations by Greenpeace and other organizations have alleged that Cargill continues to source from farms connected to recent Amazon deforestation despite its stated moratorium — using the complexity of Brazilian supply chains and soy trading to obscure the connection. Investigative reporting by The Guardian and others has documented Cargill-linked suppliers clearing areas that satellite data shows were recently forested. Former commodity traders have alleged that the ABCD companies' collective market positions in futures markets create opportunities for information asymmetry that benefits their trading desks at the expense of farmers and consumers. The private structure makes these allegations very difficult to verify.",
    "flags": ["amazon_moratorium_violations_documented_by_satellites", "futures_market_information_asymmetry_alleged", "private_structure_verification_barrier"],
    "sources": ["https://www.theguardian.com", "https://www.greenpeace.org"]
  },
  "health_record": {
    "summary": "Cargill's role in the global food system has direct public health implications. The company's palm oil sourcing contributes to deforestation that affects climate and regional health. Cargill's meatpacking operations — particularly during COVID-19 — exposed thousands of workers to infection risk; the High River, Alberta Cargill facility had over 900 COVID cases in a single outbreak. The USDA has issued beef recalls for Cargill-produced products for E. coli contamination multiple times. The company's nitrogen fertilizer distribution contributes to the agricultural runoff that creates the Gulf of Mexico dead zone, affecting the health of the Gulf ecosystem and the communities that depend on it.",
    "flags": ["covid_high_river_900_cases", "beef_ecoli_recalls", "gulf_dead_zone_health_ecosystem"],
    "sources": ["https://www.usda.gov"]
  },
  "alternatives": {
    "cheaper": ["Buying direct from farmers at farmers markets eliminates commodity trader margin entirely", "Food co-ops — cooperative purchasing reduces dependence on Cargill-linked supply chains", "Growing your own staple crops where possible — even small gardens reduce commodity dependence"],
    "healthier": ["Direct-to-farm beef and grain purchases — know your source, bypass ABCD trading companies", "Reduced meat consumption — lowers dependence on Cargill's beef and poultry processing", "Organic certified products — supply chain traceability requirements reduce deforestation-linked sourcing risk"],
    "diy": ["Cargill products enter your food supply through many channels — processed foods, grain-fed meat, and cooking oils are primary vectors", "Consumer pressure on food brands to disclose their commodity sourcing creates pressure up the supply chain to Cargill", "Support mandatory country-of-origin labeling and supply chain disclosure legislation"]
  },
  "timeline": [
    {"year": 1865, "event": "Cargill founded by W.W. Cargill in Conover, Iowa as a grain warehousing operation", "severity": "neutral", "source_url": ""},
    {"year": 1972, "event": "Cargill facilitates the 'Great Grain Robbery' — massive Soviet grain purchase that contributed to U.S. food price spike", "severity": "high", "source_url": ""},
    {"year": 1996, "event": "ADM lysine price-fixing scandal; Cargill also implicated and pays $25M in antitrust settlement", "severity": "high", "source_url": ""},
    {"year": 2006, "event": "Cargill agrees to Amazon soy moratorium following Greenpeace campaign; violations documented subsequently", "severity": "moderate", "source_url": ""},
    {"year": 2015, "event": "CFTC: $11.5M settlement for wheat futures market manipulation", "severity": "high", "source_url": "https://www.cftc.gov"},
    {"year": 2020, "event": "COVID: Cargill High River, Alberta plant — 900+ cases, 3 deaths; becomes one of Canada's deadliest workplace outbreaks", "severity": "critical", "source_url": ""},
    {"year": 2021, "event": "Supreme Court rules cocoa child labor case cannot proceed in U.S. courts — not on merits but jurisdiction", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Satellite analysis continues documenting Amazon deforestation in Cargill-linked supply chains despite moratorium", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "Cargill revenues exceed $177B — larger than most countries' GDPs; continues operating without public disclosure requirements", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Cargill's soy sourcing in Brazil has contributed to the displacement of Indigenous communities and traditional farmers from Amazon territories converted to soy monoculture. The Amazon deforestation accelerated by Cargill-linked supply chains destroys biodiversity, disrupts rainfall patterns affecting agriculture across South America, and eliminates the land rights of communities that have lived there for generations.",
    "price_illusion": "Commodity prices set by ABCD trading companies reflect their market power rather than pure supply and demand. Farmers in developing countries receive prices determined in part by the oligopoly's trading positions. Consumers in wealthy countries pay prices that externalize the cost of deforestation, child labor, and environmental damage into the price of food.",
    "tax_math": "Cargill's private status and Swiss/Singapore trading operations allow it to minimize tax obligations across jurisdictions while operating at $177 billion in revenue. The true tax rate is unknown. Agricultural subsidies — which benefit Cargill's U.S. farmer suppliers — represent public support for the supply chain that Cargill profits from without proportionate public accountability.",
    "wealth_velocity": "Cargill's $177 billion revenue flows primarily to approximately 14 Cargill and MacMillan family members and a small number of other investors. This concentration of agricultural trading profit in one American family — while controlling food supply chains that affect billions of people — is one of the most extreme examples of wealth concentration in the global food system."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Cargill and MacMillan families", "how": "$50B+ estimated fortune; private structure avoids disclosure of exact wealth or compensation"},
      {"group": "Industrial agriculture system", "how": "Cargill's infrastructure enables industrial-scale commodity farming that generates margins for large operations while squeezing small farmers"},
      {"group": "Global food manufacturing", "how": "Access to commodity inputs at trading company prices that small competitors cannot match"}
    ],
    "who_paid": [
      {"group": "Amazon Indigenous communities", "how": "Land cleared for soy monoculture; documented displacement in Cargill-linked supply chains"},
      {"group": "Cocoa child laborers", "how": "Child labor on West African cocoa farms in Cargill-linked supply chains; Supreme Court blocked U.S. jurisdiction"},
      {"group": "High River Cargill workers", "how": "900 COVID cases, 3 deaths in one plant; inadequate protection during pandemic"},
      {"group": "Small farmers globally", "how": "Commodity prices set by ABCD oligopoly; no negotiating power against $177B company"}
    ],
    "the_gap": "Cargill handles 25% of all U.S. grain exports and is larger than most countries' GDPs. It is privately held and discloses almost nothing. Its supply chains involve documented child labor and Amazon deforestation. The Cargill family is worth $50 billion. Your food goes through them."
  }
},
  "profiles_v9/general-motors.json": {
  "brand_name": "General Motors",
  "brand_slug": "general-motors",
  "parent_company": "General Motors Company",
  "ultimate_parent": "General Motors Company",
  "subsidiaries": ["Chevrolet", "GMC", "Buick", "Cadillac", "GM Financial", "OnStar", "Cruise (autonomous)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "GM KNEW THE IGNITION SWITCH KILLED PEOPLE FOR 13 YEARS AND KEPT MAKING THE PART",
  "executive_summary": "General Motors is the largest U.S. automaker by revenue, generating approximately $185 billion annually. For 13 years, GM knew that a faulty ignition switch in millions of Chevrolet Cobalts and other vehicles could inadvertently cut engine power, disabling power steering and airbags mid-drive. The defect has been linked to at least 124 deaths and 275 injuries. GM knew — internal documents prove awareness as early as 2001 — and chose not to recall the vehicles, in part because the fix cost 57 cents per vehicle. GM paid $900 million in a DOJ settlement in 2015 and $120 million in victim compensation. GM also benefited from a $49.5 billion government bailout in 2009 that effectively wiped out its pre-bankruptcy liabilities including the ignition switch claims — creating a legal shield its attorneys later exploited.",
  "verdict_tags": ["ignition_switch_13_year_concealment", "124_deaths", "57_cent_fix_13_years", "doj_900m_settlement", "bankruptcy_bailout_liability_shield", "safety_concealment"],
  "concern_flags": {"labor": true, "environmental": true, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "GM's 2009 bankruptcy created a 'new GM' that shed pre-bankruptcy liabilities while retaining pre-bankruptcy assets — a structure that generated significant tax benefits including $45.4 billion in net operating loss carryforwards. The bailout and bankruptcy effectively gave GM a tax shield that new companies would not receive. GM has also used offshore manufacturing and financing subsidiaries to minimize tax obligations on global operations.",
    "flags": ["45_4b_nol_carryforward_bankruptcy", "new_gm_liability_asset_split", "offshore_subsidiary_structures"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Ignition switch: 2015 DOJ settlement of $900 million for concealing the ignition switch defect. GM admitted making false statements to NHTSA. Criminal charges were avoided through a Deferred Prosecution Agreement. GM's independent victim compensation fund — administered by Kenneth Feinberg — paid approximately $595 million to 399 claimants. Critical legal issue: 'New GM' (post-bankruptcy) argued it did not inherit liabilities from 'Old GM,' attempting to shield itself from ignition switch claims despite knowing about the defect during the bankruptcy. U.S. Supreme Court ultimately ruled against GM's most aggressive liability shield arguments. NHTSA fines: $35 million (maximum allowed) for recall failures. Total GM recall costs 2014-2016 exceeded $4 billion.",
    "flags": ["900m_doj_concealment_settlement", "admitted_false_statements_nhtsa", "new_gm_liability_shield_attempt", "35m_nhtsa_max_fine_inadequate"],
    "sources": ["https://www.justice.gov"]
  },
  "labor": {
    "summary": "GM employs approximately 163,000 people globally. The 2019 UAW strike — 40 days, 46,000 workers — was the longest GM strike since 1970, triggered by disputes over wages, healthcare, temporary workers, and plant closures. GM had announced the closure of five North American plants as part of a restructuring that eliminated 14,000 jobs while simultaneously investing billions in overseas production. The plant closures became a major political issue in 2018-2019. The UAW's 2023 strike resulted in significant wage increases from GM, Ford, and Stellantis.",
    "flags": ["2019_uaw_40_day_strike", "5_plant_closures_vs_overseas_investment", "2023_strike_wage_gains"],
    "sources": ["https://www.nlrb.gov"]
  },
  "environmental": {
    "summary": "GM's vehicle fleet — dominated by trucks and SUVs — is a major source of U.S. transportation emissions. The company's Cruise autonomous vehicle subsidiary has faced serious safety scrutiny after a robotaxi struck and dragged a pedestrian in San Francisco in 2023 — GM concealed the full extent of the incident from regulators and Cruise's operating permit was suspended. GM has made EV commitments but its truck-dominant lineup continues to account for most revenue.",
    "flags": ["truck_suv_fleet_emissions", "cruise_pedestrian_dragging_incident", "cruise_permit_revocation", "ev_commitment_vs_truck_revenue"],
    "sources": []
  },
  "political": {
    "summary": "GM received a $49.5 billion government bailout in 2009 — the largest auto industry bailout in history. The company subsequently closed plants in politically significant states while expanding overseas manufacturing. GM has lobbied on CAFE fuel economy standards, EV policy, autonomous vehicle regulations, and trade policy. The Cruise robotaxi scandal — where GM concealed full incident details from California regulators — represents a documented case of regulatory deception.",
    "flags": ["49_5b_government_bailout", "post_bailout_plant_closures_political", "cruise_regulator_concealment"],
    "sources": []
  },
  "executives": {
    "summary": "CEO Mary Barra received $29 million in total compensation in 2023. Barra became CEO in January 2014 — just weeks before the ignition switch scandal became public. Her handling of the scandal — including creating the victim compensation fund — was generally praised, though critics noted GM avoided criminal prosecution. The executives who knowingly concealed the ignition switch defect for 13 years were fired but faced no criminal charges. GM's internal investigation named 15 employees as primarily responsible; none were prosecuted.",
    "flags": ["15_employees_responsible_zero_prosecuted", "no_criminal_charges_13_year_concealment", "barra_29m_compensation"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "GM shares major institutional investors with Ford, Stellantis, and Toyota. The auto industry's trade associations — Alliance for Automotive Innovation, formerly Alliance of Automobile Manufacturers — coordinate lobbying against fuel economy standards and emissions regulations. GM's 2009 bankruptcy was politically managed through the U.S. Treasury, creating ongoing political connections that have influenced the company's regulatory treatment. Cruise autonomous vehicles involves a partnership with Honda, connecting GM's autonomous strategy to a major competitor.",
    "flags": ["auto_industry_emissions_lobbying_coordination", "treasury_political_management_post_bailout", "honda_cruise_partnership"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Congressional investigators found that GM's engineers and lawyers knew about the ignition switch defect for years and specifically chose not to classify it as a safety defect — because the internal 'star' rating system GM used didn't technically require recall at that level of risk. This categorical manipulation allowed GM to internally document awareness while officially claiming it had no safety-defect knowledge. Consumer safety advocates have alleged that the $595 million victim compensation fund — which required claimants to waive GM from liability — was structured to minimize GM's legal exposure rather than fairly compensate victims. Cruise's concealment of the pedestrian dragging incident involved allegedly providing regulators with an incomplete video that cut before showing the vehicle dragged the person.",
    "flags": ["internal_star_system_manipulation_alleged", "compensation_fund_liability_waiver_structure", "cruise_incomplete_video_regulators_alleged"],
    "sources": []
  },
  "health_record": {
    "summary": "GM's ignition switch defect has been linked to at least 124 deaths and 275 injuries. The defect caused the engine to cut out at highway speed, disabling power steering and crucially disabling airbags — meaning vehicles in high-speed crashes had no airbag protection. The switch cost 57 cents to fix. GM knew about the defect from 2001. The Cruise autonomous vehicle pedestrian dragging incident caused severe injuries to the victim — the vehicle's sensor detected the person had been hit but the vehicle drove forward, pinning the pedestrian under the vehicle.",
    "flags": ["124_deaths_ignition_switch", "airbags_disabled_high_speed_crashes", "57_cent_fix_over_13_years", "cruise_pedestrian_severe_injuries"],
    "sources": []
  },
  "alternatives": {
    "cheaper": ["Ford — comparable pricing, U.S. manufacturer, different safety record profile", "Honda and Toyota — both have had safety scandals but generally stronger reliability reputations", "Used vehicles from any manufacturer — avoiding newest model years reduces exposure to undiscovered defects"],
    "healthier": ["Toyota hybrids and Honda hybrids — significantly better fuel economy than GM's truck-dominant lineup", "Chevrolet Bolt EV — GM's legitimate EV contribution, though the platform has faced its own battery fire recall issues", "Public transit for urban commuting eliminates vehicle ownership costs and emissions entirely"],
    "diy": ["Check your GM vehicle for open recalls at NHTSA.gov — enter your VIN; ignition switch recall is complete but other open recalls may apply", "GM's OnStar data collection — understand what data is shared and with whom; OnStar collects vehicle telematics and location data", "Advocate for stronger NHTSA recall enforcement authority — the $35M maximum fine that GM paid is clearly insufficient deterrent"]
  },
  "timeline": [
    {"year": 1908, "event": "General Motors Company founded by William Durant", "severity": "neutral", "source_url": ""},
    {"year": 2001, "event": "GM engineers first identify ignition switch defect; internal documentation begins", "severity": "critical", "source_url": ""},
    {"year": 2003, "event": "GM decides not to fix ignition switch defect — engineers document decision not to recall", "severity": "critical", "source_url": ""},
    {"year": 2009, "event": "$49.5B government bailout; GM files bankruptcy; 'New GM' structure potentially shields ignition switch liability", "severity": "high", "source_url": ""},
    {"year": 2014, "event": "Ignition switch scandal goes public; new CEO Mary Barra takes over; massive recalls begin", "severity": "critical", "source_url": ""},
    {"year": 2014, "event": "Congressional hearings document 13-year concealment; GM fires 15 employees; NHTSA fines $35M maximum", "severity": "critical", "source_url": ""},
    {"year": 2015, "event": "$900M DOJ settlement; Deferred Prosecution Agreement; admitted false statements to NHTSA", "severity": "critical", "source_url": "https://www.justice.gov"},
    {"year": 2015, "event": "Victim compensation fund pays ~$595M to 399 claimants; waiver of GM liability required", "severity": "high", "source_url": ""},
    {"year": 2019, "event": "UAW strike: 46,000 workers, 40 days; GM had announced 14,000 job cuts and 5 plant closures", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Cruise robotaxi strikes and drags pedestrian in San Francisco; GM conceals full incident from regulators; Cruise permit suspended", "severity": "critical", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "GM's 2018-2019 plant closures — Lordstown, Ohio; Detroit-Hamtramck, Michigan; Oshawa, Ontario; Warren, Michigan; Baltimore, Maryland — devastated communities built around auto manufacturing. Lordstown, Ohio, a town of approximately 3,500 people, lost its primary economic engine. These closures occurred while GM was expanding overseas manufacturing.",
    "price_illusion": "GM's vehicle prices reflect the cost of manufacturing but not the externalized costs of the ignition switch deaths, the bailout, or the environmental impact of a truck-and-SUV-dominant fleet. The $49.5 billion bailout was largely repaid, but taxpayers lost approximately $11.2 billion on the GM bailout overall.",
    "tax_math": "GM's $45.4 billion in net operating loss carryforwards from the 2009 bankruptcy — created by the government-managed restructuring — gave the company a tax shield that private companies emerging from bankruptcy would not typically receive. This reduced GM's tax obligations for years following the bailout.",
    "wealth_velocity": "GM's profits from truck and SUV sales — generated from American drivers — flow to institutional shareholders globally. The Lordstown, Ohio, community received nothing when the plant closed; the capital was redeployed to overseas manufacturing."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "GM management 2001-2014", "how": "Avoided recall costs; maintained profitability; no criminal consequences; most fired but not prosecuted"},
      {"group": "GM shareholders (pre-recall)", "how": "Profit margins maintained through concealment period; recall costs socialized through victim compensation fund"},
      {"group": "U.S. government (partial)", "how": "Bailout repaid with interest; however taxpayers lost ~$11.2B overall on GM rescue"}
    ],
    "who_paid": [
      {"group": "124 people killed", "how": "Died in crashes where airbags didn't deploy due to a defect GM knew about and chose not to fix for 57 cents"},
      {"group": "Ignition switch injury victims", "how": "275 documented injuries; compensation fund required liability waiver"},
      {"group": "Lordstown, Warren, Baltimore, Oshawa workers", "how": "14,000 job cuts; plant closures; communities decimated"},
      {"group": "Cruise pedestrian victim", "how": "Struck, then dragged by robotaxi; GM concealed full incident from regulators"}
    ],
    "the_gap": "The fix cost 57 cents. GM knew for 13 years. 124 people died. Airbags that would have saved their lives were disabled by a faulty switch. GM paid $900 million. No one went to prison."
  }
},
  "profiles_v9/kroger.json": {
  "brand_name": "Kroger",
  "brand_slug": "kroger",
  "parent_company": "The Kroger Co.",
  "ultimate_parent": "The Kroger Co.",
  "subsidiaries": ["King Soopers", "Ralphs", "Fred Meyer", "Harris Teeter", "Smith's", "Fry's", "Simple Truth (private label)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "KROGER TRIED TO BUY ALBERTSONS AND CREATE A GROCERY MONOPOLY — TWO COURTS BLOCKED IT AND FOUND THEY WERE ALREADY COLLUDING",
  "executive_summary": "Kroger is the largest traditional grocery chain in the United States, operating approximately 2,700 stores under multiple banners with revenues exceeding $150 billion. In October 2022, Kroger announced a $24.6 billion acquisition of Albertsons — the second-largest traditional grocery chain — that would have created a near-monopoly in U.S. grocery retail. The FTC sued to block the deal in February 2024, joined by eight states. In December 2024, both a federal court in Oregon and a state court in Washington simultaneously blocked the merger — the federal court found the deal presumptively unlawful and that Kroger and Albertsons were already using each other as competitive checks. The Colorado AG's complaint also revealed that during a 2022 King Soopers worker strike, Kroger and Albertsons were documented to have coordinated not to hire striking workers — a potential antitrust violation.",
  "verdict_tags": ["blocked_merger_antitrust", "coordinated_strike_response", "monopoly_grocery_attempt", "overcharging_customers", "wage_suppression", "labor_violations"],
  "concern_flags": {"labor": true, "environmental": false, "political": true, "tax": true, "health": false, "legal": true},
  "tax": {
    "summary": "Kroger uses complex real estate structures — including sale-leaseback arrangements for its store properties — and transfer pricing between its subsidiary operations to minimize tax obligations. The company's private label brands generate higher margins that are structured to minimize taxable income. Kroger has received local government subsidies for distribution center locations.",
    "flags": ["sale_leaseback_structures", "private_label_tax_structures", "local_government_subsidies"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "December 2024: Both U.S. District Court for the District of Oregon and King County Superior Court in Washington simultaneously blocked the Kroger-Albertsons merger as presumptively unlawful under antitrust law. Colorado AG's complaint documented that during the 2022 King Soopers strike, Kroger and Albertsons management had discussions about not poaching striking workers — a potential antitrust violation separate from the merger. Multiple state consumer protection actions have been filed against Kroger for overcharging customers using shelf price discrepancies. California investigations found Kroger charged customers more than the posted shelf price at checkout — an illegal practice.",
    "flags": ["merger_blocked_federal_state_courts", "strike_coordination_antitrust_allegation", "shelf_price_overcharging_california", "consumer_protection_violations"],
    "sources": ["https://www.wsgr.com/en/insights/seeing-double-krogeralbertsons-merger-blocked"]
  },
  "labor": {
    "summary": "Kroger employs approximately 430,000 people, primarily UFCW members. The January 2022 King Soopers strike in Colorado — 8,400 workers for three weeks — documented the tension between Kroger's executive compensation and worker wages. CEO Rodney McMullen received $22 million in 2021 while striking workers earned $17-18/hour in a high-cost-of-living market. The UFCW has documented Kroger's practice of transitioning workers to part-time status to avoid benefit obligations. Kroger's proposed merger was opposed by UFCW, which argued it would weaken collective bargaining leverage.",
    "flags": ["king_soopers_2022_strike", "part_time_benefit_avoidance", "ufcw_merger_opposition", "executive_pay_vs_worker_wages"],
    "sources": ["https://www.ufcw.org"]
  },
  "environmental": {
    "summary": "Kroger is the largest supermarket food waste generator in the United States. The company has made food waste reduction commitments but continues to generate billions of pounds of food waste annually. Kroger's refrigeration systems — using hydrofluorocarbons (HFCs) — are a significant greenhouse gas source. The company has faced EPA enforcement for refrigerant leaks at multiple facilities.",
    "flags": ["food_waste_largest_generator", "hfc_refrigerant_leaks", "epa_refrigerant_enforcement"],
    "sources": ["https://echo.epa.gov"]
  },
  "political": {
    "summary": "Kroger spent $3.2 million on federal lobbying in 2023. The company has lobbied on grocery antitrust, food labeling, GMO disclosure, and minimum wage. Kroger's attempted Albertsons acquisition was a direct attempt to use market power to reduce competitive pressure — the courts found this would harm consumers. The company's 2022 Colorado strike coordination with Albertsons — documented in AG complaints — represents alleged use of market power to suppress worker wages.",
    "flags": ["merger_as_market_power_attempt", "strike_coordination_wage_suppression_alleged", "minimum_wage_opposition"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Rodney McMullen received $22 million in total compensation in 2023. His compensation during the 2022 King Soopers strike — when workers earning $17-18/hour walked out over wages — became a central union talking point. The pay ratio between CEO and median Kroger worker is among the highest in food retail. Kroger's board of directors approved the Albertsons merger despite FTC antitrust concerns, and continued to pursue it through two years of litigation before courts blocked it.",
    "flags": ["22m_ceo_during_strike", "high_pay_ratio_food_retail", "merger_pursuit_despite_ftc_concerns"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Kroger and Albertsons were found by courts to be each other's primary competitive check in most markets where both operated — their competition kept prices lower for consumers. The merger would have eliminated this check in 1,500+ store markets. Kroger's relationship with suppliers has been documented as coercive — using its market power to demand supplier concessions that reduce product quality or shift costs to producers. The Colorado AG documented that Kroger and Albertsons managers communicated during the 2022 strike in ways that suggested coordination on not hiring striking workers.",
    "flags": ["primary_competitor_elimination", "supplier_coercion_documented", "strike_communication_coordination_documented"],
    "sources": ["https://www.ftc.gov"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Consumer watchdog groups have alleged that Kroger's sale item pricing — where products are advertised at sale prices but charged at regular prices at checkout — is systematic rather than incidental, with California finding widespread discrepancies. Former Kroger managers have alleged that the company's pricing systems deliberately create overcharging scenarios that are difficult for individual customers to catch and dispute. UFCW has alleged that Kroger systematically converts full-time positions to part-time as part of a deliberate strategy to reduce benefit obligations — a practice documented in multiple contract negotiations.",
    "flags": ["systematic_overcharging_at_checkout_alleged", "deliberate_price_discrepancy_alleged", "systematic_part_time_conversion_alleged"],
    "sources": []
  },
  "health_record": {
    "summary": "Kroger's food desert footprint — the chain's store locations are concentrated in mid-to-upper income areas while avoiding lower-income communities — contributes to food access disparities. When Kroger has closed stores in lower-income communities, documented increases in diet-related health outcomes have been observed. Kroger's food safety record includes multiple product recalls for contamination. The company's private label Simple Truth brand has positioned itself as a healthier option — but private label products are often manufactured in the same facilities as the standard brands.",
    "flags": ["food_desert_location_pattern", "store_closure_diet_health_impacts", "product_contamination_recalls"],
    "sources": []
  },
  "alternatives": {
    "cheaper": ["Aldi — typically 15-30% cheaper than Kroger on comparable items; stronger private label", "Lidl — European-model grocery with lower prices and different product mix", "Local discount grocers and food co-ops — prices vary but support different ownership structures", "Farmers markets for produce — often comparable or lower per-unit pricing with higher quality"],
    "healthier": ["Local food co-ops — member-owned, typically source more locally, democratic governance", "Community-supported agriculture (CSA) boxes — direct farmer relationship, seasonal produce", "Farmers markets — direct producer relationships, fresher produce, more transparent sourcing"],
    "diy": ["Check your receipt against posted prices — overcharging at checkout is documented; you are entitled to the posted price", "Joining a food co-op provides member ownership, lower prices over time, and democratic governance", "Buy Nothing groups for non-perishable food sharing reduces overall grocery spending"]
  },
  "timeline": [
    {"year": 1883, "event": "Kroger founded in Cincinnati, Ohio by Barney Kroger", "severity": "neutral", "source_url": ""},
    {"year": 1999, "event": "Kroger merges with Fred Meyer; becomes largest U.S. supermarket chain", "severity": "neutral", "source_url": ""},
    {"year": 2022, "event": "January: King Soopers strike; 8,400 workers; Kroger and Albertsons allegedly coordinate not to hire strikers", "severity": "critical", "source_url": ""},
    {"year": 2022, "event": "October: $24.6B Albertsons acquisition announced; UFCW immediately opposes", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "California investigations find Kroger systematically overcharging customers at checkout; shelf price violations", "severity": "high", "source_url": ""},
    {"year": 2024, "event": "February: FTC sues to block merger; joined by 8 states and DC; novel labor market harm theory", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "December: Federal court in Oregon AND Washington state court simultaneously block the merger", "severity": "critical", "source_url": "https://www.wsgr.com/en/insights/seeing-double-krogeralbertsons-merger-blocked"},
    {"year": 2025, "event": "Merger formally abandoned; Kroger and Albertsons abandon deal; Albertsons sues Kroger for $600M breakup fee", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Kroger's store location strategy — concentrating in mid-to-upper income neighborhoods — contributes to food deserts in lower-income communities. When Kroger closes stores in lower-income areas for financial reasons, affected communities often lose their only full-service grocery option. The proposed merger, if completed, would have reduced competition in 1,500+ store markets — with documented risk of price increases.",
    "price_illusion": "Kroger's advertised sale prices are the hook; the documented practice of overcharging at checkout means the actual price paid is often higher than advertised. The company's loyalty program — which tracks every purchase — provides Kroger with detailed consumer data used for pricing optimization.",
    "tax_math": "Kroger's $150B in annual revenue generates enormous tax obligations, but sale-leaseback structures, accelerated depreciation, and subsidiary arrangements reduce the effective rate. State and local government subsidies for Kroger distribution centers represent public investment in private infrastructure.",
    "wealth_velocity": "Kroger's profits flow to institutional shareholders globally. CEO compensation of $22 million annually is funded by the pricing margin generated by 430,000 workers earning average wages significantly below a living wage in most U.S. markets."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Kroger shareholders", "how": "$150B+ in annual revenue from near-captive grocery market; stock buybacks funded by pricing power"},
      {"group": "Rodney McMullen", "how": "$22M annual compensation; attempted merger would have further increased market power and executive upside"}
    ],
    "who_paid": [
      {"group": "430,000 Kroger workers", "how": "Below-living-wage pay in most markets; systematic part-time conversion to avoid benefits; CEO-worker pay ratio among highest in food retail"},
      {"group": "Grocery customers", "how": "Documented systematic overcharging at checkout; loyalty data harvested for pricing optimization"},
      {"group": "Striking King Soopers workers", "how": "Alleged coordination between Kroger and Albertsons not to hire strikers — documented in AG complaint"}
    ],
    "the_gap": "Kroger and Albertsons were found by courts to be each other's primary competitive check. They tried to eliminate that check through a $24.6 billion merger. The courts said no. During a strike, their managers talked about not hiring each other's striking workers. That may be its own antitrust violation."
  }
},
  "profiles_v9/merck.json": {
  "brand_name": "Merck",
  "brand_slug": "merck",
  "parent_company": "Merck & Co. Inc.",
  "ultimate_parent": "Merck & Co. Inc.",
  "subsidiaries": ["MSD (outside North America)", "Organon (spun off)", "Prometheus Biosciences (acquired)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "MERCK CONCEALED VIOXX'S HEART ATTACK RISK FOR YEARS — THE DRUG KILLED AN ESTIMATED 50,000 PEOPLE",
  "executive_summary": "Merck is one of the largest pharmaceutical companies in the world, with annual revenues exceeding $58 billion. The company's Vioxx (rofecoxib) scandal is among the most consequential pharmaceutical safety failures in history. Merck launched Vioxx in 1999 as a revolutionary painkiller, generating $2.5 billion in annual sales. Internal documents — revealed in litigation — showed Merck had data demonstrating elevated cardiovascular risk before the drug launched and actively concealed this information from physicians, patients, and the FDA. Vioxx was withdrawn in 2004 after a clinical trial confirmed the cardiovascular risk. Epidemiologists estimated Vioxx caused 88,000-140,000 heart attacks, killing approximately 50,000 people. Merck paid $4.85 billion to settle approximately 27,000 personal injury lawsuits.",
  "verdict_tags": ["vioxx_50000_deaths_estimated", "cardiovascular_risk_concealment", "4_85b_settlement", "fda_misleading", "clinical_trial_manipulation", "price_gouging_patent_abuse"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Merck is incorporated in New Jersey but uses complex subsidiary structures in Ireland, Singapore, and other jurisdictions to minimize U.S. tax obligations on global pharmaceutical profits. The company's effective tax rate has consistently run below statutory rates. Merck has used transfer pricing between its domestic and international operations, including patent holding companies in low-tax jurisdictions. The company's 2021 acquisition of Acceleron Pharma for $11.5 billion generated goodwill deductions.",
    "flags": ["irish_subsidiary_structures", "patent_holding_tax_havens", "transfer_pricing_international"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Vioxx: Merck paid $4.85 billion in 2007 to settle approximately 27,000 personal injury claims. This did not include wrongful death claims, government health program claims, or non-U.S. claims. The FDA filed a warning letter in 2001 after Merck submitted a misleading promotional piece claiming Vioxx was safer than competing painkillers. Internal Merck documents revealed in litigation included a training guide teaching sales representatives how to avoid discussing cardiovascular risk with physicians — later called the 'Dodge Ball Vioxx' document. Criminal referrals were made but no Merck executives were criminally prosecuted. Merck also paid $650 million in 2009 to settle allegations of illegal marketing of its drugs to Medicaid.",
    "flags": ["4_85b_vioxx_settlement", "dodge_ball_training_document", "fda_warning_misleading_promotion", "650m_medicaid_marketing_settlement", "no_criminal_prosecutions"],
    "sources": ["https://www.justice.gov"]
  },
  "labor": {
    "summary": "Merck employs approximately 64,000 people. The company has conducted multiple workforce reductions following major drug patent expirations and restructurings. Following the Vioxx withdrawal, Merck eliminated approximately 7,000 positions. The company's research workforce is bifurcated between well-compensated scientists and lower-paid support staff at manufacturing facilities.",
    "flags": ["post_vioxx_7000_layoffs", "restructuring_workforce_reductions"],
    "sources": []
  },
  "environmental": {
    "summary": "Merck's pharmaceutical manufacturing generates chemical waste streams requiring specialized disposal. The company has received EPA enforcement citations for wastewater treatment violations and pharmaceutical waste disposal at manufacturing facilities. Merck's manufacturing facilities have been cited for air quality emissions in New Jersey and other states.",
    "flags": ["pharmaceutical_manufacturing_waste", "epa_enforcement_wastewater", "manufacturing_air_emissions"],
    "sources": ["https://echo.epa.gov"]
  },
  "political": {
    "summary": "Merck spent $9.4 million on federal lobbying in 2023. The company has opposed Medicare drug price negotiation authority — fighting against the IRA's negotiation provisions that apply to its drugs including Keytruda, the world's best-selling cancer drug. Merck has lobbied against PBM reform, generic drug facilitation, and drug pricing transparency. The revolving door between Merck's government affairs team and FDA, HHS, and congressional health committees is documented.",
    "flags": ["ira_negotiation_opposition_keytruda", "generic_drug_opposition", "revolving_door_fda_hhs"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Robert Davis received $19.4 million in total compensation in 2023. Former CEO Raymond Gilmartin led the company during the Vioxx period — he resigned following the drug's withdrawal but retained his pension and left with approximately $37 million in retirement benefits. No Merck executives faced criminal charges for the concealment of Vioxx's cardiovascular risk, despite internal documents showing awareness predating the drug's launch.",
    "flags": ["gilmartin_37m_departure_no_charges", "no_criminal_prosecutions_concealment", "davis_19_4m_compensation"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Merck's experience with Vioxx set off a broader conversation about pharmaceutical safety culture that remains ongoing. The drug's success — $2.5 billion annually — created financial pressure to protect it even as cardiovascular risk data accumulated. Merck shares major institutional investors with Pfizer, Johnson & Johnson, and other pharmaceutical companies, creating aligned incentives against drug pricing reform and stronger FDA oversight. Merck's Keytruda (pembrolizumab) — the world's best-selling drug — now generates $21+ billion annually, creating similar 'protect the franchise' incentives.",
    "flags": ["vioxx_financial_pressure_concealment", "cross_pharma_shared_investors_against_reform", "keytruda_new_protect_the_franchise_concern"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The 'Dodge Ball Vioxx' internal training document — which taught sales reps to avoid cardiovascular questions by 'dodge, duck, dip, dive, and dodge' — was presented in litigation as evidence of deliberate strategy to prevent physicians from learning about risk. Former Merck scientists have alleged that internal statistical analyses showing cardiovascular risk were not shared with the FDA or published in medical literature as required. A 2005 New England Journal of Medicine editorial concluded that Merck 'misrepresented' Vioxx data in its own published clinical trial reports. The FDA's own review found Merck had data available 4 years before withdrawal that showed elevated cardiovascular risk.",
    "flags": ["dodge_ball_document_deliberate_strategy", "fda_risk_data_4_years_early_alleged", "nejm_misrepresentation_editorial"],
    "sources": ["https://www.nejm.org"]
  },
  "health_record": {
    "summary": "Vioxx (rofecoxib) was estimated by epidemiologists at the FDA and academic institutions to have caused 88,000-140,000 serious cardiovascular events (heart attacks and strokes), with approximately 50,000 deaths. The drug was on the market from 1999-2004 — five years during which the cardiovascular risk was known internally and withheld. Merck's own data from the VIGOR trial in 2000 showed a 5-fold increase in heart attack rate — this data was published but characterized by Merck as a protective effect of the comparison drug (naproxen) rather than as harm from Vioxx. Subsequent analysis found this characterization was false.",
    "flags": ["50000_deaths_estimated", "88000_140000_serious_cardiovascular_events", "vigor_trial_data_mischaracterized", "5_fold_heart_attack_increase"],
    "sources": ["https://www.ncbi.nlm.nih.gov", "https://www.nejm.org"]
  },
  "alternatives": {
    "cheaper": ["Generic ibuprofen and naproxen — the drugs Vioxx was positioned to replace; available for pennies per dose", "Acetaminophen — effective for many pain types without cardiovascular risk", "Topical NSAIDs — effective for localized pain with lower systemic risk"],
    "healthier": ["Physical therapy for chronic pain — documented effectiveness with no drug-related cardiovascular risk", "Acupuncture for certain pain conditions — evidence base exists for specific indications", "Exercise-based pain management — documented effectiveness for osteoarthritis and back pain"],
    "diy": ["Ask your physician about drug cardiovascular risk for any NSAID before starting long-term use", "Search ClinicalTrials.gov and Drugs@FDA for primary trial data on any medication you're prescribed", "Report adverse drug events to FDA MedWatch — your report contributes to post-market safety surveillance"]
  },
  "timeline": [
    {"year": 1891, "event": "Merck & Co. established as U.S. subsidiary of German Merck KGaA", "severity": "neutral", "source_url": ""},
    {"year": 1996, "event": "Merck's internal trials show COX-2 inhibitors (Vioxx precursors) elevate cardiovascular risk", "severity": "critical", "source_url": ""},
    {"year": 1999, "event": "Vioxx approved by FDA; launched with aggressive direct-to-consumer marketing; $2.5B annual sales", "severity": "neutral", "source_url": ""},
    {"year": 2000, "event": "VIGOR trial: 5-fold heart attack increase documented in Vioxx vs naproxen; Merck characterizes as naproxen protection", "severity": "critical", "source_url": ""},
    {"year": 2001, "event": "FDA sends warning letter for misleading Vioxx promotional piece; 'Dodge Ball' training document exists", "severity": "critical", "source_url": ""},
    {"year": 2004, "event": "APPROVe trial confirms cardiovascular risk; Merck voluntarily withdraws Vioxx from market", "severity": "critical", "source_url": ""},
    {"year": 2005, "event": "FDA and epidemiologists estimate 88,000-140,000 serious cardiovascular events; ~50,000 deaths", "severity": "critical", "source_url": ""},
    {"year": 2007, "event": "$4.85B settlement with ~27,000 personal injury claimants; no criminal prosecutions of executives", "severity": "critical", "source_url": ""},
    {"year": 2009, "event": "$650M settlement for illegal Medicaid drug marketing", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Merck sues U.S. government over IRA drug price negotiation — Keytruda generates $21B+ annually", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Vioxx was disproportionately prescribed to older patients with arthritis — the demographic with highest cardiovascular risk. The 50,000 estimated deaths represented primarily the elderly population, whose deaths may have received less public attention than deaths of younger people. These were people's grandparents, parents, and spouses.",
    "price_illusion": "Vioxx was marketed as a safer alternative to existing NSAIDs — specifically safer for the stomach. The cardiovascular risk was real but concealed. The 'safety' benefit was real for one organ system (stomach) while the risk was concealed for another (heart). Patients and physicians made decisions based on incomplete information Merck held.",
    "tax_math": "Vioxx generated approximately $2.5 billion annually for five years — $12.5 billion total. The $4.85 billion settlement represents approximately 40% of the drug's total revenue over its marketed life — and did not include wrongful death claims, government payer claims, or international claims. The true cost of Vioxx is likely higher than the settlement.",
    "wealth_velocity": "Merck's pharmaceutical profits flow to shareholders globally. The executives who oversaw Vioxx's launch and the concealment of its cardiovascular risk departed with substantial retirement benefits. The 50,000 people who died did not receive compensation."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Merck shareholders 1999-2004", "how": "$12.5B in Vioxx revenue during 5-year market period; cardiovascular risk concealed to protect sales"},
      {"group": "Raymond Gilmartin (departed CEO)", "how": "~$37M in retirement benefits; led company through Vioxx period; no criminal charges"},
      {"group": "Merck sales force", "how": "Commission on $2.5B annual drug sales; trained to avoid cardiovascular questions"}
    ],
    "who_paid": [
      {"group": "~50,000 people who died", "how": "Heart attacks and strokes from a drug whose risk Merck documented and concealed"},
      {"group": "Surviving victims and families", "how": "$4.85B spread across 27,000 claimants — average $180K per claim for a heart attack or death"},
      {"group": "Physicians who prescribed Vioxx", "how": "Made prescribing decisions based on information Merck withheld; loss of patient trust"},
      {"group": "Medicare and Medicaid", "how": "Paid for a drug whose true risk profile was concealed; additional $650M marketing fraud settlement"}
    ],
    "the_gap": "Merck had data showing a 5-fold heart attack increase in 2000. They trained their sales force to dodge the question. They kept selling for four more years. 50,000 people died. Raymond Gilmartin retired with $37 million. No one went to prison."
  }
},
  "profiles_v9/toyota.json": {
  "brand_name": "Toyota",
  "brand_slug": "toyota",
  "parent_company": "Toyota Motor Corporation",
  "ultimate_parent": "Toyota Motor Corporation",
  "subsidiaries": ["Lexus", "Toyota Financial Services", "Toyota Industries", "Daihatsu", "Hino Motors"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "TOYOTA TREATED A DEADLY SAFETY EMERGENCY AS A PUBLIC RELATIONS PROBLEM AND PAID $1.2 BILLION FOR IT",
  "executive_summary": "Toyota is the world's largest automaker by volume, producing approximately 10 million vehicles annually with revenues exceeding $250 billion. The company built its global reputation on quality and reliability. That reputation was shattered when federal prosecutors revealed that Toyota had known about unintended acceleration defects in its vehicles — defects linked to at least 5 deaths — and chose to conceal and minimize the problem rather than recall the vehicles. Attorney General Eric Holder called Toyota's conduct 'shameful': it 'confronted a public safety emergency as if it were simply a public relations problem.' Toyota paid $1.2 billion — the largest criminal penalty against a car company in U.S. history — in a 2014 DOJ settlement. In 2024, Toyota's Industries subsidiary admitted to falsifying emissions test data for forklift engines, part of a broader Japanese auto industry testing scandal.",
  "verdict_tags": ["unintended_acceleration_concealment", "1_2b_criminal_penalty", "safety_emergency_as_pr_problem", "emissions_falsification_2024", "takata_airbag_recall", "clean_air_act_violations"],
  "concern_flags": {"labor": false, "environmental": true, "political": false, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Toyota uses its complex international corporate structure — with major manufacturing and financing operations across the U.S., Europe, and Asia — to minimize tax obligations in each jurisdiction. Toyota Financial Services provides financing arrangements that generate tax benefits. The company's Japanese headquarters benefits from Japan's territorial tax system. Toyota has received significant state-level subsidies for its U.S. manufacturing facilities in states including Kentucky, Indiana, and Texas.",
    "flags": ["international_tax_minimization", "state_manufacturing_subsidies", "toyota_financial_services_tax_structures"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2014: $1.2 billion DOJ settlement — the largest criminal penalty against a car company in U.S. history — for concealing unintended acceleration defects linked to at least 5 deaths. Toyota admitted it misled U.S. consumers, NHTSA, and Congress about two separate acceleration defects. The DOJ charged Toyota with wire fraud. Toyota had internally boasted about saving $100 million by avoiding a full safety recall. Prior fines: 2010-2012, $66 million in NHTSA fines for delayed reporting. 2021: $180 million DOJ/EPA settlement for decade-long Clean Air Act reporting violations covering 2.2+ million vehicles. 2024: Toyota Industries admitted falsifying emissions data for forklift engines; class action suits filed. Toyota also participated in the Takata airbag recall — the largest auto safety recall in U.S. history — affecting millions of Toyota and Lexus vehicles.",
    "flags": ["1_2b_doj_wire_fraud_settlement", "admitted_concealment_congress_and_nhtsa", "180m_clean_air_act_settlement", "2024_forklift_emissions_falsification", "takata_recall_millions_vehicles"],
    "sources": ["https://www.justice.gov/archives/opa/pr/toyota-motor-company-pay-180-million-settlement"]
  },
  "labor": {
    "summary": "Toyota employs approximately 375,000 people globally. The company's manufacturing workforce has benefited from Toyota's generally stable production model. Toyota has faced criticism in the United States for locating new manufacturing plants in non-union southern states, avoiding UAW organization. Toyota's subsidiary Hino Motors was involved in a separate engines fraud scandal in Japan, resulting in workforce disruption.",
    "flags": ["non_union_southern_plant_strategy", "hino_engines_fraud_subsidiary"],
    "sources": []
  },
  "environmental": {
    "summary": "Toyota's Clean Air Act violations — covered by the $180 million settlement — involved systematic failure to report emissions defects in 2.2 million vehicles over a decade. The 2024 forklift engine emissions falsification — involving software manipulation and engine switching during tests — revealed a broader culture of emissions testing misconduct within the Toyota corporate family. Toyota's Japanese parent also faced simultaneous investigations of Daihatsu and Hino for separate falsification scandals. Toyota's hybrid technology is a genuine environmental contribution, but these systematic emissions violations undermine the company's environmental credibility.",
    "flags": ["systematic_emissions_noncompliance_2_2m_vehicles", "forklift_software_manipulation", "daihatsu_hino_related_scandals"],
    "sources": ["https://www.epa.gov", "https://www.justice.gov/archives/opa/pr/toyota-motor-company-pay-180-million-settlement"]
  },
  "political": {
    "summary": "Toyota is a major U.S. employer — with manufacturing in Kentucky, Indiana, Alabama, Texas, and Mississippi — which gives the company significant political leverage in the states where it operates. The company has used this leverage to resist unionization and to shape state-level regulatory environments. Toyota lobbies on fuel economy standards, EV incentive policies, and trade regulations. The company's concealment of safety defects from NHTSA and Congress represents a documented case of regulatory deception.",
    "flags": ["employer_leverage_anti_union", "nhtsa_concealment_regulatory_deception", "cafe_standards_lobbying"],
    "sources": []
  },
  "executives": {
    "summary": "President and CEO Koji Sato received approximately $3.7 million in compensation in 2023 — significantly lower than U.S. auto CEO counterparts due to Japanese corporate norms. During the unintended acceleration crisis, CEO Akio Toyoda (grandson of the founder) testified before Congress and publicly apologized — rare for Japanese corporate leadership. No Toyota executives faced personal criminal charges for the concealment. In 2024, Toyota Industries CEO Koichi Ito resigned following the forklift emissions falsification.",
    "flags": ["no_executive_criminal_charges_for_concealment", "toyota_industries_ceo_resigned_falsification", "akio_toyoda_congress_testimony"],
    "sources": []
  },
  "connections": {
    "summary": "Toyota's corporate family includes Toyota Industries (forklifts), Daihatsu (small cars), and Hino (trucks) — each of which has faced separate safety or emissions falsification scandals in recent years, suggesting a pattern of testing culture issues across the Toyota group. The Japanese auto industry's broader emissions testing scandal — which also affected Honda, Mazda, and others — was triggered in part by investigations of Toyota subsidiaries. Toyota shares major institutional investors with Honda, Nissan, and Hyundai through Japanese and international institutional holdings.",
    "flags": ["toyota_group_multiple_falsification_scandals", "japanese_auto_industry_testing_culture", "daihatsu_hino_related"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "DOJ prosecutors revealed that Toyota internally boasted about saving $100 million by convincing regulators to accept a limited recall rather than a full safety recall — a figure that demonstrates the cost-benefit calculation was explicit. Former Toyota employees have alleged that the acceleration issue was known to the company as early as 2007, and that internal decisions prioritizing brand protection over safety disclosure were made at senior levels. Consumer safety advocates have alleged that the death toll from Toyota's unintended acceleration was significantly higher than the 5 deaths acknowledged in the settlement, with some estimates exceeding 90 deaths.",
    "flags": ["100m_savings_boast_documented", "2007_internal_awareness_alleged", "death_toll_undercount_alleged"],
    "sources": ["https://aublr.org/2014/03/when-corporate-fraud-kills", "https://abcnews.go.com/Blotter/toyota-pay-12b-hiding-deadly-unintended-acceleration"]
  },
  "health_record": {
    "summary": "Toyota's concealed unintended acceleration defects are documented to have caused at least 5 deaths and scores of injuries. The Takata airbag recall — affecting Toyota and Lexus vehicles among many others — involved inflators that could fire metal fragments at vehicle occupants; this defect has been linked to deaths and injuries across multiple manufacturers. Toyota's Clean Air Act violations — failing to report emissions defects — meant that millions of vehicles operated with higher-than-legal emissions for years, contributing to air quality impacts.",
    "flags": ["5_documented_acceleration_deaths", "takata_metal_fragment_deaths", "emissions_noncompliance_air_quality"],
    "sources": ["https://www.nhtsa.gov"]
  },
  "alternatives": {
    "cheaper": ["Honda — comparable reliability reputation, competitive pricing, strong fuel economy options", "Mazda — consistently rated for value and reliability; typically lower pricing than Toyota", "Used vehicles — 2-3 year old models from any reliable manufacturer offer best value"],
    "healthier": ["Toyota's own hybrid lineup (Prius, RAV4 Hybrid) genuinely reduces emissions relative to comparable combustion vehicles", "Honda hybrid lineup — similar environmental performance", "BEV options from multiple manufacturers — eliminate tailpipe emissions entirely"],
    "diy": ["Check your specific Toyota/Lexus VIN for any open recalls at NHTSA.gov — Takata airbag replacements are still being completed", "Toyota's reputation for reliability is genuine at the vehicle level — this profile addresses corporate conduct, not vehicle quality", "Regular maintenance extends vehicle life and reduces need to purchase new vehicles"]
  },
  "timeline": [
    {"year": 1937, "event": "Toyota Motor Corporation founded in Japan by Kiichiro Toyoda", "severity": "neutral", "source_url": ""},
    {"year": 2007, "event": "Toyota internally identifies unintended acceleration defects; concealment begins per DOJ investigation", "severity": "critical", "source_url": ""},
    {"year": 2009, "event": "California Highway Patrol officer Mark Saylor and family die in Lexus with stuck accelerator; recorded 911 call made public", "severity": "critical", "source_url": ""},
    {"year": 2009, "event": "Toyota initiates massive recalls of 10+ million vehicles; continues denying full scope of problem", "severity": "critical", "source_url": ""},
    {"year": 2010, "event": "CEO Akio Toyoda testifies before Congress; apologizes publicly", "severity": "high", "source_url": ""},
    {"year": 2010, "event": "NHTSA fines begin: $16.375M; additional fines follow through 2012 totaling $66M for reporting delays", "severity": "high", "source_url": ""},
    {"year": 2014, "event": "$1.2B DOJ settlement: wire fraud charge; largest criminal auto penalty in U.S. history; Toyota admits concealment from NHTSA and Congress", "severity": "critical", "source_url": "https://www.justice.gov"},
    {"year": 2021, "event": "$180M DOJ/EPA settlement: decade-long failure to report emissions defects in 2.2M vehicles", "severity": "critical", "source_url": "https://www.justice.gov/archives/opa/pr/toyota-motor-company-pay-180-million-settlement"},
    {"year": 2024, "event": "Toyota Industries admits falsifying emissions test data for forklift engines; CEO resigns; class action filed", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "Toyota also facing Daihatsu and Hino subsidiary scandals simultaneously — pattern of testing culture concerns across corporate group", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Toyota's strategy of opening non-union plants in southern states — Kentucky, Alabama, Mississippi, Texas, Indiana — provides employment but with lower wages and benefits than comparable unionized auto work. This strategy has contributed to the decline of union density in manufacturing and the weakening of collective bargaining in the auto sector.",
    "price_illusion": "Toyota's pricing reflects a genuine reliability premium that has historically been earned. The safety concealment — however — represents a period where that trust was deliberately maintained through deception rather than through actual safety performance.",
    "tax_math": "Toyota has received hundreds of millions in state manufacturing incentives across its U.S. plants. The $1.2 billion DOJ penalty represents a partial accounting for the deaths and injuries caused by the concealed defects — not a full accounting of damages.",
    "wealth_velocity": "Toyota's global profits flow primarily to its Japanese shareholders and the founding Toyoda family. U.S. manufacturing employment provides local economic benefit, but the profit extraction is global."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Toyota's brand managers", "how": "Avoided $100M in recall costs by concealing defect scope; maintained brand reputation through concealment period"},
      {"group": "Toyota shareholders", "how": "Maintained stock value and sales volume through period when full disclosure would have forced larger recall"}
    ],
    "who_paid": [
      {"group": "Acceleration victims and families", "how": "At least 5 documented deaths; scores of injuries; Toyota's internal documents show it knew"},
      {"group": "NHTSA and Congress", "how": "Misled by Toyota's deceptive statements during official investigations"},
      {"group": "Toyota's customers", "how": "Drove vehicles with known defects while Toyota managed the PR problem"}
    ],
    "the_gap": "Toyota internally boasted about saving $100 million by avoiding a full recall. The DOJ fine was $1.2 billion. At least 5 people died. Toyota told Congress it had 'absolutely not minimized public awareness of any defect.' That was a lie. The AG said so."
  }
},
  "profiles_v10/caesars-entertainment.json": {
  "brand_name": "Caesars Entertainment",
  "brand_slug": "caesars-entertainment",
  "parent_company": "Caesars Entertainment Inc.",
  "ultimate_parent": "Caesars Entertainment Inc.",
  "subsidiaries": ["Caesars Palace", "Harrah's", "Horseshoe", "Paris Las Vegas", "Bally's (some)", "Caesars Sportsbook"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "CAESARS PAID HACKERS $15 MILLION IN RANSOM AND TOLD NO ONE UNTIL THE SEC MADE THEM",
  "executive_summary": "Caesars Entertainment operates more than 50 gaming and resort properties across the United States, with annual revenues exceeding $11 billion. In August 2023, the same criminal group that attacked MGM — Scattered Spider — breached Caesars through a social engineering attack on a third-party IT vendor. Unlike MGM, Caesars paid approximately $15 million in ransom (negotiated down from $30 million) to prevent the hackers from releasing stolen customer data. The company did not publicly disclose the breach or the ransom payment until forced to file with the SEC under new cybersecurity disclosure rules. Caesars also carries approximately $13 billion in debt from its 2020 merger between Eldorado Resorts and the original Caesars, creating a financial structure that resembles the PE-debt-loading patterns seen in other distressed industries.",
  "verdict_tags": ["ransom_payment_15m", "hack_concealment", "loyalty_database_stolen", "13b_debt_load", "problem_gambling_facilitation", "sec_disclosure_required"],
  "concern_flags": {"labor": true, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Caesars carries approximately $13 billion in long-term debt from the 2020 Eldorado-Caesars merger — a leveraged transaction that generates substantial interest deductions reducing taxable income. The company's gaming operations are taxed at state-level gaming tax rates, which vary significantly across its 50+ properties. Caesars has also used REIT structures for some property assets.",
    "flags": ["13b_debt_interest_deductions", "leveraged_merger_tax_structure", "state_gaming_tax_variation"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "August 2023: Scattered Spider breached Caesars through social engineering of an IT vendor; customer loyalty database stolen including Social Security and driver's license numbers. Caesars paid approximately $15 million in ransom — negotiated from an initial $30 million demand. The company made no public disclosure until the SEC mandated cybersecurity reporting rules forced a filing in September 2023. Multiple class action lawsuits filed — including one consolidated with the MGM Resorts MDL in Nevada. Caesars stated it 'took steps to ensure the stolen data is deleted by the unauthorized actor, although we cannot guarantee this result' — widely understood as confirmation of ransom payment without explicit admission. The company's prior history includes the original Caesars bankruptcy in 2015 — when Caesar's predecessor company filed for one of the largest casino bankruptcies in history after being taken private by Apollo and TPG in a $30 billion leveraged buyout.",
    "flags": ["15m_ransom_paid_concealed", "sec_disclosure_forced", "class_action_loyalty_database", "apollo_tpg_2015_bankruptcy"],
    "sources": ["https://www.sec.gov", "https://cybernews.com"]
  },
  "labor": {
    "summary": "Caesars employs approximately 65,000 people. The company's 2020 merger with Eldorado Resorts resulted in significant workforce consolidation and layoffs. UNITE HERE represents workers at multiple Caesars properties. The company's debt load creates ongoing pressure to minimize labor costs — a documented pattern in PE-backed hospitality operators.",
    "flags": ["merger_workforce_consolidation", "unite_here_labor_relations", "debt_driven_cost_pressure"],
    "sources": []
  },
  "environmental": {
    "summary": "Caesars' resort properties are significant energy and water consumers, particularly in desert markets like Las Vegas. The company has made sustainability commitments including energy efficiency programs. Water use for pools, cooling systems, and landscaping in the Nevada desert represents a documented environmental tension.",
    "flags": ["desert_water_consumption", "energy_consumption_50_properties"],
    "sources": []
  },
  "political": {
    "summary": "Caesars has been one of the largest gaming industry political donors in the United States. The company lobbies on gaming tax rates, sports betting regulation, and online gambling expansion. Its Caesars Sportsbook operations connect it to the online gambling industry's lobbying against consumer protection regulations. The original Caesars Entertainment's 2015 bankruptcy — following Apollo and TPG's leveraged buyout — became a case study in private equity extraction from gaming assets.",
    "flags": ["gaming_tax_rate_lobbying", "online_gambling_lobbying", "apollo_tpg_pe_extraction_history"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Tom Reeg received $17.8 million in total compensation in 2023. Reeg engineered the Eldorado-Caesars merger and has focused on debt reduction since. The decision to pay the $15 million ransom was made at the executive level — the company argued it was cheaper than the operational disruption MGM experienced by not paying. The ransom payment was routed through normal business channels without public disclosure until SEC rules forced it.",
    "flags": ["ransom_payment_executive_decision", "sec_disclosure_concealment_until_required", "reeg_17_8m_compensation"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Caesars and MGM were attacked by the same criminal group within weeks of each other — demonstrating a systematic vulnerability in the casino industry's IT infrastructure. The Scattered Spider group specifically targeted casino loyalty databases because they contain high-value personal and financial data. Caesars' history under Apollo and TPG private equity ownership — which loaded it with debt, drove it into bankruptcy in 2015, and extracted billions in fees — mirrors the Steward Health Care pattern of PE extraction preceding collapse.",
    "flags": ["same_attacker_as_mgm", "apollo_tpg_pe_debt_extraction_pattern", "loyalty_database_systematic_target"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Consumer advocates have alleged that Caesars' ransom payment — and its initial concealment — sets a dangerous precedent that encourages criminal groups to target casinos knowing they will be paid. Security researchers have alleged that paying the ransom does not guarantee data deletion — criminal groups routinely retain stolen data for future use regardless of payment. Former Caesars IT employees have alleged that third-party vendor security requirements were insufficient and not adequately audited before the breach.",
    "flags": ["ransom_payment_precedent_concerns", "data_deletion_guarantee_unreliable_alleged", "third_party_vendor_oversight_failure_alleged"],
    "sources": []
  },
  "health_record": {
    "summary": "Caesars' casino operations are a primary driver of problem gambling across its 50+ properties. The company's Total Rewards (now Caesars Rewards) loyalty program — the database stolen in the 2023 breach — is specifically designed to identify high-frequency gamblers and maximize their on-property time through comps, offers, and VIP services. Problem gambling represents 2-3% of the population but an estimated 20-40% of casino revenue, creating a business model that depends on addicted gamblers for profitability. The stolen loyalty database contained precisely the personal information needed to target these high-risk individuals.",
    "flags": ["gambling_addiction_dependency", "loyalty_program_vip_targeting_problem_gamblers", "stolen_data_was_gambler_targeting_data"],
    "sources": ["https://www.ncpgambling.org"]
  },
  "alternatives": {
    "cheaper": ["Independent hotels and resorts without casino operations — pricing reflects actual hospitality costs, not gambling subsidies", "Short-term rentals in resort areas — Airbnb and VRBO in Las Vegas often dramatically cheaper", "Non-gaming resorts in comparable destinations — Palm Springs, Sedona, Scottsdale offer comparable experiences"],
    "healthier": ["Destinations built around outdoor activity, culture, or wellness rather than gambling", "The Nevada desert itself — Red Rock Canyon, Valley of Fire, Lake Mead offer extraordinary experiences without casino infrastructure"],
    "diy": ["If you're staying at Caesars for a concert or show — the entertainment can be excellent independent of gambling", "Gambling budget rules: bring only cash in the exact amount you're willing to lose; leave cards at the hotel", "National Problem Gambling Helpline: 1-800-522-4700"]
  },
  "timeline": [
    {"year": 1966, "event": "Caesars Palace opens on the Las Vegas Strip", "severity": "neutral", "source_url": ""},
    {"year": 2008, "event": "Apollo Global Management and TPG Capital take Caesars private in $30B leveraged buyout", "severity": "high", "source_url": ""},
    {"year": 2015, "event": "Caesars Entertainment Operating Company files for bankruptcy — one of largest casino bankruptcies in history — under $18B debt load", "severity": "critical", "source_url": ""},
    {"year": 2020, "event": "Eldorado Resorts acquires Caesars for $17B; new combined company takes Caesars name", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "August: Scattered Spider breaches Caesars through IT vendor; loyalty database stolen", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "August: Caesars pays ~$15M ransom (negotiated from $30M); no public disclosure", "severity": "critical", "source_url": ""},
    {"year": 2023, "event": "September: SEC cybersecurity disclosure rules force public filing; ransom payment confirmed indirectly", "severity": "critical", "source_url": "https://www.sec.gov"},
    {"year": 2024, "event": "Class action lawsuits consolidated with MGM breach MDL in Nevada federal court", "severity": "high", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Caesars' dominance in multiple gaming markets — Las Vegas, Atlantic City, regional markets — contributes to the consolidation of gaming into a few mega-operators at the expense of local and regional casino operators. The company's debt load creates financial fragility that affects workers and communities when properties underperform.",
    "price_illusion": "The ransom payment concealment is the clearest example of the price illusion in casino operations — the 'price' of staying at Caesars includes a hidden subsidy from the gambling losses of other guests, and a data security risk that the company hid until legally required to disclose.",
    "tax_math": "The $13 billion in debt from the Eldorado merger generates interest deductions that reduce Caesars' tax obligations substantially. Apollo and TPG's leveraged buyout before the 2015 bankruptcy extracted billions in fees while loading the company with debt — a cost now borne by current shareholders, employees, and creditors.",
    "wealth_velocity": "Casino profits flow from gambling losses — which are disproportionately borne by problem gamblers — to Caesars shareholders. The loyalty program that was stolen was built to direct those losses toward Caesars properties specifically."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Scattered Spider criminal group", "how": "$15M ransom payment; short-term operational stability for Caesars vs MGM's $100M loss"},
      {"group": "Caesars management", "how": "Avoided MGM-scale operational disruption by paying ransom; maintained reputation until SEC forced disclosure"},
      {"group": "Apollo / TPG (historically)", "how": "Extracted billions in fees during PE ownership period before 2015 bankruptcy"}
    ],
    "who_paid": [
      {"group": "Caesars loyalty program members", "how": "Social Security numbers, driver's licenses, and personal data stolen and 'deleted' by criminals — with no guarantee"},
      {"group": "Caesars shareholders", "how": "$15M ransom; ongoing class action litigation costs"},
      {"group": "Workers in 2015 bankruptcy period", "how": "PE debt loading caused bankruptcy; workforce uncertainty during restructuring"}
    ],
    "the_gap": "Caesars paid criminals $15 million to maybe delete stolen customer data and told no one. The SEC rule changes are the only reason you know this happened. Before those rules, the ransom payment would have stayed secret. How many times has this happened before without disclosure?"
  }
},
  "profiles_v10/draftkings.json": {
  "brand_name": "DraftKings",
  "brand_slug": "draftkings",
  "parent_company": "DraftKings Inc.",
  "ultimate_parent": "DraftKings Inc.",
  "subsidiaries": ["DraftKings Sportsbook", "DraftKings Casino", "Golden Nugget Online Gaming (acquired)", "Jackpot (lottery)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "DRAFTKINGS OFFERS 517 BETS PER NFL GAME, ASSIGNS VIP MANAGERS TO DETECTED PROBLEM GAMBLERS, AND CALLS IT ENTERTAINMENT",
  "executive_summary": "DraftKings is one of the two dominant online sports betting and daily fantasy sports platforms in the United States, generating approximately $4.8 billion in annual revenue. The platform operates in 25+ states and has become the primary vector through which sports gambling addiction enters American homes. Unlike traditional casinos — which require physical travel — DraftKings is available 24 hours a day on every smartphone. The platform offers an average of 517 different betting markets per NFL game, including real-time in-play bets on individual plays. Internal documents and lawsuits reveal that DraftKings' algorithms identify problem gambling behavior — loss chasing, late-night sessions, escalating bet sizes — and respond by assigning personal VIP managers to increase engagement rather than intervening. The same lawyer who won the $206 billion tobacco industry settlement is now leading lawsuits against DraftKings and FanDuel.",
  "verdict_tags": ["vip_managers_assigned_to_problem_gamblers", "517_bets_per_game", "addiction_by_design", "tobacco_lawyer_lawsuits", "ohio_settlement_prohibited_bets", "deceptive_risk_free_promotions", "underage_gambling"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "DraftKings is incorporated in Nevada and headquartered in Boston, using a corporate structure that minimizes state tax obligations across its 25+ operating states. The company has carried significant net operating losses during its growth phase — generating tax loss carryforwards that reduce future obligations. DraftKings went public through a SPAC in 2020, a structure that raised questions about disclosure standards. The company's effective tax rate has been near zero during its loss-generating growth phase.",
    "flags": ["nevada_incorporation", "nol_carryforwards_zero_effective_rate", "spac_disclosure_concerns"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2024 (November): Ohio Casino Control Commission $425,000 settlement for offering prohibited wagers including certain college player props and allowing unapproved funding methods. 2025 (April): City of Baltimore sues DraftKings (and FanDuel) alleging unfair practices, deceptive 'bonus bet' promotions, and algorithmic targeting that exacerbates addiction — framed as a public health and consumer protection action. 2025 (July): Federal class action Macek et al. v. DraftKings (E.D. Pa.) alleges misleading 'No Sweat/risk-free' promotions, manipulative design, and self-exclusion failures. 2025: PHAI (Public Health Advocacy Institute) lawsuit led by Richard Daynard — the attorney who secured the $206B tobacco settlement — alleges DraftKings is a defective product that 'captures every aspect of a customer's interaction through automated analytical tools and predictive algorithms to generate bets optimized to stimulate compulsive gambling.' Multiple states investigating deceptive advertising.",
    "flags": ["ohio_425k_prohibited_bets", "baltimore_city_lawsuit_addiction", "phai_tobacco_lawyer_lawsuit", "federal_class_action_deceptive_promotions", "self_exclusion_failures"],
    "sources": ["https://www.espn.com/espn/betting/story/_/id/48312490", "https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit"]
  },
  "labor": {
    "summary": "DraftKings employs approximately 5,200 people. The company's VIP host workforce — personal managers assigned to high-value (and high-risk) gamblers — has been specifically documented in litigation. VIP managers are trained and incentivized to maximize betting volume from their assigned users, including users who have exhibited problem gambling behavior. The incentive structure of VIP management directly conflicts with responsible gambling.",
    "flags": ["vip_manager_incentive_conflict", "gambling_harm_facilitation_workforce"],
    "sources": []
  },
  "environmental": {
    "summary": "DraftKings' digital-only operations have a smaller direct environmental footprint than physical casino operators. Server infrastructure and data center energy consumption represent the primary environmental impact.",
    "flags": ["data_center_energy_consumption"],
    "sources": []
  },
  "political": {
    "summary": "DraftKings spent $6.2 million on federal and state lobbying in 2023. The company has been a primary driver of sports betting legalization across states following the 2018 Supreme Court ruling in Murphy v. NCAA. DraftKings lobbied against New York's proposed advertising restrictions on gambling — including restrictions on 'risk-free bet' language later found by NY regulators to be deceptive. The company has lobbied against consumer protection measures including mandatory spending limits, self-exclusion enforcement requirements, and VIP program restrictions that would directly address the documented harms in its lawsuits.",
    "flags": ["anti_consumer_protection_lobbying", "risk_free_advertising_deception_lobbying", "vip_program_restriction_opposition"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Jason Robins received $35.3 million in total compensation in 2023 — the highest of any CEO in the gambling industry and among the highest of any CEO in any industry relative to company revenue. Robins co-founded DraftKings in 2012 as a daily fantasy sports company, pivoted to sports betting after the Supreme Court ruling, and built it into a $20+ billion market cap company. The company's growth has been built on marketing spend that rivals pharmaceutical companies — estimated at $1.3 billion in 2023 — targeting new bettors through every media channel including sports broadcasts, social media, and influencer marketing.",
    "flags": ["35_3m_ceo_compensation", "1_3b_marketing_spend_2023", "sports_broadcast_saturation_marketing"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "DraftKings' NFL partnership — the NFL receives a share of revenue from DraftKings and other sportsbooks — creates a documented conflict where the NFL simultaneously markets gambling to its audience while claiming to support responsible gambling. The 2024 Connecticut study found that less than 2% of sports bettors are problem gamblers but that 2% accounts for 51% of sports betting revenue — a figure DraftKings' algorithms are designed to maximize. DraftKings and FanDuel together control approximately 70% of the U.S. online sports betting market, creating a near-duopoly that limits competitive pressure toward consumer protection.",
    "flags": ["nfl_revenue_sharing_conflict", "2pct_problem_gamblers_51pct_revenue", "duopoly_with_fanduel", "connecticut_study_documented"],
    "sources": ["https://popular.info/p/new-lawsuit-alleges-draftkings-and"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The PHAI lawsuit alleges DraftKings trained its internal sales team using language similar to the Merck Vioxx 'Dodge Ball' document — an internal training called 'Dodge, Duck, Dip, Dive, and Dodge' that instructed VIP managers to avoid directly addressing customer questions about gambling addiction. One lawsuit documents a DraftKings VIP manager named Morgan who messaged a problem gambler 'hundreds of times' portraying herself as a friend while her job was to maximize his losses — ultimately providing him and his son Super Bowl tickets and on-field access while he wagered millions. Plaintiffs allege that DraftKings' winning players are kicked out of VIP programs — only losing players are given VIP treatment — making the VIP program explicitly a mechanism for maximizing losses from addicted users.",
    "flags": ["dodge_ball_training_document_alleged", "vip_manager_false_friendship_manipulation", "winners_excluded_losers_vip_targeted"],
    "sources": ["https://popular.info/p/new-lawsuit-alleges-draftkings-and", "https://www.espn.com/espn/betting/story/_/id/48312490"]
  },
  "health_record": {
    "summary": "The public health case against DraftKings is among the most documented of any consumer product currently in litigation. A 2024 Connecticut study found the top 2% of bettors — identified as problem gamblers — account for 51% of sports betting revenue. DraftKings' business model structurally depends on this concentration. Documented cases in litigation include: a man who wagered $5 million primarily on DraftKings and left his job to gamble full-time; a man who wagered $1.3 million in a single year — 15x his annual income — after being assigned a VIP manager; a man who had never gambled before downloading the app and subsequently wagered $4+ million. The Harris Poll found that 33% of respondents aged 21-44 had placed sports bets before turning 21. Suicides and mental health crises linked to gambling addiction have been documented in litigation.",
    "flags": ["2pct_gamblers_51pct_revenue_documented", "vip_escalation_million_dollar_losses", "underage_gambling_33pct_before_21", "suicide_mental_health_documented_litigation"],
    "sources": ["https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit", "https://www.espn.com/espn/betting/story/_/id/48312490"]
  },
  "alternatives": {
    "cheaper": ["Fantasy sports leagues without money — free platforms including ESPN, Yahoo, and Sleeper allow full fantasy sports engagement without wagering", "Sports betting with friends at fixed low stakes — removes algorithmic targeting and VIP manipulation from the equation", "Sports viewing without betting — the game is the same without a wager"],
    "healthier": ["Blocking apps (Gamban, BetBlocker) — prevent access to betting platforms on your devices; free", "Self-exclusion: every state with legal sports betting has a self-exclusion registry; DraftKings is legally required to honor it — visit your state gaming commission website", "National Problem Gambling Helpline: 1-800-522-4700 (24/7, free, confidential)"],
    "diy": ["DraftKings' 'risk-free' and 'no sweat' promotions are not free — read the rollover requirements before depositing", "Deposit limits: you can set them in your DraftKings account — do this before placing a single bet", "If DraftKings has assigned you a VIP manager, that means their algorithm has identified you as a high-risk, high-value target"]
  },
  "timeline": [
    {"year": 2012, "event": "DraftKings founded in Boston as daily fantasy sports platform", "severity": "neutral", "source_url": ""},
    {"year": 2018, "event": "Supreme Court strikes down federal sports betting prohibition; DraftKings pivots to sportsbook", "severity": "neutral", "source_url": ""},
    {"year": 2020, "event": "DraftKings goes public via SPAC at $3.3B valuation; expands rapidly across states", "severity": "neutral", "source_url": ""},
    {"year": 2023, "event": "NBA Lakers-Nuggets game: DraftKings voids winning bets day after game citing 'error'; lawsuit filed", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "NY regulators formally restrict 'risk-free bet' language as deceptive; DraftKings had lobbied against restriction", "severity": "high", "source_url": ""},
    {"year": 2024, "event": "Connecticut study: 2% of bettors (problem gamblers) = 51% of sports betting revenue", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "Ohio: $425,000 settlement for prohibited wagers and unapproved funding methods", "severity": "high", "source_url": ""},
    {"year": 2025, "event": "Baltimore sues DraftKings and FanDuel for public health harms; PHAI tobacco-lawyer lawsuit filed; federal class action filed", "severity": "critical", "source_url": "https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit"},
    {"year": 2025, "event": "DraftKings generates $4.8B revenue; CEO receives $35.3M compensation; marketing spend $1.3B+", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Online sports betting has displaced recreational gambling from physical casinos — where social friction and cash limits provide some natural brakes — into a frictionless 24/7 smartphone environment. Communities that have legalized sports betting report increased calls to gambling addiction helplines, bankruptcy filings, and domestic violence incidents linked to gambling losses.",
    "price_illusion": "DraftKings' promotions — 'risk-free bets,' 'bet $5 get $200,' 'no sweat parlays' — are specifically designed to minimize the perceived risk of gambling. The Connecticut study showing 2% of bettors generate 51% of revenue demonstrates that the actual price of DraftKings' service is paid almost entirely by its most vulnerable users.",
    "tax_math": "DraftKings has operated at a net loss through most of its history — generating tax loss carryforwards that will reduce obligations when profitable. The company's $1.3 billion annual marketing spend is fully deductible as a business expense, making the cost of acquiring gambling addicts a tax-advantaged activity.",
    "wealth_velocity": "DraftKings' revenue — generated overwhelmingly from losing gamblers, concentrated among the 2% who are problem gamblers — flows to shareholders and to Jason Robins' $35 million annual compensation. The man who wagered $4 million and left his job has been assigned a VIP manager. He is the product."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "DraftKings shareholders and Jason Robins", "how": "$4.8B revenue; $20B+ market cap; $35M CEO compensation"},
      {"group": "NFL and sports leagues", "how": "Revenue sharing from DraftKings partnership; gambling drives viewership and engagement"},
      {"group": "Media companies", "how": "$1.3B in DraftKings advertising revenue; betting odds integrated into broadcasts"}
    ],
    "who_paid": [
      {"group": "Problem gamblers (2% of users, 51% of revenue)", "how": "Financial ruin, job loss, family breakdown, suicide — documented in litigation"},
      {"group": "Underage users", "how": "33% of 21-44 year olds gambled before legal age; inadequate age verification documented"},
      {"group": "Families of addicted gamblers", "how": "Financial consequences of household gambling losses; documented in lawsuits"},
      {"group": "Cities and states", "how": "Baltimore lawsuit documents public health costs of gambling addiction including emergency services"}
    ],
    "the_gap": "The tobacco industry took 40 years and $206 billion to be held accountable. Richard Daynard won that case. He just filed against DraftKings. The internal DraftKings training document is called 'Dodge, Duck, Dip, Dive, and Dodge.' Merck's was called 'Dodge Ball.' DraftKings offers 517 bets per NFL game. The tobacco industry sold you one cigarette at a time."
  }
},
  "profiles_v10/fanduel.json": {
  "brand_name": "FanDuel",
  "brand_slug": "fanduel",
  "parent_company": "Flutter Entertainment PLC",
  "ultimate_parent": "Flutter Entertainment PLC",
  "subsidiaries": ["FanDuel Sportsbook", "FanDuel Casino", "FanDuel Racing", "TVG", "PokerStars US"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "FANDUEL'S VIP MANAGER TEXTED A PROBLEM GAMBLER HUNDREDS OF TIMES PRETENDING TO BE HIS FRIEND WHILE HE LOST MILLIONS",
  "executive_summary": "FanDuel is the largest online sports betting platform in the United States by market share, operating as a subsidiary of Flutter Entertainment PLC — an Irish gambling conglomerate that also owns PokerStars, Paddy Power, and Betfair. Together with DraftKings, FanDuel controls approximately 70% of the U.S. online sports betting market. FanDuel's documented practices include assigning VIP managers to problem gamblers who are trained to build false personal relationships with users in order to maximize betting volume, offering deceptive promotional structures, targeting users with detected addiction patterns rather than referring them to help, and partnering with the NFL to normalize sports betting for the broadest possible audience. A documented FanDuel VIP manager named Morgan messaged a problem gambler hundreds of times — discussing restaurants, vacations, and children — while providing Super Bowl tickets and field access as inducements to continue gambling. This user lost millions.",
  "verdict_tags": ["vip_false_relationship_documented", "nfl_partnership_normalization", "addiction_algorithm_targeting", "deceptive_promotions", "flutter_ireland_offshore", "baltimore_lawsuit", "phai_tobacco_lawyer_case"],
  "concern_flags": {"labor": false, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "FanDuel operates as a U.S. subsidiary of Flutter Entertainment PLC, an Irish company incorporated in Dublin. This structure routes profits through Ireland — with a 12.5% corporate tax rate versus 21% in the United States — minimizing tax obligations on FanDuel's U.S. gambling revenue. The Irish parent company structure also means FanDuel's US revenue is subject to transfer pricing between the US operating subsidiary and the Irish parent. Flutter is listed on the New York Stock Exchange and London Stock Exchange.",
    "flags": ["irish_parent_12_5pct_tax_rate", "transfer_pricing_us_to_ireland", "profit_routing_offshore"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2025 (April): City of Baltimore sues FanDuel and DraftKings for violations of consumer protection ordinance; algorithmic targeting of addiction patterns; deceptive 'bonus bet' promotions. 2025: PHAI (Public Health Advocacy Institute) lawsuit led by Richard Daynard — tobacco settlement attorney — alleges FanDuel uses 'predictive algorithms to generate bets optimized to stimulate compulsive gambling.' The PHAI Pennsylvania lawsuit names FanDuel, DraftKings, the NFL, and data company Genius Sports. Federal class action (E.D. Pa.) includes FanDuel as defendant for deceptive promotional practices and self-exclusion failures. Multiple state attorney general investigations into advertising practices. FanDuel's parent Flutter has faced regulatory sanctions in the UK for failure to implement responsible gambling protections for identified problem gamblers.",
    "flags": ["baltimore_city_lawsuit", "phai_tobacco_lawyer_case", "nfl_genius_sports_named", "flutter_uk_regulatory_sanctions", "self_exclusion_failures"],
    "sources": ["https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit", "https://www.espn.com/espn/betting/story/_/id/48312490"]
  },
  "labor": {
    "summary": "FanDuel employs approximately 3,000 people in the United States. The company's VIP host workforce — documented in PHAI and other litigation — is specifically trained and incentivized to maximize betting volume from high-risk users. The documented case of a FanDuel VIP manager named Morgan, who built a false personal relationship with a problem gambler over hundreds of messages while providing Super Bowl tickets and field access, illustrates how VIP labor is deployed as an addiction management tool rather than a customer service function.",
    "flags": ["vip_host_addiction_management_incentive", "morgan_vip_false_relationship_documented"],
    "sources": ["https://popular.info/p/new-lawsuit-alleges-draftkings-and"]
  },
  "environmental": {
    "summary": "FanDuel's digital-only operations have limited direct environmental footprint. Flutter Entertainment's global data infrastructure represents the primary environmental impact.",
    "flags": ["digital_operations_data_centers"],
    "sources": []
  },
  "political": {
    "summary": "FanDuel/Flutter has been a primary lobbying force for sports betting legalization across U.S. states since the 2018 Supreme Court ruling. The company has lobbied against mandatory spending limits, advertising restrictions, and VIP program regulations that would directly reduce problem gambling. FanDuel's NFL partnership — which integrates FanDuel branding and betting odds into NFL broadcasts, apps, and stadium experiences — represents a coordinated political and commercial strategy to normalize sports betting for the largest American sports audience. FanDuel has opposed regulations requiring platforms to intervene when users display problem gambling behavior.",
    "flags": ["sports_betting_legalization_lobbying", "nfl_broadcast_integration", "problem_gambling_intervention_opposition", "advertising_restriction_opposition"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "FanDuel CEO Amy Howe received $7.4 million in compensation in 2023. Flutter Entertainment Group CEO Peter Jackson received £5.8 million. Flutter's PHAI executives have publicly described responsible gambling as a 'strategic priority' while the company has simultaneously faced UK regulatory sanctions for failing to implement basic responsible gambling protections for identified problem gamblers — demonstrating the gap between stated commitments and documented practice.",
    "flags": ["uk_sanctions_vs_responsible_gambling_statements", "flutter_ceo_public_responsible_gambling_claims"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "FanDuel's NFL partnership — formalized as an 'Official Sports Betting Partner of the NFL' — creates a revenue relationship where the NFL profits from FanDuel's gambling revenue while simultaneously promoting gambling to its audience of 100+ million viewers. The partnership includes in-broadcast betting odds, FanDuel-branded segments, and stadium activation. The same NFL that conducts player mental health programs receives revenue from a platform documented to cause mental health crises in its users. Genius Sports — the data company named in the PHAI lawsuit alongside FanDuel and DraftKings — provides real-time game data that enables in-play betting, the highest-risk betting format.",
    "flags": ["nfl_official_partnership_conflict", "genius_sports_real_time_data_enabler", "in_play_betting_highest_risk_format"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The PHAI lawsuit includes documentary evidence of a FanDuel VIP manager — identified as Morgan — who maintained hundreds of personal text messages with a problem gambler over multiple years. Morgan discussed restaurants, bars, vacations, and children while simultaneously working to ensure the user continued gambling. In 2022, Morgan provided the user and his son Super Bowl tickets, hotel accommodations, and on-field access before the game. The lawsuit alleges this was documented FanDuel strategy — not an aberration. Plaintiffs also allege that FanDuel's algorithm specifically identified winning players and removed them from VIP programs — the VIP program was exclusively for losing players, with 'VIP' being a mechanism for maximizing losses from addicted users. Former FanDuel employees have alleged that VIP managers were explicitly evaluated on the volume of bets placed by their assigned users, not on user satisfaction or responsible gambling metrics.",
    "flags": ["morgan_vip_super_bowl_inducement_documented", "winners_excluded_vip_program_losing_only", "vip_evaluated_on_betting_volume_not_welfare"],
    "sources": ["https://popular.info/p/new-lawsuit-alleges-draftkings-and"]
  },
  "health_record": {
    "summary": "FanDuel's documented health record tracks closely with DraftKings — they share the same industry, the same practices, and are named in the same lawsuits. Cases in litigation include: a man who began using FanDuel casually and wagered nearly $200,000 in the first year (2x his pre-tax income), $1.3 million in the second year, and $1.5 million in the third year before leaving his job. Another plaintiff wagered $183,000 on FanDuel plus $4 million on DraftKings. The Harris Poll found that 33% of adults aged 21-44 had placed sports bets before age 21. Problem gambling is associated with elevated rates of depression, anxiety, bankruptcy, domestic violence, and suicide.",
    "flags": ["200k_first_year_2x_income_documented", "1_3m_second_year_escalation", "underage_gambling_33pct", "suicide_domestic_violence_associated"],
    "sources": ["https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit", "https://www.espn.com/espn/betting/story/_/id/48312490"]
  },
  "alternatives": {
    "cheaper": ["Free fantasy sports (ESPN, Yahoo, Sleeper) — full sports engagement without wagering", "Sports betting with friends at fixed low stakes — removes corporate algorithmic targeting", "Sports subscription streaming — watch the same games without a financial stake"],
    "healthier": ["Blocking apps: Gamban and BetBlocker are free and prevent access to betting platforms across devices", "Self-exclusion registry: contact your state gaming commission to register; FanDuel is legally required to block you", "National Problem Gambling Helpline: 1-800-522-4700"],
    "diy": ["If FanDuel has assigned you a VIP manager, you have been identified as a high-value losing customer — that is the only qualification", "Deposit limits are available in account settings; set them before placing any bet", "FanDuel's promotional terms include rollover requirements that make 'bonus' bets extremely difficult to withdraw — read every promotion's fine print"]
  },
  "timeline": [
    {"year": 2009, "event": "FanDuel founded as daily fantasy sports platform in New York", "severity": "neutral", "source_url": ""},
    {"year": 2018, "event": "Flutter Entertainment acquires FanDuel majority stake following Supreme Court sports betting ruling", "severity": "neutral", "source_url": ""},
    {"year": 2019, "event": "Flutter acquires full control of FanDuel; begins U.S. sportsbook expansion", "severity": "neutral", "source_url": ""},
    {"year": 2021, "event": "FanDuel becomes Official Sports Betting Partner of the NFL; betting odds integrated into broadcasts", "severity": "high", "source_url": ""},
    {"year": 2022, "event": "VIP manager Morgan provides Super Bowl tickets and field access to documented problem gambler", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "FanDuel's UK parent Flutter faces UK regulatory sanctions for responsible gambling failures", "severity": "high", "source_url": ""},
    {"year": 2025, "event": "Baltimore lawsuit; PHAI tobacco-lawyer case naming FanDuel, DraftKings, NFL, Genius Sports; federal class action", "severity": "critical", "source_url": "https://www.aboutlawsuits.com/sports-betting-addiction-lawsuit"},
    {"year": 2025, "event": "FanDuel holds ~35% US sports betting market share; Flutter reports $14B+ global revenue", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "FanDuel's market penetration — combined with the NFL's broadcast integration — has displaced recreational sports viewing with financially-stakes viewing for tens of millions of Americans. The psychological shift from rooting for a team to managing a financial position in a game changes the nature of sports fandom in documented ways.",
    "price_illusion": "FanDuel's 'Official Partner of the NFL' positioning implies a level of legitimacy and safety that the product does not warrant. The NFL's implicit endorsement — through its partnership revenue and broadcast integration — makes FanDuel appear as a normal part of sports culture rather than a product against which the top tobacco litigation attorney is now bringing product liability claims.",
    "tax_math": "FanDuel's U.S. revenue flows to Flutter Entertainment in Dublin at Ireland's 12.5% corporate tax rate rather than the U.S. 21% rate. American sports bettors' losses fund an Irish holding company's profits at a preferential tax rate, with the public health costs of gambling addiction borne by American communities.",
    "wealth_velocity": "FanDuel's profits flow to Flutter Entertainment's shareholders — predominantly institutional investors in the UK and Ireland. The American sports bettors whose losses fund these profits — concentrated among the 2% who are problem gamblers — receive no share of the value they generate."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Flutter Entertainment shareholders", "how": "$14B+ global revenue; dominant U.S. market position"},
      {"group": "NFL", "how": "Revenue from Official Betting Partner arrangements; gambling drives viewer engagement metrics"},
      {"group": "Media companies", "how": "FanDuel advertising revenue; betting odds integration fees"}
    ],
    "who_paid": [
      {"group": "Problem gamblers", "how": "Financial ruin documented in litigation; VIP programs designed to maximize their losses"},
      {"group": "Man assigned VIP manager Morgan", "how": "Millions in gambling losses while Morgan sent hundreds of personal messages and provided Super Bowl access"},
      {"group": "Families", "how": "Financial consequences of household gambling losses; mental health consequences documented in lawsuits"},
      {"group": "U.S. taxpayers", "how": "Public health costs of gambling addiction; Flutter pays Irish not American tax rates on U.S. profits"}
    ],
    "the_gap": "Morgan built a friendship with a man over years of texts about restaurants and vacations and his kids. She gave him Super Bowl tickets. Her job was to make sure he kept losing money. He wagered millions. FanDuel calls this VIP service. The tobacco lawyer calls it a defective product."
  }
},
  "profiles_v10/las-vegas-sands.json": {
  "brand_name": "Las Vegas Sands",
  "brand_slug": "las-vegas-sands",
  "parent_company": "Las Vegas Sands Corp.",
  "ultimate_parent": "Adelson Family (primary shareholders)",
  "subsidiaries": ["The Venetian Las Vegas", "Palazzo", "Sands Expo", "Marina Bay Sands (Singapore)", "Sands Macao (sold 2021)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "IRAN HACKED LAS VEGAS SANDS IN RETALIATION FOR SHELDON ADELSON'S POLITICAL COMMENTS — AND ADELSON SPENT $200 MILLION INFLUENCING U.S. ELECTIONS",
  "executive_summary": "Las Vegas Sands was built by the late Sheldon Adelson into one of the world's largest casino companies, with properties in Las Vegas, Singapore, and — until 2021 — Macau. Adelson was simultaneously one of the most influential political donors in American history, spending an estimated $200+ million on U.S. elections primarily to benefit Republican candidates and Israel-aligned policies. In 2014, Iran conducted a state-sponsored cyberattack on Las Vegas Sands — wiping 75% of its Vegas servers and costing $40 million — in retaliation for public statements Adelson made suggesting the U.S. should detonate a nuclear bomb in the Iranian desert. The company has also faced documented bribery and corruption investigations related to its Macau operations, a DOJ investigation into its relationship with a Chinese government official, and ongoing questions about money laundering through casino operations.",
  "verdict_tags": ["iran_state_cyberattack", "adelson_200m_political_spending", "macau_corruption_investigation", "doj_bribery_probe", "money_laundering_concerns", "nuclear_comment_retaliation"],
  "concern_flags": {"labor": true, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Las Vegas Sands uses offshore structures in Singapore and historically in Macau to route profits from its Asian operations through lower-tax jurisdictions. The company's Macau operations — sold in 2021 — were structured through complex Cayman Islands and Hong Kong holding companies. Singapore's Marina Bay Sands operates under a government concession with specific tax arrangements. Following Adelson's death, the family's inheritance of substantial LVS shares raised estate tax questions.",
    "flags": ["singapore_concession_tax_arrangements", "macau_offshore_structures_historically", "adelson_estate_tax_family_inheritance"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2014 Iran cyberattack: state-sponsored hackers destroyed 75% of Las Vegas Sands' Vegas servers in retaliation for Adelson's public nuclear comments; $40 million in equipment costs and data recovery. DOJ investigation: Las Vegas Sands faced a years-long DOJ investigation into potential bribery related to its Macau operations and a specific relationship with a Chinese government official — the investigation generated settlements and significant legal costs without criminal charges against the company. Money laundering: Nevada gaming regulators have repeatedly cited Las Vegas Sands for failing to implement adequate anti-money-laundering controls — the company paid $47 million in AML settlement with Nevada in 2013. Singapore regulatory investigations into Marina Bay Sands AML compliance.",
    "flags": ["47m_aml_settlement_nevada_2013", "doj_bribery_investigation_macau", "iran_cyberattack_state_sponsored", "singapore_aml_investigations"],
    "sources": ["https://www.justice.gov", "https://www.casino.org/news/las-vegas-casino-cyberattacks-a-timeline"]
  },
  "labor": {
    "summary": "Las Vegas Sands employs approximately 45,000 people globally. The Venetian Las Vegas has been operated as a non-union property — Adelson was famously resistant to union organization and the Venetian has faced sustained NLRB complaints and union organizing campaigns. Workers at Venetian/Palazzo earn lower wages than workers at competing unionized Strip properties. The company's Macau operations employed workers under Macau's regulatory framework.",
    "flags": ["venetian_non_union_strategy", "nlrb_complaints_union_campaigns", "lower_wages_vs_unionized_strip"],
    "sources": ["https://www.nlrb.gov"]
  },
  "environmental": {
    "summary": "Las Vegas Sands operates several of the largest buildings on the Las Vegas Strip — massive energy consumers in a desert climate. Marina Bay Sands in Singapore is one of the largest integrated resorts in the world. The company has made some sustainability commitments but the scale of its operations represents enormous energy and water consumption.",
    "flags": ["desert_energy_consumption_scale", "marina_bay_sands_global_scale"],
    "sources": []
  },
  "political": {
    "summary": "Sheldon Adelson was the most consequential individual political donor in modern American history. He spent an estimated $100 million in the 2012 election cycle, $150+ million in 2016, and $200+ million in subsequent cycles — primarily to Republican candidates and Israel-aligned causes. Adelson's political influence shaped Republican Party policy on Israel, Iran, and casino regulation. His public suggestion in 2013 that the U.S. should detonate a nuclear weapon in the Iranian desert directly triggered a state-sponsored cyberattack on his own company. Las Vegas Sands has lobbied extensively against online gambling legalization — a position that directly protects its physical casino business from competition.",
    "flags": ["200m_political_spending_estimated", "nuclear_comment_triggered_attack", "online_gambling_opposition_protects_physical_casinos", "israel_policy_influence"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "Sheldon Adelson died in January 2021; his widow Miriam Adelson and family control the company. Miriam Adelson received the Presidential Medal of Freedom from Donald Trump in 2018. The Adelson family's net worth exceeded $30 billion at Sheldon's death. CEO Rob Goldstein has led the company since Adelson's death, focusing on domestic expansion plans — Las Vegas Sands is pursuing a New York casino license and has announced interest in Texas market development.",
    "flags": ["adelson_30b_net_worth", "miriam_adelson_presidential_medal_trump", "ny_texas_expansion_political_context", "political_donor_receiving_honors"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Las Vegas Sands' political spending connected Sheldon Adelson to virtually every major Republican political figure of the past two decades. The company's Macau operations connected it to Chinese government officials in ways that generated the DOJ investigation. Iran's decision to conduct a state-sponsored cyberattack on a private American corporation — in retaliation for one executive's public comments — demonstrates the real-world consequences of the intersection between gambling money, political influence, and geopolitics. Las Vegas Sands' opposition to online gambling directly protects its physical casino business while shaping national policy.",
    "flags": ["republican_political_network_connected", "macau_chinese_government_official_connection", "iran_geopolitical_retaliation", "online_gambling_policy_influence"],
    "sources": ["https://www.casino.org/news/las-vegas-casino-cyberattacks-a-timeline"]
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Nevada gaming regulators and DOJ investigators have documented concerns about Las Vegas Sands' Macau operations and the relationship between its casino business and Chinese government officials — without resulting in criminal charges against the company. Casino industry researchers have alleged that large-scale cash gambling at properties like Marina Bay Sands provides money laundering opportunities that are difficult to detect and that Las Vegas Sands' AML controls have historically been insufficient to address. The 2013 Nevada AML settlement — $47 million — addressed documented failures in cash transaction reporting that regulators alleged enabled suspicious activity.",
    "flags": ["macau_government_official_relationship_investigated", "money_laundering_opportunity_allegations", "aml_controls_historically_insufficient"],
    "sources": []
  },
  "health_record": {
    "summary": "Las Vegas Sands operates some of the largest physical casino facilities in the world — Marina Bay Sands in Singapore draws visitors from across Asia into an environment designed to maximize gambling time and spending. The company's VIP gambling operations in Macau and Singapore — where high-stakes gamblers from mainland China wagered enormous sums — have been associated with documented financial ruin and family consequences in Chinese media. Physical casino operations generate the same addiction profiles as online platforms, with the social intensity of the casino environment adding additional psychological pressure. Problem gambling rates are documented to be higher in communities with casino access.",
    "flags": ["physical_casino_addiction_profiles", "vip_gambling_macau_singapore_documented_harm", "problem_gambling_community_proximity"],
    "sources": ["https://www.ncpgambling.org"]
  },
  "alternatives": {
    "cheaper": ["Independent Las Vegas hotels — off-Strip properties at 50-80% lower rates", "Vegas neighborhood hotels — same proximity to Strip at dramatically lower cost", "Travel to non-gambling resort destinations — comparable luxury at comparable or lower prices"],
    "healthier": ["Singapore's non-casino attractions — Gardens by the Bay, hawker centers, cultural districts — represent Singapore's actual extraordinary culture without entering Marina Bay Sands", "Las Vegas' natural surroundings — Red Rock Canyon, Hoover Dam, Valley of Fire — accessible from the city"],
    "diy": ["Las Vegas Sands' Venetian specifically operates non-union — workers there earn demonstrably less than union workers at MGM, Caesars, and Wynn properties", "National Problem Gambling Helpline: 1-800-522-4700", "Singapore operates a national self-exclusion registry (National Council on Problem Gambling) that all casinos including Marina Bay Sands must honor"]
  },
  "timeline": [
    {"year": 1989, "event": "Sheldon Adelson acquires the Sands Hotel site; begins building Las Vegas casino empire", "severity": "neutral", "source_url": ""},
    {"year": 1999, "event": "The Venetian opens — Adelson's flagship Las Vegas property, operated non-union", "severity": "neutral", "source_url": ""},
    {"year": 2003, "event": "Sands Macau opens; LVS becomes major force in Macau gambling market", "severity": "neutral", "source_url": ""},
    {"year": 2010, "event": "Marina Bay Sands opens in Singapore; becomes one of most profitable casinos in world", "severity": "neutral", "source_url": ""},
    {"year": 2012, "event": "Adelson spends ~$100M on U.S. elections including support for Mitt Romney; DOJ investigation into Macau operations begins", "severity": "high", "source_url": ""},
    {"year": 2013, "event": "Adelson suggests U.S. should detonate nuclear weapon in Iranian desert at public event; $47M AML settlement with Nevada", "severity": "critical", "source_url": ""},
    {"year": 2014, "event": "Iran conducts state-sponsored cyberattack on Las Vegas Sands; 75% of Vegas servers destroyed; $40M in damage", "severity": "critical", "source_url": "https://www.casino.org/news/las-vegas-casino-cyberattacks-a-timeline"},
    {"year": 2016, "event": "Adelson spends ~$150M on U.S. elections; major influence on Trump campaign and administration", "severity": "high", "source_url": ""},
    {"year": 2018, "event": "Trump awards Miriam Adelson the Presidential Medal of Freedom", "severity": "high", "source_url": ""},
    {"year": 2021, "event": "Adelson dies; LVS sells Macau and Vegas Strip properties; family retains Marina Bay Sands; pursues NY license", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Las Vegas Sands' political spending — concentrated in advancing specific foreign policy positions and protecting the physical casino business from online competition — used gambling profits to shape U.S. policy in ways that served Adelson's personal and business interests rather than broader public interests. The company's opposition to online gambling has kept gambling concentrated in physical properties, limiting consumer choice while protecting the Venetian's market.",
    "price_illusion": "Las Vegas Sands' luxury positioning — the Venetian's marble and gold aesthetic, Marina Bay Sands' infinity pool — creates an impression of legitimacy and exclusivity. The business model underneath is identical to any other casino: the house wins, problem gamblers subsidize recreational gamblers, and the gap between the facility's appearance and its function is deliberate.",
    "tax_math": "Adelson's $200+ million in political spending was made from gambling profits — and is partly tax-deductible as charitable contributions to politically-aligned nonprofits. The political returns on that investment include favorable casino regulation, opposition to online gambling competition, and specific foreign policy positions of personal interest to Adelson.",
    "wealth_velocity": "Gambling profits — extracted from casino visitors globally — funded one man's ability to spend $200 million shaping American elections. The Adelson family's $30 billion fortune represents the accumulated house edge across millions of gamblers over decades."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Sheldon and Miriam Adelson / family", "how": "$30B+ fortune; political influence equivalent to a small nation's lobbying budget; Presidential Medal of Freedom"},
      {"group": "Republican candidates supported by Adelson", "how": "$200M+ in election spending; policy positions aligned with donor preferences"},
      {"group": "Israel-aligned political causes", "how": "Specific foreign policy outcomes funded by gambling profits"}
    ],
    "who_paid": [
      {"group": "Casino gamblers globally", "how": "House edge accumulated over decades funded Adelson's $30B fortune and $200M in political spending"},
      {"group": "Non-union Venetian workers", "how": "Lower wages than unionized Strip competitors; NLRB complaints; Adelson's explicit anti-union position"},
      {"group": "U.S. foreign policy (consequential)", "how": "Adelson's nuclear comment triggered a state-sponsored cyberattack on a U.S. corporation; his political spending shaped Iran policy"},
      {"group": "Las Vegas Sands data breach victims", "how": "75% of Vegas servers destroyed by Iranian hackers; data exposure consequences for affected staff and guests"}
    ],
    "the_gap": "Sheldon Adelson suggested nuking the Iranian desert. Iran hacked his casino and wiped 75% of his servers. He spent $200 million on elections funded by casino profits. His wife received the Presidential Medal of Freedom. The Venetian workers who built his fortune are non-union. This is what happens when gambling money meets geopolitics."
  }
},
  "profiles_v10/mgm-resorts.json": {
  "brand_name": "MGM Resorts",
  "brand_slug": "mgm-resorts",
  "parent_company": "MGM Resorts International",
  "ultimate_parent": "MGM Resorts International",
  "subsidiaries": ["Bellagio", "MGM Grand", "Mandalay Bay", "The Cosmopolitan", "Aria", "Vdara", "BetMGM (50%)"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "MGM GOT HACKED TWICE IN FOUR YEARS AND EXPOSED 37 MILLION GUESTS' DATA — INCLUDING SOCIAL SECURITY NUMBERS",
  "executive_summary": "MGM Resorts International is one of the world's largest casino and hospitality operators, running 21 resort hotels with revenues exceeding $16 billion annually. The company suffered two major data breaches — in 2019 and 2023 — that together compromised the personal information of approximately 37 million guests, including names, Social Security numbers, passport numbers, driver's license numbers, and military ID numbers. The 2023 ransomware attack, executed by the Scattered Spider criminal group through basic social engineering of an IT help desk employee, shut down MGM's casino and hotel operations for ten days — costing $100 million in lost revenue. MGM paid $45 million in a class action settlement in 2025. The company's response to the first 2019 breach — which should have triggered enhanced security — clearly failed, as the 2023 attack succeeded through a technique any security professional could have anticipated.",
  "verdict_tags": ["data_breach_37m_guests", "ransomware_100m_loss", "social_security_numbers_exposed", "repeat_breach_failure", "cybersecurity_negligence", "gambling_addiction_facilitation"],
  "concern_flags": {"labor": true, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "MGM Resorts uses complex real estate structures including its MGM Growth Properties REIT — which holds casino real estate and leases it back to MGM operations — to minimize taxable income. The company has operations in multiple states and jurisdictions with different tax treatment. MGM's Macau operations (through MGM China) use offshore structures. The company received significant COVID-era government support.",
    "flags": ["reit_sale_leaseback_structure", "macau_offshore_operations", "covid_government_support"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "2019 breach: Hackers stole data of 10.6 million guests; data appeared on dark web forums for sale. 2023 breach: Scattered Spider gained access through social engineering of IT help desk; ransomware deployed by ALPHV/BlackCat; ten days of operational disruption; $100 million in losses; 37 million total customers affected across both breaches. Class action consolidated into MDL in Nevada federal court. $45 million settlement approved June 2025; payments began December 2025. FTC opened investigation into MGM's cybersecurity practices — ultimately settled separately. MGM has also faced labor disputes and NLRB complaints at multiple properties.",
    "flags": ["45m_class_action_settlement", "37m_records_exposed", "ftc_investigation", "repeat_breach_mdl"],
    "sources": ["https://www.mgmdatasettlement.com", "https://www.cohenmilstein.com/mgm-agrees-to-pay-45-million"]
  },
  "labor": {
    "summary": "MGM employs approximately 77,000 people. The company has faced union disputes with UNITE HERE, which represents hotel and casino workers. In 2023, UNITE HERE locals reached contracts after extended negotiations. MGM's tipped worker model — where servers, bartenders, and dealers rely on tips for most of their income — creates documented wage instability. The ransomware attack caused significant disruption for workers who had to revert to manual processes while systems were down.",
    "flags": ["tipped_worker_wage_instability", "unite_here_disputes", "ransomware_worker_disruption"],
    "sources": ["https://www.nlrb.gov"]
  },
  "environmental": {
    "summary": "MGM's resort properties are among the largest energy consumers in Nevada. The company has made renewable energy commitments including solar installations at some properties. Water use in the desert environment — pools, fountains, landscaping — represents a documented environmental concern in a water-scarce region.",
    "flags": ["desert_water_consumption", "energy_consumption_scale"],
    "sources": []
  },
  "political": {
    "summary": "MGM has been one of the largest political donors in Nevada for decades. The company's lobbying focuses on gaming regulation, taxation rates on casino revenue, and sports betting expansion. MGM's BetMGM joint venture with Entain connects it to the online gambling industry's lobbying against consumer protection regulations. MGM's political relationships with Nevada state government have been documented as central to the regulatory environment in which it operates.",
    "flags": ["nevada_gaming_regulation_lobbying", "betmgm_online_gambling_lobbying", "sports_betting_expansion"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Bill Hornbuckle received $13.4 million in total compensation in 2023. The company's cybersecurity leadership was effectively overruled by an entry-level social engineering attack — a 17-year-old UK teenager was among those arrested for the 2023 hack. MGM's decision not to pay the ransom (unlike Caesars, which paid $15 million) cost the company $100 million but followed FBI guidelines. The company's post-breach promise to invest $40 million in cybersecurity improvements represents an admission that prior investment was insufficient.",
    "flags": ["17_year_old_hacker_breached_systems", "100m_cost_vs_pay_ransom_decision", "40m_post_breach_security_investment"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "MGM's BetMGM — a 50/50 joint venture with UK gambling company Entain — connects it to the online sports betting industry and its documented addiction and predatory design concerns. Both MGM and Caesars were attacked by the same criminal group (Scattered Spider / ALPHV-BlackCat) within weeks of each other in 2023, raising questions about industry-wide cybersecurity practices. MGM shares institutional investors with Caesars, Wynn, and other major casino operators through overlapping institutional holdings.",
    "flags": ["betmgm_entain_online_gambling", "caesars_simultaneous_hack_pattern", "casino_industry_investor_overlap"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "The class action lawsuits alleged that MGM was negligent in failing to prevent the 2023 attack through basic social engineering — specifically that industry-standard multi-factor authentication and help desk verification protocols were not in place. Plaintiffs alleged that the 2019 breach should have prompted MGM to implement the exact controls that would have prevented the 2023 social engineering attack, and that MGM's failure to do so constitutes gross negligence. Former MGM IT employees have alleged in various proceedings that security budget requests were consistently deprioritized relative to revenue-generating technology spending.",
    "flags": ["gross_negligence_post_2019_failure_alleged", "security_budget_deprioritized_alleged", "help_desk_verification_failure"],
    "sources": ["https://www.mgmdatasettlement.com"]
  },
  "health_record": {
    "summary": "MGM's primary documented health concern is the gambling addiction facilitated by its casino operations — MGM is the largest casino operator in the United States. Problem gambling affects an estimated 2-3% of the population with severe documented consequences including financial ruin, family breakdown, bankruptcy, and suicide. MGM's loyalty program — the database stolen in both breaches — is specifically designed to identify high-value gamblers and maximize their time and money spent on property. The same data used to identify VIP gamblers was the data stolen in the ransomware attack.",
    "flags": ["gambling_addiction_business_model", "loyalty_program_high_value_gambler_targeting", "stolen_data_was_addiction_targeting_data"],
    "sources": ["https://www.ncpgambling.org"]
  },
  "alternatives": {
    "cheaper": ["Independent hotels near casino areas — often dramatically lower prices without the gambling subsidy model", "Airbnb and VRBO in Las Vegas — genuine alternatives at often 50-70% lower nightly rates", "Smaller regional casinos with lower overhead and more personal service"],
    "healthier": ["Non-casino resorts — destinations built around wellness, nature, or culture rather than gambling", "State and national parks as vacation alternatives — Nevada has extraordinary natural beauty beyond the Strip", "Travel that does not require exchanging money for odds weighted against you"],
    "diy": ["If gambling: set a hard loss limit before entering any casino and leave when you hit it", "National Problem Gambling Helpline: 1-800-522-4700", "Self-exclusion programs — every state with legal gambling has a self-exclusion registry that casinos are legally required to honor"]
  },
  "timeline": [
    {"year": 1986, "event": "MGM Grand Hotel founded in Las Vegas", "severity": "neutral", "source_url": ""},
    {"year": 2000, "event": "MGM acquires Mirage Resorts; begins building dominant Las Vegas Strip position", "severity": "neutral", "source_url": ""},
    {"year": 2019, "event": "July: Hackers steal data of 10.6 million guests; data later appears for sale on dark web", "severity": "critical", "source_url": ""},
    {"year": 2020, "event": "COVID-19 forces extended casino closures; significant workforce reductions", "severity": "high", "source_url": ""},
    {"year": 2022, "event": "BetMGM data breach discovered (separate incident); online gambling division also compromised", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "September: Scattered Spider social engineers IT help desk; ransomware deployed; 10 days of disruption; $100M loss; 37M total records compromised", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "FTC investigates cybersecurity practices; federal criminal charges filed against Scattered Spider members", "severity": "high", "source_url": ""},
    {"year": 2025, "event": "June: $45M class action settlement approved; December: payments distributed — $20-$75 per victim", "severity": "high", "source_url": "https://www.mgmdatasettlement.com"}
  ],
  "community_impact": {
    "displacement": "MGM's dominance of the Las Vegas Strip has contributed to the consolidation of casino hospitality into a handful of mega-operators, reducing competition and diversity. The company's labor practices affect tens of thousands of workers in a city where casino employment is the dominant industry.",
    "price_illusion": "MGM's hotel pricing is subsidized by gambling losses — the business model requires that gamblers lose money to keep room rates competitive. The data collected through loyalty programs — the same data stolen in the breach — is specifically designed to maximize gambling behavior.",
    "tax_math": "Nevada's gaming tax rates are among the lowest in the country — a regulatory environment MGM has lobbied to maintain. The REIT structure reduces corporate taxes on the most valuable assets. Tax rates calibrated to protect MGM's margins are calibrated against the public interest in adequate state revenue.",
    "wealth_velocity": "Casino profits flow to MGM shareholders globally. The workers who serve gamblers — tipped employees dependent on visitor generosity — capture a small portion of the value they create. The Bellagio's fountain is not subsidized by visitor joy; it is subsidized by losing gamblers."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "MGM shareholders", "how": "$16B+ annual revenue from casino operations; breach costs partially covered by insurance"},
      {"group": "Scattered Spider criminal group", "how": "Did not receive ransom from MGM but attacked Caesars simultaneously and received $15M"},
      {"group": "MGM executives", "how": "CEO received $13.4M in 2023 — breach year; cybersecurity underinvestment enabled by budget prioritization decisions"}
    ],
    "who_paid": [
      {"group": "37 million guests", "how": "Social Security numbers, passport numbers, driver's licenses exposed; $20-$75 per person in settlement"},
      {"group": "MGM workers", "how": "Ten days operating manually; customer-facing staff dealt with chaos from non-functioning systems"},
      {"group": "MGM shareholders", "how": "4% stock drop; $100M Q3 loss; $45M settlement; $40M security investment"}
    ],
    "the_gap": "MGM was hacked in 2019. They knew the playbook. A teenager called the IT help desk, pretended to be an employee, and got login credentials. Four years and $100 million later. The 37 million victims got $20-$75 each."
  }
},
  "profiles_v10/penn-entertainment.json": {
  "brand_name": "Penn Entertainment",
  "brand_slug": "penn-entertainment",
  "parent_company": "Penn Entertainment Inc.",
  "ultimate_parent": "Penn Entertainment Inc.",
  "subsidiaries": ["Hollywood Casino", "Barstool Sportsbook (sold back)", "ESPN Bet (partnership)", "myPrize", "theScore Bet"],
  "overall_concern_level": "significant",
  "profile_type": "database",
  "generated_headline": "PENN BOUGHT BARSTOOL SPORTS TO SELL GAMBLING TO YOUNG MEN, LOST $2 BILLION, THEN SOLD IT BACK FOR $1",
  "executive_summary": "Penn Entertainment is one of the largest regional casino operators in the United States, operating 43 properties across 20 states under brands including Hollywood Casino and L'Auberge. The company made one of the most publicized and expensive strategic miscalculations in gambling industry history: purchasing Barstool Sports for $388 million between 2020 and 2023 to build a sports betting brand targeting young male sports fans, then writing off $2.1 billion in losses and selling Barstool back to its founder Dave Portnoy for $1 in 2023. Penn subsequently announced a partnership with ESPN — paying $1.5 billion over 10 years for the ESPN Bet brand. Penn's regional casino portfolio serves predominantly working-class and rural communities, where problem gambling rates and the impact of casino proximity on household finances are documented by research.",
  "verdict_tags": ["barstool_2b_write_off", "young_male_gambling_targeting", "regional_casino_working_class_communities", "espn_bet_1_5b_deal", "problem_gambling_adjacency"],
  "concern_flags": {"labor": true, "environmental": false, "political": true, "tax": true, "health": true, "legal": true},
  "tax": {
    "summary": "Penn Entertainment carries approximately $2.7 billion in long-term debt. The company's real estate assets are held through a REIT structure (Gaming and Leisure Properties, from which Penn spun off its real estate in 2013) — creating a sale-leaseback arrangement that generates lease deductions reducing taxable income. The $2.1 billion Barstool write-off generated significant tax losses that reduce future obligations. Penn has operations across 20 states with varying gaming tax regimes.",
    "flags": ["glpi_reit_sale_leaseback", "barstool_write_off_tax_losses", "2_7b_debt_interest_deductions"],
    "sources": ["https://www.sec.gov"]
  },
  "legal": {
    "summary": "Penn's legal record is primarily regulatory — gaming regulators across 20 states require ongoing compliance with licensing conditions. The company has faced specific enforcement actions in multiple states for regulatory violations. The Barstool Sports acquisition brought Penn into proximity with Barstool's documented history of workplace misconduct, racial harassment, and hostile work environment allegations — a culture directly at odds with gaming regulators' suitability requirements. Dave Portnoy, Barstool's founder, was named in sexual misconduct allegations documented by Insider investigative reporting in 2021, creating regulatory complications for Penn.",
    "flags": ["barstool_culture_regulatory_complications", "portnoy_misconduct_allegations", "state_gaming_regulatory_violations", "gaming_license_suitability_concerns"],
    "sources": ["https://www.sec.gov"]
  },
  "labor": {
    "summary": "Penn employs approximately 20,000 people across its 43 properties. The company's regional casino workforce earns significantly less than Las Vegas Strip casino workers — regional markets lack the tourist premium that subsidizes Strip wages. UNITE HERE represents workers at some Penn properties. Penn's continuous acquisition and divestiture of casino properties creates ongoing workforce disruption.",
    "flags": ["regional_casino_lower_wages", "workforce_disruption_acquisitions_divestitures", "unite_here_some_properties"],
    "sources": []
  },
  "environmental": {
    "summary": "Penn's 43 properties across 20 states represent significant energy consumers. Regional casinos — many operating 24/7 — have large lighting, HVAC, and gaming system energy demands. The company has made limited public sustainability commitments relative to its operational footprint.",
    "flags": ["43_property_energy_footprint", "24_7_regional_casino_energy"],
    "sources": []
  },
  "political": {
    "summary": "Penn has lobbied for sports betting legalization across states, for favorable gaming tax rates, and against regulations that would restrict casino marketing to problem gamblers. The Barstool acquisition was partly a political strategy — Barstool's audience of predominantly young conservative men represented a market that overlapped with Republican voter demographics, creating potential political complications for gaming regulators who evaluate applicant suitability.",
    "flags": ["sports_betting_state_lobbying", "barstool_political_demographic_overlap", "gaming_tax_rate_lobbying"],
    "sources": ["https://www.opensecrets.org"]
  },
  "executives": {
    "summary": "CEO Jay Snowden received $11.2 million in total compensation in 2023 — the year Penn wrote off $2.1 billion from the Barstool acquisition and sold it back for $1. The Barstool acquisition was Snowden's signature strategic move, approved by the board, and resulted in one of the largest single-acquisition write-offs in recent gambling industry history. Dave Portnoy — who sold Barstool to Penn for $388 million and received it back for $1 — is currently pursuing new media and sports betting ventures.",
    "flags": ["2_1b_write_off_ceo_compensation_year", "portnoy_sold_388m_bought_back_1_dollar", "board_approved_strategic_miscalculation"],
    "sources": ["https://www.sec.gov"]
  },
  "connections": {
    "summary": "Penn's ESPN Bet partnership — $1.5 billion over 10 years for the right to use ESPN's brand — connects the nation's largest sports media company to a casino operator's gambling product. ESPN's audience of sports fans now receives gambling promotions under the ESPN brand — a brand built on sports journalism credibility being used to normalize sports betting. This mirrors the FanDuel-NFL partnership in using trusted sports institutions to reach gambling audiences. Barstool Sports under Portnoy has continued to promote sports gambling to its audience, now without Penn's gaming regulatory constraints.",
    "flags": ["espn_brand_gambling_normalization", "sports_media_gambling_pipeline", "barstool_continued_gambling_promotion"],
    "sources": []
  },
  "allegations": {
    "disclaimer": "The following are allegations and unproven claims documented in credible sources but not adjudicated.",
    "summary": "Gaming regulators in several states raised suitability concerns about the Barstool acquisition based on documented workplace misconduct at Barstool — including allegations of a hostile work environment, racial harassment, and sexual misconduct by senior Barstool figures including Portnoy. Former Barstool employees have alleged that the company's sports betting promotions to its young male audience deliberately targeted men who exhibited early signs of problem gambling behavior — treating gambling losses as content rather than harm.",
    "flags": ["gaming_suitability_barstool_culture_concerns", "barstool_gambling_targeting_young_men_alleged", "portnoy_sexual_misconduct_allegations_insider"],
    "sources": []
  },
  "health_record": {
    "summary": "Penn's regional casino portfolio is concentrated in communities where casino proximity is associated with elevated problem gambling rates. Research consistently finds that living within 10 miles of a casino is associated with increased rates of problem gambling, bankruptcy, and related financial distress. Penn's 43 properties in 20 states — targeting markets with lower casino saturation and less competition — serve communities with limited alternatives and potentially less access to gambling addiction resources. The Barstool acquisition was an explicit attempt to reach younger men with gambling products — a demographic at elevated risk for developing gambling problems.",
    "flags": ["regional_casino_proximity_problem_gambling_research", "working_class_community_targeting", "young_male_targeting_via_barstool"],
    "sources": ["https://www.ncpgambling.org"]
  },
  "alternatives": {
    "cheaper": ["Movie theaters, bowling alleys, and entertainment venues provide social entertainment at defined costs without financial risk", "Free or low-cost community entertainment — parks, local sports, events — replaces casino social function without gambling exposure"],
    "healthier": ["For entertainment: any fixed-cost leisure activity where the amount spent is known in advance", "For sports betting: free fantasy sports leagues on ESPN, Yahoo, or Sleeper"],
    "diy": ["Penn's Hollywood Casino properties are documented regional problem gambling attractors — proximity matters", "National Problem Gambling Helpline: 1-800-522-4700", "ESPN Bet promotions carry Penn Entertainment's casino infrastructure — the ESPN brand does not change the underlying product"]
  },
  "timeline": [
    {"year": 1994, "event": "Penn National Gaming founded; begins acquiring regional casinos", "severity": "neutral", "source_url": ""},
    {"year": 2013, "event": "Penn spins off real estate into Gaming and Leisure Properties REIT; retains operating assets", "severity": "neutral", "source_url": ""},
    {"year": 2020, "event": "Penn acquires 36% of Barstool Sports for $163M; partnership to create Barstool Sportsbook", "severity": "high", "source_url": ""},
    {"year": 2021, "event": "Insider investigation documents Dave Portnoy sexual misconduct allegations; gaming regulatory suitability questions emerge", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Penn acquires full Barstool ownership for $388M total; announces ESPN Bet deal at $1.5B over 10 years", "severity": "high", "source_url": ""},
    {"year": 2023, "event": "Penn writes off $2.1B on Barstool; sells it back to Portnoy for $1; rebrands to Penn Entertainment", "severity": "critical", "source_url": ""},
    {"year": 2024, "event": "ESPN Bet launches; performance underwhelms versus DraftKings and FanDuel market share", "severity": "moderate", "source_url": ""},
    {"year": 2025, "event": "Penn carries $2.7B debt; operates 43 properties; continues regional casino expansion", "severity": "moderate", "source_url": ""}
  ],
  "community_impact": {
    "displacement": "Penn's regional casino strategy places gambling facilities in mid-size and rural markets that previously had no casino access. Research documents that casino entry into new markets increases problem gambling rates in the surrounding community — Penn's 43-property footprint represents 43 new or expanded gambling epicenters in communities that often lack corresponding addiction treatment infrastructure.",
    "price_illusion": "Regional casino pricing — cheap buffets, discounted hotel rooms, loss leader amenities — creates the appearance of value entertainment. The business model requires gambling losses to subsidize all other services. The $2.1 billion Barstool write-off and $1.5 billion ESPN Bet investment represent marketing costs ultimately borne by losing gamblers at Penn's properties.",
    "tax_math": "Penn's REIT structure generates substantial lease deductions — Penn pays rent to Gaming and Leisure Properties (which it once owned) for the buildings it operates, generating deductions against operating income. The $2.1 billion Barstool write-off generates tax losses that reduce future obligations. The effective tax burden is minimized while operating in communities that bear the social costs of expanded gambling access.",
    "wealth_velocity": "Penn's profits flow to institutional shareholders. Dave Portnoy — who sold Barstool for $388 million and received it back for $1 — netted the purchase price while Penn shareholders absorbed the $2.1 billion write-off. The Hollywood Casino guests in rural Ohio and Indiana whose losses funded the Barstool experiment had no say in the acquisition."
  },
  "cost_absorption": {
    "who_benefited": [
      {"group": "Dave Portnoy", "how": "Sold Barstool for $388 million; received it back for $1; retained the asset with no further obligation"},
      {"group": "Gaming and Leisure Properties (REIT)", "how": "Collects rent from Penn on casino properties it spun off; low-risk landlord position"},
      {"group": "ESPN", "how": "$1.5B over 10 years for brand licensing; gambling association risk transferred to Penn"}
    ],
    "who_paid": [
      {"group": "Penn shareholders", "how": "$2.1B Barstool write-off; ongoing ESPN Bet investment at below-market share performance"},
      {"group": "Regional casino communities", "how": "43 gambling facilities in 20 states; documented problem gambling rate increases near casino openings"},
      {"group": "Barstool's young male audience", "how": "Specifically targeted for gambling acquisition through a media brand they trusted"}
    ],
    "the_gap": "Penn paid $388 million for Barstool Sports to reach young men with gambling. It wrote off $2.1 billion. It sold Barstool back for $1. Dave Portnoy kept the $388 million. Penn then paid ESPN $1.5 billion for a new brand. The money comes from regional casino gamblers in 20 states. The house always wins — but sometimes the house loses the side bets."
  }
},
};

for (const [key, profile] of Object.entries(profiles)) {
  const [batch, file] = key.split('/');
  const dir = join(__dirname, batch);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), JSON.stringify(profile, null, 2));
  console.log('wrote', key);
}
console.log('Done. ' + Object.keys(profiles).length + ' files written.');
