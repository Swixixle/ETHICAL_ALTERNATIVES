# Cursor Instruction: News Outlet Tags Per Investigation Card

## INSTRUCTION 1: Add outlet data to profile format + share system

> "Add a `press_outlets` field to the investigation profile format and wire it to the share system so tapping SHARE on any investigation card automatically pre-populates the relevant journalists and outlets who cover that company.
>
> **Step 1 — Add to `normalizeInvestigation` in `investigation.js`:**
> ```js
> press_outlets: profile.press_outlets || []
> ```
>
> **Step 2 — Create `server/data/press-outlets.json`:**
> This maps brand slugs to relevant outlet accounts. Wire it so if a profile has no `press_outlets` field, the server looks up the slug in this fallback JSON and attaches the result.
>
> **Step 3 — In `ShareCard.jsx`:** Add a new section above the regulatory destinations called 'PRESS' with the outlet rows. Each outlet row has: outlet name, journalist handle if known, description ('Covers labor violations', 'Investigates pharma pricing'). Same toggle UI as the regulatory rows.
>
> Commit: `feat: press outlet tags on investigation cards + share routing`"

---

## INSTRUCTION 2: Create `server/data/press-outlets.json`

> "Create `server/data/press-outlets.json` with the following structure. This maps each brand to the outlets most likely to be interested in sharing or investigating that company's record:
>
> ```json
> {
>   \"walmart\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Labor + wage theft\" },
>       { \"name\": \"In These Times\", \"handle\": \"@inthesetimes\", \"beat\": \"Workers rights\" },
>       { \"name\": \"The Guardian US\", \"handle\": \"@guardiannews\", \"beat\": \"Labor + environment\" }
>     ]
>   },
>   \"amazon\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Tech accountability\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Warehouse conditions\" },
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Corporate\" }
>     ]
>   },
>   \"pfizer\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Pharma pricing\" },
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Pharma + biotech\" },
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"Drug pricing\" }
>     ]
>   },
>   \"eli-lilly\": {
>     \"outlets\": [
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Insulin pricing\" },
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"Drug access\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Pharma accountability\" }
>     ]
>   },
>   \"merck\": {
>     \"outlets\": [
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Drug safety\" },
>       { \"name\": \"BMJ\", \"handle\": \"@bmj_latest\", \"beat\": \"Clinical evidence\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Pharma fraud\" }
>     ]
>   },
>   \"unitedhealth\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Insurance denials\" },
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"Health insurance\" },
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Healthcare industry\" }
>     ]
>   },
>   \"cigna\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Claim denials\" },
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"Insurance accountability\" }
>     ]
>   },
>   \"cvs-health\": {
>     \"outlets\": [
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"PBM pricing\" },
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Pharmacy benefits\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Opioid dispensing\" }
>     ]
>   },
>   \"hca-healthcare\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Hospital billing fraud\" },
>       { \"name\": \"Modern Healthcare\", \"handle\": \"@modrnhealthcare\", \"beat\": \"Hospital industry\" },
>       { \"name\": \"KFF Health News\", \"handle\": \"@kffhealthnews\", \"beat\": \"For-profit hospitals\" }
>     ]
>   },
>   \"steward-health-care\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"PE in healthcare\" },
>       { \"name\": \"Boston Globe\", \"handle\": \"@bostonglobe\", \"beat\": \"Steward bankruptcy\" },
>       { \"name\": \"STAT News\", \"handle\": \"@statnews\", \"beat\": \"Hospital closures\" }
>     ]
>   },
>   \"mckesson\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Opioid distribution\" },
>       { \"name\": \"Washington Post\", \"handle\": \"@washingtonpost\", \"beat\": \"Opioid crisis\" },
>       { \"name\": \"Charleston Gazette-Mail\", \"handle\": \"@cgazettemail\", \"beat\": \"WV opioid coverage\" }
>     ]
>   },
>   \"cardinal-health\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Opioid distribution\" },
>       { \"name\": \"Washington Post\", \"handle\": \"@washingtonpost\", \"beat\": \"Opioid crisis\" }
>     ]
>   },
>   \"exxonmobil\": {
>     \"outlets\": [
>       { \"name\": \"InsideClimate News\", \"handle\": \"@insideclimate\", \"beat\": \"Climate denial\" },
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Fossil fuels\" },
>       { \"name\": \"Columbia Journalism Investigations\", \"handle\": \"@columbiajschool\", \"beat\": \"Exxon climate docs\" }
>     ]
>   },
>   \"chevron\": {
>     \"outlets\": [
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Ecuador contamination\" },
>       { \"name\": \"OCCRP\", \"handle\": \"@occrp\", \"beat\": \"Corporate crime\" },
>       { \"name\": \"InsideClimate News\", \"handle\": \"@insideclimate\", \"beat\": \"Climate denial\" }
>     ]
>   },
>   \"shell\": {
>     \"outlets\": [
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Climate + Niger Delta\" },
>       { \"name\": \"Amnesty International\", \"handle\": \"@amnesty\", \"beat\": \"Nigeria human rights\" },
>       { \"name\": \"InsideClimate News\", \"handle\": \"@insideclimate\", \"beat\": \"Internal climate docs\" }
>     ]
>   },
>   \"bp\": {
>     \"outlets\": [
>       { \"name\": \"NOAA\", \"handle\": \"@noaa\", \"beat\": \"Gulf spill ongoing\" },
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Deepwater Horizon\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Spill accountability\" }
>     ]
>   },
>   \"koch-industries\": {
>     \"outlets\": [
>       { \"name\": \"The Intercept\", \"handle\": \"@theintercept\", \"beat\": \"Dark money\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Koch network\" },
>       { \"name\": \"InsideClimate News\", \"handle\": \"@insideclimate\", \"beat\": \"Climate denial funding\" }
>     ]
>   },
>   \"wells-fargo\": {
>     \"outlets\": [
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Banking fraud\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Fake accounts\" },
>       { \"name\": \"CFPB\", \"handle\": \"@cfpb\", \"beat\": \"Consumer protection\" }
>     ]
>   },
>   \"jpmorgan-chase\": {
>     \"outlets\": [
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Wall Street\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Banking\" },
>       { \"name\": \"The Intercept\", \"handle\": \"@theintercept\", \"beat\": \"Epstein banking\" }
>     ]
>   },
>   \"goldman-sachs\": {
>     \"outlets\": [
>       { \"name\": \"ICIJ\", \"handle\": \"@icijorg\", \"beat\": \"1MDB scandal\" },
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Wall Street\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Finance\" }
>     ]
>   },
>   \"bank-of-america\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Mortgage discrimination\" },
>       { \"name\": \"CFPB\", \"handle\": \"@cfpb\", \"beat\": \"Consumer violations\" }
>     ]
>   },
>   \"comcast\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Telecom accountability\" },
>       { \"name\": \"Ars Technica\", \"handle\": \"@arstechnica\", \"beat\": \"Net neutrality\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Monopoly pricing\" }
>     ]
>   },
>   \"att\": {
>     \"outlets\": [
>       { \"name\": \"The Intercept\", \"handle\": \"@theintercept\", \"beat\": \"NSA surveillance\" },
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Telecom privacy\" },
>       { \"name\": \"Ars Technica\", \"handle\": \"@arstechnica\", \"beat\": \"Location data\" }
>     ]
>   },
>   \"verizon\": {
>     \"outlets\": [
>       { \"name\": \"Vice Motherboard\", \"handle\": \"@vicenews\", \"beat\": \"Location data sales\" },
>       { \"name\": \"The Intercept\", \"handle\": \"@theintercept\", \"beat\": \"NSA cooperation\" },
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Telecom privacy\" }
>     ]
>   },
>   \"tiktok-bytedance\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Data privacy\" },
>       { \"name\": \"WSJ Tech\", \"handle\": \"@wsjtech\", \"beat\": \"Algorithm harm\" },
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Youth mental health\" }
>     ]
>   },
>   \"uber\": {
>     \"outlets\": [
>       { \"name\": \"ICIJ (Uber Files)\", \"handle\": \"@icijorg\", \"beat\": \"Uber Files\" },
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Gig worker rights\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Worker misclassification\" }
>     ]
>   },
>   \"amazon\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Tech monopoly\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Warehouse conditions\" },
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Labor\" }
>     ]
>   },
>   \"meta\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Facebook data\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Content moderation\" },
>       { \"name\": \"WSJ Tech\", \"handle\": \"@wsjtech\", \"beat\": \"Facebook Files\" }
>     ]
>   },
>   \"google\": {
>     \"outlets\": [
>       { \"name\": \"The Markup\", \"handle\": \"@themarkup\", \"beat\": \"Google antitrust\" },
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Ad targeting\" }
>     ]
>   },
>   \"samsung\": {
>     \"outlets\": [
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Chaebol corruption\" },
>       { \"name\": \"Bloomberg\", \"handle\": \"@business\", \"beat\": \"Samsung chairman\" }
>     ]
>   },
>   \"toyota\": {
>     \"outlets\": [
>       { \"name\": \"NY Times Business\", \"handle\": \"@nytimesbusiness\", \"beat\": \"Auto safety\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Toyota recalls\" }
>     ]
>   },
>   \"general-motors\": {
>     \"outlets\": [
>       { \"name\": \"Detroit Free Press\", \"handle\": \"@freep\", \"beat\": \"GM ignition switch\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Auto safety\" }
>     ]
>   },
>   \"ford\": {
>     \"outlets\": [
>       { \"name\": \"Detroit Free Press\", \"handle\": \"@freep\", \"beat\": \"Ford safety\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Auto industry\" }
>     ]
>   },
>   \"kroger\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Grocery monopoly\" },
>       { \"name\": \"The American Prospect\", \"handle\": \"@theprospect\", \"beat\": \"Antitrust\" }
>     ]
>   },
>   \"cargill\": {
>     \"outlets\": [
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Amazon deforestation\" },
>       { \"name\": \"Greenpeace\", \"handle\": \"@greenpeaceusa\", \"beat\": \"Soy sourcing\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Commodity trading\" }
>     ]
>   },
>   \"_default\": {
>     \"outlets\": [
>       { \"name\": \"ProPublica\", \"handle\": \"@propublica\", \"beat\": \"Corporate accountability\" },
>       { \"name\": \"The Guardian\", \"handle\": \"@guardian\", \"beat\": \"Business\" },
>       { \"name\": \"Reuters\", \"handle\": \"@reuters\", \"beat\": \"Corporate news\" }
>     ]
>   }
> }
> ```
>
> The `_default` entry is used when no specific outlet mapping exists for the brand slug. Wire the lookup in `server/routes/tap.js` — after the profile is fetched or investigation generated, attach `press_outlets` from this JSON.
>
> Commit: `feat: press-outlets.json — 40 brand outlet mappings with journalist handles`"

