// CRO audit storefront capture — general template (puppeteer-core + installed Chrome).
// Usage: node capture.js https://brand.com   (writes screenshots/clean_*.png)
// Adapt SURFACES + selectors per brand. Gate handlers are no-ops if the gate is absent.
const puppeteer = require('puppeteer-core');
// Chrome: set CHROME_BIN, or the usual install path for this machine is used.
const CHROME = process.env.CHROME_BIN || ({
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}[process.platform] || '/usr/bin/google-chrome');
const SITE = process.argv[2] || 'https://example.com';
const OUT = require('path').join(process.env.AUDIT_DIR || require('path').join(require('os').homedir(), 'cro-audit'), 'screenshots', 'clean_');
require('fs').mkdirSync(require('path').dirname(OUT), {recursive: true}); // screenshot() fails if the dir is missing
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- gate + popup handlers (safe to call always) ---
async function clickAge(p){await p.evaluate(()=>{const e=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/21 or older|i am 21|yes, i|over 18|enter site/i.test(x.innerText||''));if(e)e.click();}).catch(()=>{});}
async function handleState(p){await p.evaluate(()=>{const s=[...document.querySelectorAll('select')].find(x=>/state/i.test(x.outerHTML)||x.options.length>40);if(s){const o=[...s.options].find(o=>/texas|florida|colorado|california|new york/i.test(o.text));if(o){s.value=o.value;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));}const b=[...document.querySelectorAll('button,a,[role=button]')].find(e=>/continue|shop|confirm|enter/i.test(e.innerText||''));if(b)b.click();}}).catch(()=>{});}
// Cookie banner: decline what is not needed where the banner offers it; accept only as a last resort to clear the view.
async function acceptCookies(p){await p.evaluate(()=>{const all=[...document.querySelectorAll('button,a')];const b=all.find(e=>/reject|decline|necessary only|only necessary|essential only/i.test(e.innerText||''))||all.find(e=>/accept|agree|got it|allow all/i.test(e.innerText||''));if(b)b.click();}).catch(()=>{});}
async function killOverlays(p){await p.evaluate(()=>{
  document.querySelectorAll('[class*="kl-"],[class*="klaviyo"],[id*="klaviyo"],[role="dialog"],.needsclick,[class*="popup"],[class*="modal"],[class*="drawer-overlay"]').forEach(e=>{try{e.style.setProperty('display','none','important');}catch(_){}});
  [...document.querySelectorAll('div')].forEach(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();if(s.position==='fixed'&&r.width>=window.innerWidth*0.9&&r.height>=window.innerHeight*0.8&&+s.zIndex>500){e.style.setProperty('display','none','important');}});
  document.body.style.overflow='auto';
}).catch(()=>{});}
async function clearAll(p){await clickAge(p);await sleep(600);await handleState(p);await sleep(600);await acceptCookies(p);await killOverlays(p);}

async function shoot(p,name,full){await killOverlays(p);await sleep(400);await p.screenshot({path:OUT+name+'.png',fullPage:!!full});console.log('shot',name,p.url());}

(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--hide-scrollbars']});
  const p=await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});

  // HOMEPAGE
  await p.goto(SITE,{waitUntil:'networkidle2',timeout:60000});
  await sleep(2000);await clearAll(p);await sleep(1500);await clearAll(p);
  await shoot(p,'homepage',true); await shoot(p,'homepage_top',false);

  // NAV (open the menu drawer — adapt selector per theme)
  await p.evaluate(()=>{const m=[...document.querySelectorAll('button,a,[aria-label]')].find(e=>/menu|navigation/i.test((e.getAttribute&&e.getAttribute('aria-label'))||e.innerText||''));if(m)m.click();}).catch(()=>{});
  await sleep(1200); await shoot(p,'nav',false);

  // COLLECTION (set COLLECTION_URL per brand, e.g. /collections/best-sellers)
  const COLLECTION_URL = SITE.replace(/\/$/,'')+'/collections/all';
  try{await p.goto(COLLECTION_URL,{waitUntil:'networkidle2',timeout:60000});await sleep(2000);await clearAll(p);await shoot(p,'collection',true);}catch(e){console.log('collection skip',e.message);}

  // PDP (set PDP_URL per brand to the top product)
  const PDP_URL = process.argv[3]; // pass as 3rd arg
  if(PDP_URL){try{await p.goto(PDP_URL,{waitUntil:'networkidle2',timeout:60000});await sleep(2000);await clearAll(p);await shoot(p,'pdp',true);await shoot(p,'pdp_top',false);
    // add to cart
    await p.evaluate(()=>{const b=[...document.querySelectorAll('button,[type=submit]')].find(e=>/add to cart|add to bag/i.test(e.innerText||''));if(b)b.click();}).catch(()=>{});
    await sleep(2500);await killOverlays(p);await shoot(p,'cart',false);
    // checkout
    await p.evaluate(()=>{const b=[...document.querySelectorAll('a,button')].find(e=>/checkout/i.test(e.innerText||'')&&!/without/i.test(e.innerText||''));if(b)b.click();}).catch(()=>{});
    await sleep(4000);await killOverlays(p);await shoot(p,'checkout',false);
  }catch(e){console.log('pdp/checkout skip',e.message);}}

  // LANDING PAGE (advertorial/listicle — set LP_URL per brand, e.g. /pages/5-reasons)
  const LP_URL = process.argv[5];
  if(LP_URL){try{await p.goto(LP_URL,{waitUntil:'networkidle2',timeout:60000});await sleep(2500);await clearAll(p);await shoot(p,'landing',true);}catch(e){console.log('lp skip',e.message);}}

  // FAQ / ABOUT / STORY (mandatory surfaces — try common paths, capture whatever resolves)
  const base = SITE.replace(/\/$/,'');
  const STORY_PAGES = [
    ['about', base+'/pages/about'],
    ['story', base+'/pages/our-story'],
    ['faq',   base+'/pages/faq'],
  ];
  for(const [name,url] of STORY_PAGES){
    try{ await p.goto(url,{waitUntil:'networkidle2',timeout:45000});
      const ok = await p.evaluate(()=>document.body.innerText.length>300 && !/404|not found|page not found/i.test(document.title+document.body.innerText.slice(0,200)));
      if(ok){await sleep(1500);await clearAll(p);await shoot(p,name,true);} else {console.log('missing',name,url);}
    }catch(e){console.log(name,'skip',e.message);}
  }
  // If a path 404s, find the real link from the footer/nav and retry (adapt per brand):
  // const links = await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>({t:a.innerText.trim(),h:a.href})).filter(x=>/about|story|faq|founder/i.test(x.t)));

  // QUIZ / FUNNEL (bonus — set QUIZ_URL per brand if present, e.g. /pages/quiz)
  const QUIZ_URL = process.argv[4];
  if(QUIZ_URL){try{await p.goto(QUIZ_URL,{waitUntil:'networkidle2',timeout:60000});await sleep(2500);await clearAll(p);await shoot(p,'quiz_1',false);}catch(e){console.log('quiz skip',e.message);}}

  await b.close();
})();