---

## INSTRUCTION 3: Share card press section UI

> "In `ShareCard.jsx`, add a PRESS section above the REGULATORS section:
>
> ```jsx
> {pressOutlets.length > 0 && (
>   <div style={{marginBottom:16}}>
>     <div style={{fontSize:10, letterSpacing:1.5, color:'#A8C4D8', marginBottom:8}}>
>       PRESS — JOURNALISTS WHO COVER THIS COMPANY
>     </div>
>     {pressOutlets.map(outlet => (
>       <div key={outlet.handle} style={{
>         display:'flex', alignItems:'center', justifyContent:'space-between',
>         padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.08)'
>       }}>
>         <div>
>           <div style={{color:'#E0E0E0', fontSize:13}}>{outlet.name}</div>
>           <div style={{color:'#6A8A9A', fontSize:11}}>{outlet.beat}</div>
>         </div>
>         <div style={{display:'flex', alignItems:'center', gap:8}}>
>           <span style={{color:'#A8C4D8', fontSize:11}}>{outlet.handle}</span>
>           <input type='checkbox' checked={selected.includes(outlet.handle)}
>             onChange={() => toggleSelected(outlet.handle)} />
>         </div>
>       </div>
>     ))}
>   </div>
> )}
> ```
>
> When a press outlet is selected and SEND TO ALL is tapped, the share text for X/Twitter pre-populates with the outlet's handle tagged: 'Investigated [company]. [headline excerpt]. @propublica @themarkup [link]'
>
> This turns every share into a journalist ping on a company they already cover.
>
> Commit: `feat: press section in share card — journalists tagged in X share text`"
