---
name: ad-compliance
title: Meta ad compliance check
description: The digest of Meta's Advertising Standards that the compliance check reads an ad against. 1 entry a policy, written from the pages kept as read under meta/ (pnpm compliance:policies refreshes them). A verdict, findings with the policy, where, what and the fix, and what passed. A reading of Meta's published standards, never Meta's decision.
---

# Meta ad compliance: the digest the check reads

Written from Meta's Advertising Standards (https://transparency.meta.com/policies/ad-standards/) and the Community Standards pages those policies defer to, read on 2026-10-12 and kept word for word under `meta/` (the list and the date are in `meta/index.json`; pages that could not be read, and the old addresses that are gone, are in `meta/MISSING.md`). Every entry below names the file it was written from. Nothing here is a rule Meta did not publish; where a page is thin, the entry says so.

The check reads 1 piece (the copy, a script, an image, a video) with what is known of the brand and the product, and answers with:

- a verdict: **ready to run** (nothing found that Meta's standards would stop), **fix first** (something to change or a restriction to set before it runs), or **likely rejected** (a prohibited policy is plainly breached, or a restriction cannot be met);
- findings, each with the policy's id and name, its page, a severity, where it is (the quoted words, the place in the picture, the second of the video), what the problem is in plain words, and the fix;
- what passed: the policies that matter for this kind of ad and were looked for and not found.

Severity: **would reject** for a breach of a policy marked *prohibits*, or of a *restricts* policy whose condition the creative itself breaks (a cure claim, a pinched-fat shot); **needs a restriction** when the ad can run once a condition is set outside the creative (18+ targeting, prior written permission, a licence, a country exclusion, a disclaimer field); **warning** when a line or a frame is close to a rule and a reviewer may read it either way.

Only what the ad shows or says is judged. Targeting, permissions, licences and the landing page cannot be seen from the piece: a finding that depends on them says so and names what to check, and such a finding is never "would reject" on its own.

## What matters most for a D2C e-commerce ad

Read these first; most findings on a supplement, food, cosmetic or household brand fall under them.

1. **health-wellness**: supplements, weight products and cosmetics run to 18+ only; no put-down of anyone's looks, no pinched fat, no cure claim for a listed disease, no sensational or timed result without a qualifier; a result shown must say how long it took.
2. **prohibited-commercial-practices**: the price, the discount, "free", the delivery and the refund terms must be what the shop charges and does; no endorsement a person or brand did not give; a subscription says its terms before the sale.
3. **privacy-violations-personal-attributes**: the ad describes the product and who it is for, never what the viewer is ("Do you have diabetes?", "Are you overweight?", "Tired of your acne?" are the breach; "New treatment available", "A cream for acne-prone skin" are the fix).
4. **suicide-selfinjury-eating-disorders**: no before-and-after weight pictures that are not about the product, no bony or hollow-cheeked imagery, no admission of extreme weight-loss behaviour, no sad-mood hook; a before-and-after that is about the product is judged under health-wellness.
5. **adult-nudity-and-sexual-activity**, **adult-sexual-solicitation-and-sexually-explicit-language**: a crop on groin, buttocks or breasts, a suggestive pose or revealing clothing needs 18+; nudity, a digital cover-up, a sexual gesture or sound cannot run; sexual-health products run to 18+ when the focus is health, never pleasure.
6. **third-party-infringement**, **using-meta-intellectual-property-licenses**: another brand's logo, pack, character, footage or music needs its licence; a Meta logo is never the main thing, never redrawn, and never implies Meta's endorsement.
7. **profanity**: no swearing, however disguised ("$hit", "f*!%"), and no profane gesture; fully blurred or bleeped is fine if rare.
8. **misinformation**, **vaccine-discouragement**: no miracle-cure or fact-checked-false claim; nothing framed against vaccination.
9. **relevance**: the picture, the words and the landing page sell the same product, price and offer, and the brand is plainly the advertiser.
10. **drugs-pharmaceuticals**: a supplement presented as a drug, a prescription product, an over-the-counter medicine, CBD or anything cannabis-derived has its own conditions.

### Rules the brief named by their old page, and where they live now

Meta has folded several older policy pages into the pages above. The old addresses were tried on 2026-10-12 (`meta/MISSING.md`):

- *Unrealistic outcomes*: no page of its own any more (HTTP 404). The rule lives in **health-wellness** ("promises of specific outcomes within a set timeframe without disclaimers or qualifiers", "sensational language with exaggerated or extreme claims") and in **prohibited-commercial-practices** (unrealistic reward for minimal effort, guaranteed returns). A timed result in any other category has no published rule of its own: report it as a warning under relevance or prohibited-commercial-practices only where the claim is plainly not true to the product.
- *Personal health and appearance*: no page of its own (HTTP 404). The rule lives in **health-wellness** (statements of inferiority about appearance, the pinched-fat close-up, before-and-after transformations allowed for cosmetics to 18+), and the suicide and eating-disorders page still refers to it by that name for product before-and-afters.
- *Personal attributes*: now **privacy-violations-personal-attributes**.
- *Sensational content*: the address is sent on to **violent-graphic-content**.
- *Circumventing systems*: the address is sent on to **account-integrity**; the rules about cloaking and getting round a rejection are in **spam** and **inauthentic-behavior**.
- *Non-functional landing page*: no page any more (HTTP 404). The digest has no source for a landing page that does not load; the nearest published rule is **relevance** (the landing page must sell what the ad sells) and **spam** (deceptive links, pop-ups, redirects).
- *Low quality or disruptive content*: no page any more (HTTP 404). The only published lines are in **video-ads** (no overly disruptive tactics such as flashing screens) and the introduction's note that lower-quality ads which do not breach a policy may see impacted performance. The digest has no source for a rule on quality beyond that.
- *Grammar and profanity*: now **profanity**. The digest has no source for a rule on grammar, spelling or capitalisation: report none.

## Deceptive content

### prohibited-commercial-practices — Prohibited Commercial Practices (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/deceptive-content/prohibited-commercial-practices/
- Source: meta/prohibited-commercial-practices.md, meta/cs-prohibited-commercial-practices.md
- Rule: Ads must not use deceptive tactics to mislead people or businesses for commercial or financial gain, such as deceptive pricing, unauthorized endorsements and guaranteed investment returns. The Community Standard lists what counts: brand-bait (falsely claiming to represent an established business) and celebrity-bait (falsely using a public figure's name, likeness or imagery), get-rich-quick offers of unrealistic reward for minimal effort, investment offers with guaranteed, risk-free or quick returns, false giveaways that only ask for personal or financial information, and false job, loan, insurance, debt-relief, charity and advance-fee offers. Meta also enforces on practices that draw persistent negative feedback: misleading or unreasonable pricing, non-delivery, product misrepresentation (the product materially differs from what was advertised), unauthorized charges, not honoring stated refund or return policies, deceptive subscriptions (recurring plans without clear disclosure of terms) and links that look like legitimate commercial sites but lead to scam sites. Content that condemns, raises awareness of or educates about scams is allowed if it does not reveal sensitive information or promote them.
- Look for: In the copy and on the picture, a price, discount or "free" offer that is not what the landing page charges, a guaranteed or risk-free return, a reward for no effort, or a claim that a brand, celebrity or public figure endorses or made the product without any sign that they did. On the landing page, a subscription or recurring charge whose terms are not stated plainly before purchase, a product that differs from the ad in quality or kind, refund terms that contradict the ad, or a destination that is not the business the ad names. Any ad that speaks as another company or uses a public figure's face or name to bait a click.
- Fix: Remove the false endorsement, guarantee or bait and state the real price, terms, delivery and refund policy plainly in the ad and on the landing page; if a subscription is involved, disclose its terms clearly before the sale.

## Restricted goods and services

### health-wellness — Health and Wellness (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/
- Source: meta/health-wellness.md
- Rule: Ads for dietary, health, weight loss or weight gain products and services, and for cosmetic products, procedures or surgeries, must be targeted to people 18 or older; ads for general wellbeing products such as fitness equipment and health clubs, general food and protein products, non-permanent cosmetics such as creams, makeup and hair products, and dental products such as teeth whitening are exempt from the age rule. Ads can't contain statements of inferiority about physical appearance, a close-up pinching fat, claims that results come solely from a wearable product, skin whitening or bleaching products that cause permanent skin colour change, or claims (even from health professionals) to cure, heal or eliminate diabetes, herpes, thyroid, psoriasis, Ebola, cancer, autism, Alzheimer's, Parkinson's, ALS or HIV, though treating or managing symptoms is allowed. Ads can't use clickbait in a health or weight context, such as sensational language with exaggerated or extreme claims, or promises of a specific outcome within a set timeframe without disclaimers or qualifiers. With 18+ targeting, ads can show people using a supplement or pill and its impact if they clearly indicate the time taken to see results, and can show before-and-after transformations for cosmetic products, procedures and surgeries; sexual arousal products, adult sexual services and genital procedures for sexual pleasure are banned, while sexual and reproductive health products (erectile dysfunction, menopause, contraception, lube, fertility, abortion consultation) are allowed to 18+ when the focus is on health, not pleasure.
- Look for: In the image or video, a hand pinching belly fat, a close-up on a "problem" body part, a before-and-after for weight loss without a timeframe, or a bleached-skin result; in the copy, "ugly", "flabby", "embarrassing" or any put-down of looks or hygiene, "cures diabetes", "reverses Alzheimer's" or another listed disease, "lose 10 kg in 7 days" without a qualifier, "melts fat while you sleep", or results credited to a belt, band or other wearable alone. On the landing page, the same claims, a sex toy or pleasure-enhancement product, or a cosmetic procedure sold to an audience that includes under-18s. Check whether the ad set targets 18+.
- Fix: Set 18+ targeting for supplements, weight products and cosmetic procedures; cut the appearance put-down, the pinched-fat shot, the listed-disease cure claim and the timed-result promise, or reword the result as a managed symptom with the time taken to see it stated and a qualifier added; for a prescription weight loss drug, follow the Drugs and Pharmaceuticals policy instead.

### drugs-pharmaceuticals — Drugs and Pharmaceuticals (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/drugs-pharmaceuticals/
- Source: meta/drugs-pharmaceuticals.md
- Rule: Ads can't promote the sale or use of illicit or recreational drugs, or other unsafe substances, products or supplements as determined by Meta at its sole discretion, encourage their consumption, promote drug paraphernalia such as bongs, rolling papers and vaporizers, or sell merchandise depicting high-risk drugs. Prescription drugs may be promoted only by advertisers certified with LegitScript (or passed through Meta's internal review for manufacturers) with Meta's authorization, a disclaimer to consult a licensed health professional or obtain a valid prescription, and targeting limited to people 18 or older in the United States, Canada or New Zealand where they are certified. Over-the-counter medicines such as anti-inflammatories, allergy medication and antiseptics may be sold only to people 18 or older and must comply with local laws, industry codes, licences and approvals. THC and psychoactive cannabis products are banned; CBD needs LegitScript certification and written authorization, can only be sold in the United States to people 18 or older and must not claim to treat, cure, prevent, mitigate or diagnose a disease or medical condition; hemp products without CBD or over 0.3% THC may be sold in Canada, Mexico and the United States without authorization.
- Look for: In the image or video, pills, powders, cannabis leaves, bongs, vape pens, a prescription product or a supplement presented as a drug; in the copy, a sale of or encouragement to take a recreational or unsafe substance, a prescription medicine name or a weight loss drug that needs a prescription, an OTC medicine, CBD, or any "treats", "cures", "prevents" claim on a cannabinoid product. On the landing page, an online pharmacy or telehealth checkout, a THC product, CBD sold outside the US or without a disclaimer. Check age targeting (18+), country targeting and LegitScript or Meta authorization.
- Fix: Illicit drugs, paraphernalia and THC products: remove the product from the ad. Prescription drugs and CBD: get LegitScript certification and Meta's authorization, add the consult-a-professional or prescription disclaimer, restrict to the eligible countries and 18+, and strip disease claims from CBD; OTC medicines: set 18+ targeting and comply with local law.

### alcohol — Alcohol (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/alcohol/
- Source: meta/alcohol.md
- Rule: Ads that promote or reference alcohol must comply with local laws and industry codes and must not be targeted to people under 18. Promoting alcohol includes venues or events that depend on alcohol sales, availability of alcohol sales, alcohol brands or logos, consumption of alcoholic beverages and recipes for alcoholic drinks. Alcohol ads cannot run in 17 listed countries or regions (Afghanistan, Bangladesh, Brunei, Egypt, Gambia, parts of India, Kuwait, Libya, Lithuania, Nepal, Norway, Pakistan, Russia, Saudi Arabia, Thailand, Turkey, United Arab Emirates, Yemen), and a higher minimum age applies in others (for example 21 in the United States, 25 in Sweden, 19 in Canada and Korea, 20 in Japan). News, documentary, educational or PSA context, and non-alcoholic products or alcohol accessories that do not depict alcohol or its consumption, are allowed.
- Look for: In the image or video, a bottle, can, glass, brand or logo of an alcoholic drink, or someone drinking; in the copy, an invitation to a bar or event, a drink recipe, a sale or a brand name; on the landing page, alcohol for sale. Then check the ad set: audience under the minimum age for the country, or a country on the no-alcohol list.
- Fix: Keep the ad and set age targeting to 18 or the country's minimum and exclude the countries where alcohol ads cannot run; for a non-alcoholic product or accessory, take alcohol and drinking out of the picture and the words.

### financial-services — Financial and Insurance Products and Services (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/
- Source: meta/financial-services.md
- Rule: Ads promoting credit cards, loans or insurance services must be targeted to people 18 or older, provide disclosures required by law, and must not directly request personally identifiable or financial information such as bank account, credit or debit card or routing numbers. Advertisers may need to verify their identity and show they are licensed by the regulator of the country they target, for insurance, mortgages, loans, investment products and credit card applications. Ads can't promote payday loans, paycheck advances, bail bonds, short-term loans of 90 days or less, misleading student loan consolidation, forgiveness or refinancing offers, binary options, contract-for-difference trading, initial coin offerings, or penny and bidding-fee auctions; for the United States, investment ads can't suggest contacting the advertiser by direct messaging. Brand ads for banks or insurers, news articles, education about loans, and ads that only mention a product without a way to obtain it are exempt.
- Look for: In the copy or video, an offer of fast cash, a loan due by payday or within 90 days, bail bonds, "get your student loans forgiven", binary options, CFDs, an ICO, a bid-to-win auction, or "DM me to invest"; a form in the ad or on the landing page asking for a card number, bank account, routing number or other identifying details; overstated benefits with terms not disclosed up front. Then check 18+ targeting and whether the advertiser is licensed where the ad runs.
- Fix: Remove the prohibited loan or instrument; for credit cards, insurance and long-term loans set 18+ targeting, add the disclosures the law requires, take any request for personal or financial details out of the ad and landing page, and get the licence and Meta's verification where the country requires it.

### cryptocurrency-products-and-services — Cryptocurrency Products and Services (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/cryptocurrency-products-and-services/
- Source: meta/cryptocurrency-products-and-services.md
- Rule: Ads may not promote cryptocurrency trading platforms, software and related services and products that enable monetisation, reselling, swapping or staking of cryptocurrencies without prior written permission from Meta. Permission needs a recognized regulatory licence or registration from a listed country (for example FCA in the UK, FinCEN MSB or BitLicense in the USA, BaFin in Germany, MAS in Singapore). Exchanges, borrowing and lending, wallets that buy, sell, swap or stake, mining software and crypto investment solicitation (including affiliate and aggregator sites) all need permission. Tax services, events, education and news, NFTs and other non-currency blockchain products, storage-only wallets and mining hardware do not.
- Look for: Copy, video or landing page that offers to trade, exchange, lend, stake or invest in a cryptocurrency, an exchange or trading app name, a sign-up to earn interest on coins, or an affiliate page linking to crypto investment offers. Check whether the advertiser has written permission from Meta.
- Fix: Get the regulatory licence and Meta's written permission before running; without it, limit the ad to education, news, NFTs, a storage-only wallet or mining hardware with no trading, swapping, staking or investment offer.

### gambling-games — Online Gambling and Games (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/gambling-games/
- Source: meta/gambling-games.md
- Rule: Online gambling and gaming is any product or service where anything of monetary value is part of both the method of entry and the prize; ads for it are only allowed once the ad account has Meta's authorization, with evidence the activity is licensed or lawful in the territory targeted. This covers betting, lotteries, raffles, casino games, fantasy sports, bingo, poker, skill game tournaments and sweepstakes, games needing purchases to keep playing or win prizes of monetary value, games with a trial that then needs payment, and landing pages that promote online gambling such as affiliate sites. Ads may not target people under 18 or 19 listed unsupported markets (including India, Indonesia, Korea, Pakistan, Philippines, Saudi Arabia, Singapore, Thailand, Vietnam); social casino games with no monetary prize can run to 18+ in supported markets without authorization. Brick-and-mortar casinos, state lotteries run by the advertiser, prize promotions at the usual retail price and entirely free-to-play games that do not simulate gambling are allowed without permission.
- Look for: In the image or video, slots, cards, roulette, a betting slip, odds or a jackpot; in the copy, "win cash", "bet", "deposit bonus", a sweepstake or raffle with an entry fee, or a coin prize that can be sold; a landing page that is a casino, sportsbook, affiliate list or a game that charges to continue. Check account authorization, 18+ targeting and the unsupported market list.
- Fix: Get Meta's authorization for the ad account and declare each jurisdiction, set 18+ targeting and exclude the unsupported markets; or remove the monetary entry or prize so the game is free to play, or keep the offer to an offline venue.

### dating-ads — Dating Ads (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/dating-ads/
- Source: meta/dating-ads.md
- Rule: Ads for dating services, matchmaking and dating facilitation such as profile management or aggregator services are only allowed with prior written permission from Meta, and must target people 18 or older. Dating ads can't promote dating based on monetary or financial transactions such as mail-order brides, offers to facilitate affairs or infidelity, or connections with fictitious groups or individuals, and their creatives can't include sexually suggestive emphasis. Literature or entertainment about relationships and social apps without matchmaking elements, such as meetup apps, are allowed.
- Look for: In the image or video, a sexually suggestive pose or framing, or a line implying "singles near you" who may not be real; in the copy, mail-order brides, paying for a partner, discreet affairs or cheating; a landing page that is a dating or matchmaking service. Check written permission and an 18+ audience.
- Fix: Get Meta's written permission and set the audience to 18+; remove sexually suggestive emphasis, affair or infidelity offers, paid-partner language and any hint of fictitious people.

### drug-alcohol-addiction-treatment — Drug and Alcohol Addiction Treatment (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/drug-alcohol-addiction-treatment/
- Source: meta/drug-alcohol-addiction-treatment.md
- Rule: Advertisers who run addiction treatment ads targeting people in the United States must be certified with LegitScript and have written permission from Meta. This covers in-person and online addiction treatment, addiction hotlines, mutual support groups and websites that give information about treatment. Physical rehabilitation, such as kinesthesiology, does not need permission.
- Look for: Copy, video or landing page that offers drug or alcohol rehab, detox, a recovery programme, a recovery app, a hotline or a support group, with a US audience. Check LegitScript certification and Meta's written permission.
- Fix: Get LegitScript certification and Meta's permission before the ad runs to US audiences; otherwise take the treatment offer out.

### tobacco-related-products — Tobacco and Related Products (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/tobacco-related-products/
- Source: meta/tobacco-related-products.md
- Rule: Ads must not promote the sale or use of tobacco or nicotine products and related paraphernalia: cigarettes, cigars, chewing and pipe tobacco, e-cigarettes, vaporizers, heated tobacco devices, vape pens and cartridges, nicotine pouches, pipes, rolling papers, hookahs and filters, hookah lounges and cigar bars. Ads must not promote products that simulate smoking even without nicotine, such as vitamin or wellness vapes; must not depict tobacco use as the primary focus, promote tobacco brands, or promote venues or events where tobacco is offered. Only cessation products approved by the World Health Organization or the U.S. Food and Drug Administration may be promoted, to people 18 or older; anti-smoking campaigns, counselling and rehabilitation programmes are allowed, and vapes are not allowed in any context.
- Look for: In the image or video, a cigarette, cigar, vape, hookah pipe, pouch tin or tobacco brand, or someone smoking as the main subject; in the copy, "buy cigarettes", "vape", "e-cigarette", "nicotine" or a hookah lounge; a landing page that sells any of these or a vitamin vape.
- Fix: Remove the tobacco or vape product and imagery; an ad can only promote a WHO- or FDA-approved cessation product to an 18+ audience, or an anti-smoking message.

### weapons-ammunitions-explosives — Weapons, Ammunition or Explosives (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/weapons-ammunitions-explosives/
- Source: meta/weapons-ammunitions-explosives.md
- Rule: Ads must not promote the sale or use of weapons, ammunition or explosives, including weapon modification accessories: firearms and parts, paintball and BB guns, pepper spray, non-culinary knives, blades and spears, tasers, nunchucks, batons, self-defence weapons, silencers, optics and flashlights for weapons, fireworks, reviews of firearms or bladed items, the pure depiction of weapons with no discussion, and 3D-printing or CAM instructions for firearms. Items not directly sold as part of a weapon may be promoted to people 18 or older: shooting targets, clay throwers, protective vests, holsters, magazine holders, military clothing, gun cases, safes, locks, slings and mounts. Safety courses, right-to-bear-arms content, informative content, toy weapons, and weapons shown in a non-violent military, police, sporting, hunting or fictional context, or fireworks in a celebratory context, are allowed.
- Look for: In the image or video, a gun, knife, taser, pepper spray, silencer, scope or fireworks shown for sale or with no context; in the copy, "buy", "shop", "best blade", a firearm review or a link to print a gun part; on the landing page, a weapons shop, ammunition, a self-defence weapon or a weapon accessory. For holsters, cases, targets or military clothing, check the audience is 18+.
- Fix: Remove the weapon, ammunition, explosive or modification accessory from the ad and the landing page; for permitted gear such as holsters, safes, targets or vests, set 18+ targeting and show any weapon only in a non-violent context with nothing offered for sale.

### hazardous-goods-materials — Hazardous Goods and Materials (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/hazardous-goods-materials/
- Source: meta/hazardous-goods-materials.md
- Rule: Ads must not promote the sale of hazardous goods and materials. The page gives no examples or exceptions; it is 2 sentences long.
- Look for: Copy, image, video or landing page selling dangerous chemicals, toxic, flammable, corrosive or radioactive substances, or similar hazardous materials.
- Fix: Remove the hazardous item from the ad and the landing page; there is no permission route.

### commercial-exploitation-of-crises-and-controversial-events — Commercial Exploitation of Crises and Controversial Events (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/commercial-exploitation-of-crises-and-controversial-events/
- Source: meta/commercial-exploitation-of-crises-and-controversial-events.md
- Rule: Ads must not exploit crises or controversial events, as identified by Meta, for commercial purposes; these are events that are the subject of significant public attention, such as natural disasters and medical emergencies. Ads can't promote crisis-related content for commercial benefit, offer crisis-related products for sale or as giveaways, or exploit a crisis to promote medical goods or vital supplies, including products associated with abuse or shortages during a crisis, or language that implies urgency or may contribute to panic or fear. Selling a product of historical reference, such as a history book or documentary, and using crisis content in a news article are allowed.
- Look for: Copy or a landing page that names a current disaster, outbreak, war or scandal to sell something, a "stock up before it runs out" or panic line, a product tied to a shortage; an image or video of the disaster, the emergency or its victims used as the hook.
- Fix: Remove the reference to the event and the urgency or fear language; sell the product on its own merits, or keep the event only in a news or historical context.

### live-endangered-nonendangered-animals — Sale of Non-Endangered Animals and Endangered Species (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/live-endangered-nonendangered-animals/
- Source: meta/live-endangered-nonendangered-animals.md
- Rule: Ads must not promote, donate or gift products derived from threatened, extinct or endangered species, wildlife or plants, encourage poaching, or give instructions for making or using products from such species or their parts. Ads must not promote peer-to-peer sales or trade of live non-endangered animals, including ambiguous contexts where the nature of the sale is unclear. Live non-endangered animals may be offered for donation, rehoming or adoption, by a legitimate business such as a retailer, breeder, auction, shelter or rehoming service, as livestock or a religious offering, as a reward for a lost pet, or as animal products for human consumption such as fish, eggs and unpasteurized dairy.
- Look for: In the image or video, ivory, fur, horn, shell, exotic skins or a rare plant for sale, or a puppy or kitten with a price; in the copy, "for sale" on a live animal with no business behind it, or a tip on sourcing or working a protected species; on the landing page, a private listing rather than a shop, breeder or shelter.
- Fix: Remove any product from a threatened or endangered species; for live animals, make the seller a legitimate business or shelter clear in the ad and on the landing page, or frame the offer as adoption or rehoming.

### bodily-parts-and-fluid — Sale of Human Body Parts and Bodily Fluids (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/bodily-parts-and-fluid/
- Source: meta/bodily-parts-and-fluid.md
- Rule: Ads must not promote the sale of human body parts or fluids. The only exception is a donation of human fluids such as semen or blood plasma. The page says nothing more.
- Look for: Copy or a landing page offering human organs, tissue, hair, blood, plasma, semen, breast milk or similar for money, or seeking to buy them; a picture of such items with a price.
- Fix: Remove the sale; an ad can only ask for a donation of fluids such as blood plasma or semen, with no payment offered.

### historical-artifacts — Historical Artifacts (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/historical-artifacts/
- Source: meta/historical-artifacts.md
- Rule: Ads must not promote the sale of historic artifacts. The page gives no definition, examples or exceptions; it is 2 sentences long.
- Look for: Copy, image, video or landing page offering antiquities, archaeological finds, relics or other historic artifacts for sale.
- Fix: Remove the artifact sale from the ad and the landing page; there is no permission route.

### prohibited-documents-and-financial-services — Prohibited Documents and Financial Services (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/prohibited-documents-and-financial-services/
- Source: meta/prohibited-documents-and-financial-services.md
- Rule: Ads must not promote content that facilitates or offers the solicitation, creation, sale, purchase or trade of fake, forged or stolen documents, goods or services; devices or subscriptions that are manipulated or used in an unauthorized manner; personally identifiable or other personal information; products that enable cheating; money muling; or money laundering. The page is 1 sentence and points to the Community Standards for detail.
- Look for: Copy or a landing page offering fake IDs, diplomas or certificates, counterfeit or stolen goods, jailbroken or shared streaming subscriptions, lists of personal data, exam or essay cheating services, or an offer to move money through someone's account.
- Fix: Remove the offer from the ad and the landing page; there is no permission route.

## Objectionable content

### privacy-violations-personal-attributes — Privacy Violations and Personal Attributes (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/
- Source: meta/privacy-violations-personal-attributes.md, meta/cs-privacy-violations.md
- Rule: Ads must not share or ask for private information about users, and must not assert or imply personal attributes: direct or indirect assertions about a person's race, ethnicity, religion, beliefs, age, sexual orientation or practices, gender identity, disability, physical or mental health (including medical conditions), vulnerable financial status, voting status, trade union membership, criminal record or name. Ads can't share or ask for the attributes of a user or their family, imply the advertiser knows them, imply knowledge of their financial or medical information, or imply knowledge of personally identifiable information such as their name. Ads can broadly reference attributes not on the list ("New Yorker"), make a passing reference to gender or an age range, name celebrities or fictional characters, use "you/your" without a personal attribute, and run public service announcements about health issues as long as they do not assert that someone has the condition. The Community Standard also removes content sharing or soliciting identification numbers, government IDs, personal contact details, private addresses, medical records and financial information, and says ads that exploit personal hardships or make negative characterizations are removed.
- Look for: In the copy, headline or voice-over, a question or statement that pins an attribute on the viewer: "Are you overweight?", "Do you have diabetes?", "Depression getting you down?", "Are you bankrupt?", "Meet other seniors", "Ready to upgrade your skin to look younger?", or a first name used as if it is the viewer's. Any form in the ad or on the landing page that asks for an ID number, driver's licence number, medical details or financial details beyond what a sale needs. The page's own allowed versions describe the product instead: "New diabetes treatment available", "Our new lotion and creams fight wrinkles like never before!", "Date Christian singles!".
- Fix: Reword the ad to describe the product or service and who it is for, not what the viewer is ("Bulimia counseling available" rather than "Do you have bulimia?"); drop the "you" that attaches to an attribute and remove any request for private information.

### adult-nudity-and-sexual-activity — Adult Nudity and Sexual Activity (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/adult-nudity-and-sexual-activity/
- Source: meta/adult-nudity-and-sexual-activity.md
- Rule: Ads must not contain imagery depicting nudity, sexual activity, people in explicit or sexually suggestive positions, or sexually suggestive activities. Ads can't depict nudity or near nudity (such as nudity covered only by a digital overlay) even where the Community Standards would permit it, sexual activity, gestures that signify genitalia, masturbation, oral sex or intercourse, simulated sex, sexual dancing or kissing with visible tongue, logos, screenshots or clips of known pornographic websites, or audio of sexual activity. Ads may run only to people over 18 when they show female nipples in medical, health or breastfeeding contexts, photorealistic or digital imagery focused on body parts such as groin, buttock or female breasts, people in sexually suggestive poses, revealing clothing or stripping, or people sexually touching or moving commonly sexualized body parts. The page makes certain exceptions for art and health.
- Look for: In the image or video, bare skin or a digital overlay standing in for nudity, a crop that centres on groin, buttocks or breasts, a suggestive pose, stripping, revealing clothing, simulated sex or a sexual gesture; in the audio, sounds of sexual activity; anywhere, a logo or clip of a pornographic site. On the landing page, the same imagery.
- Fix: Remove or re-crop the nude, near-nude or sexual imagery and cut the audio; where the content is body-part focus, suggestive poses or revealing clothing, target the ad to people aged 18 and over.

### adult-sexual-solicitation-and-sexually-explicit-language — Adult Sexual Solicitation and Sexually Explicit Language (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/adult-sexual-solicitation-and-sexually-explicit-language/
- Source: meta/adult-sexual-solicitation-and-sexually-explicit-language.md, meta/cs-sexual-solicitation.md
- Rule: Ads must not contain content that facilitates sexual encounters or commercial sexual services between adults, or that asks for or offers pornographic content; the Community Standard covers offers, asks or contact methods for prostitution or sexual encounters (escort services, erotic massage, sex chats, fetish services, sharing nudes), slang for prostitution with a price, availability or contact signal, links or usernames of pornographic sites, and explicit or graphic language about genitals, states of arousal or sexual encounters. Ads also can't discuss sexual practices or experiences, even without solicitation. Only when targeting people aged 18 or older may an ad carry usernames, links or logos of adult subscription websites, sexually explicit language in satirical or humorous contexts, or sexually suggestive language referring to sexual encounters. Ads must also comply with the Health and Wellness standard.
- Look for: In the copy, headline or voice-over, an offer or request for a sexual encounter, a price or contact detail beside sexual slang, graphic words about genitals or arousal, or talk of sexual practices and experiences; in the image or video, an adult-site username, link or logo. On the landing page, an escort, sex-chat or pornographic service.
- Fix: Remove the solicitation, contact details and explicit description; if the ad keeps adult-site links, sexual humour or suggestive language about encounters, target it to people aged 18 and over.

### adult-sexual-exploitation — Adult Sexual Exploitation (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/adult-sexual-exploitation/
- Source: meta/adult-sexual-exploitation.md
- Rule: Ads must not display, advocate for or coordinate sexual acts with non-consenting parties. Beyond the Community Standard, ads can't contain narratives or statements that describe non-consensual sexual touching with details that go beyond merely naming or mentioning the act, even in contexts the Community Standards allow. The page is thin; it gives no further examples.
- Look for: In the copy, voice-over or on-screen text, any description of non-consensual sexual contact in detail, even in an awareness or condemnation context; in the image or video, any depiction of a sexual act with a non-consenting person. On the landing page, the same.
- Fix: Remove the depiction, and cut any description of non-consensual sexual touching back to a mention at most.

### profanity — Profanity (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/profanity/
- Source: meta/profanity.md
- Rule: Ads must not contain profanity. Ads can't include profanity or obscene language even when it is obscure, misspelled or vague, such as through symbols or emojis, or profane gestures, including ones made by photo editing. The page also says ads with profane and sexual language in any context beyond the allowed cases should target users over 18, so the page states both a ban and an age condition. Ads can include fully blurred profanity, bleeped or covered audio as long as it is not used excessively, and acronyms that stand for profane language as long as the acronym itself does not spell a profane word.
- Look for: In the copy and on-screen text, swear words written plainly or disguised ("$hit", "f*!%ing", "Tired of shitty cell service?"), profane emojis such as the middle finger or swearing face; in the image or video, a profane gesture, including one added by editing; in the audio, unbleeped swearing. The page's examples also list letters replaced by symbols, odd spacing and accented characters as non-compliant.
- Fix: Remove the swear word or gesture, or fully blur it in text and bleep it in audio without overusing it; where profane or sexual language remains, target the ad to people aged 18 and over.

### violent-graphic-content — Violent and Graphic Content (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/violent-graphic-content/
- Source: meta/violent-graphic-content.md
- Rule: Ads must not contain shocking, sensational or excessively violent content. Content the Community Standards remove, restrict or put behind a warning screen, or that is deemed sensitive or not recommended, is not eligible to run in ads. Ads can't include imagery of people showing visible innards such as exposed organs, bones or muscle tissue, even in health contexts like cigarette-pack warnings, or firearms, bladed weapons or explosives pointed directly at the viewer; the same applies to fictional imagery that looks like a photograph or video of a real person, unless the image is from a motion picture poster.
- Look for: In the image, video or thumbnail, blood, wounds, exposed organs or bone, a gun, knife or explosive aimed at the camera, or gruesome before pictures in a health or injury ad; the same in a photorealistic render or AI image. On the landing page, the same imagery above the fold.
- Fix: Remove or replace the gruesome frame and turn any weapon away from the viewer; keep health warnings to words rather than innards.

### suicide-selfinjury-eating-disorders — Suicide, Self-Injury, and Eating Disorders (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/suicide-selfinjury-eating-disorders/
- Source: meta/suicide-selfinjury-eating-disorders.md, meta/cs-suicide-self-injury.md
- Rule: Ads must not encourage suicide, self-injury or eating disorders, including fictional content such as memes or illustrations and any graphic content regardless of context, must not mock victims or survivors, and must not show real-time depictions. Ads also can't show euthanasia or assisted suicide in a medical setting, contain written or verbal admissions of suicide, self-injury or eating disorders, vague potentially suicidal statements (memes or stock imagery about sad mood or depression, death as an escape), healed cuts or other self-injury imagery, ribs, collar bones, thigh gaps, hips, concave stomach, protruding spine or scapula, visible bones in arms or legs or hollow cheeks in a recovery context, narratives describing suicide beyond naming it, admissions of extreme weight loss behaviour, or side-by-side before-and-after weight loss or gain imagery not related to the use of a product or service. Before-and-after imagery tied to a product falls under what the page calls the Personal Health and Appearance policy (now part of Health and Wellness). The Community Standard also removes instructions for extreme weight loss or restrictive dieting when paired with eating-disorder terms.
- Look for: In the copy or script, a testimonial that admits to self-harm, a suicide attempt, an eating disorder or extreme weight loss, dark or depressive mood lines used as a hook, or any talk of death as relief; in the image or video, scars, healed cuts, protruding bones, hollow cheeks, or side-by-side weight before-and-afters with no product behind them. On the landing page, the same content or dieting instructions.
- Fix: Remove the admission, the depressive framing and the self-injury or bony imagery; drop a before-and-after that is not about the product, and judge a product-related before-and-after under health-wellness.

### bullying-harassment — Bullying and Harassment (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/bullying-harassment/
- Source: meta/bullying-harassment.md
- Rule: Ads must not contain attacks that are meant to degrade or shame public or private individuals. Anyone under 18 gets heightened protection regardless of their user status. The page is thin; it gives no examples beyond this.
- Look for: In the copy, image or video, a named or recognisable person, including a competitor's founder, a customer or a public figure, mocked, insulted or shamed; particular care with anyone who appears to be a minor. On the landing page, the same.
- Fix: Remove the attack on the person, or reword the ad so it describes the product rather than degrading anyone.

## Unacceptable content

### community-standards — Community Standards (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/community-standards/
- Source: meta/community-standards.md
- Rule: Ads must not violate the Community Standards, which serve as the baseline for the ads policies. Content must comply with the Community Standards and, on Instagram, the Instagram Community Guidelines to be eligible to run in an ad. Ads can't contain content that has been marked as disturbing or sensitive under the Community Standards. The page is thin; it points to the Community Standards themselves for what is forbidden.
- Look for: Anything in the image, video, copy or landing page that a Community Standard would remove or put behind a warning screen (the page names "disturbing or sensitive" content as the ads-specific line); each specific standard is covered by its own digest entry.
- Fix: Remove the disturbing or sensitive element; an ad cannot carry content that organic posts would only get with a warning screen.

### misinformation — Misinformation (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/misinformation/
- Source: meta/misinformation.md, meta/cs-misinformation.md
- Rule: Ads can't include content debunked by third-party fact checkers, and advertisers that repeatedly post information deemed false may have restrictions placed on their ability to advertise. Ads also can't include misinformation that violates the Community Standard, which removes misinformation or unverifiable rumors likely to contribute to imminent violence or physical harm, harmful health misinformation (false vaccine claims, misinformation during public health emergencies, and harmful miracle cures such as bleach, disinfectant, black salve or caustic soda), and voter or census interference (false dates, locations, methods, eligibility, or whether a candidate is running). Photorealistic images or video, or realistic-sounding audio, that was digitally created or altered and creates a particularly high risk of materially deceiving the public on a matter of public importance may be rejected as an advertisement.
- Look for: Copy, on-screen text, voice-over or landing-page claims that a fact checker has rated false; health claims such as a cure for a disease, a treatment with no legitimate health use, or any of the listed vaccine claims; anything about how, when or where to vote; AI-made or altered footage or audio that looks real and bears on a public matter.
- Fix: Remove or reword the debunked or harmful claim and take it off the landing page; cut the altered media or make it clearly non-realistic; the page gives no permission or targeting route.

### vaccine-discouragement — Vaccine Discouragement (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/vaccine-discouragement/
- Source: meta/vaccine-discouragement.md
- Rule: Ads must not discourage people from vaccination or advocate against vaccines. Ads can't portray vaccination as useless or ineffective, advise people not to get vaccinated, claim vaccination is unsafe or will cause death or injury (including implied permanent side effects unless proven), contain information inconsistent with health authorities' guidance, describe the diseases vaccines combat as non-harmful to discourage vaccination, promote limiting access to vaccines, cast doubt on a health provider to discourage vaccination, discuss vaccine ingredients to discourage vaccination, describe vaccines as tools for inserting chips or collecting biometric data, or challenge legislation with delegitimizing language such as saying vaccines are harmful. Ads can discuss vaccine legislation, bills and mandates, and the safety of vaccine trials as long as they don't equate trial safety with the safety of a rolled-out vaccine.
- Look for: Copy, voice-over, captions or landing-page text that tells people not to vaccinate, calls vaccines unsafe, useless or toxic, lists ingredients to scare, claims chips or biometric tracking, or says the disease is harmless; images or video of injury presented as a vaccine result; a supplement or "natural immunity" pitch framed against vaccination.
- Fix: Remove the anti-vaccine claim and any ingredient or side-effect framing; keep only discussion of laws, mandates or trial safety stated neutrally, and never as a reason to skip a vaccine.

### discriminatory-practices — Discriminatory Practices (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/discriminatory-practices/
- Source: meta/discriminatory-practices.md
- Rule: Ads must not discriminate or encourage discrimination against people based on personal attributes such as race, ethnicity, color, national origin, religion, age, sex, sexual orientation, gender identity, family status, disability, medical or genetic condition. Advertisers may not use audience selection tools to wrongfully target or wrongfully exclude specific groups, and may not include discriminatory content in their ads. Advertisers must comply with laws that prohibit discrimination in, for example, offers of housing, employment, and financial products and services. A US advertiser, or one targeting the US, Canada or certain parts of Europe, running financial products and services, housing or employment ads must self-identify as a Special Ad Category and run with approved targeting options.
- Look for: Copy or landing-page wording that offers or denies housing, a job, credit or a service to people of a given race, religion, age, sex, family status or disability, or says who is "not welcome"; images that signal the same preference; a housing, employment or credit ad set up without the Special Ad Category.
- Fix: Reword so the offer is open to everyone and remove any group preference from copy, picture and landing page; declare housing, employment and financial ads as a Special Ad Category with approved targeting.

### hateful-conduct — Hateful Conduct (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/hateful-conduct/
- Source: meta/hateful-conduct.md, meta/cs-hate-speech.md
- Rule: Ads must not attack people on the basis of protected characteristics: race, ethnicity, national origin, disability, religious affiliation, caste, sexual orientation, sex, gender identity and serious disease. Ads can't use slurs in any context, even those generally allowed in the Community Standards. Ads can't claim people are threats to the safety, health or survival of others based on their personal characteristics, or include insults, expressions of disgust or cursing based on immigration status. The Community Standard also removes dehumanizing comparisons (to animals, pathogens, subhumans), allegations of serious immorality or criminality, harmful stereotypes (Blackface, Holocaust denial), mockery of hate-crime victims or people with a disease, calls for exclusion or segregation, insults about character or mental capacity, and targeted cursing aimed at a protected group.
- Look for: In copy, captions or on-screen text, any slur, a comparison of a group to animals, insects, disease or "savages", a "No X allowed" line, a claim that a group is dangerous or criminal, or cursing at a group or at immigrants; in the image or video, Blackface, hate symbols or imagery that mocks a group; a landing page that carries the same.
- Fix: Remove the slur or attack line and any mocking imagery; the self-referential, condemning or satirical uses the Community Standard tolerates do not save an ad, since slurs are banned in ads in any context.

### coordinating-harm-and-promoting-crime — Coordinating Harm and Promoting Crime (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/coordinating-harm-and-promoting-crime/
- Source: meta/coordinating-harm-and-promoting-crime.md
- Rule: Ads must not facilitate, organize, promote or admit to certain criminal or harmful activities targeted at people, businesses, property or animals. Ads can't depict High-Risk Viral Challenge imagery, even in an awareness-raising or condemning context. Ads that depict, promote or encourage a mid-risk viral challenge, dangerous driving that could lead to life-threatening injury or death, or a dangerous stunt must target users above the age of 18, except where shared in fictional or professional settings.
- Look for: In the video or image, a viral challenge being performed, a car or bike driven dangerously, or a stunt that could seriously injure someone; in copy, a dare, a challenge name or a call to try it; whether the scene is clearly fictional or a professional setting.
- Fix: Cut high-risk challenge footage entirely; for mid-risk challenges, dangerous driving or stunts, set the audience to over 18 or reshoot in a clearly fictional or professional setting.

### dangerous-orgs-individuals — Dangerous Organizations and Individuals (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/dangerous-orgs-individuals/
- Source: meta/dangerous-orgs-individuals.md
- Rule: Ads must not contain praise, support or representation of individuals or groups designated by Meta as Dangerous Organizations and Individuals. This applies to any designated individual or organization in any tier of the Community Standard. The page is thin; it defers to the Community Standard for who is designated.
- Look for: A name, logo, flag, symbol, slogan, leader's face or quote belonging to a designated group or person in the image, video, copy or landing page, including uses that praise or merely represent them.
- Fix: Remove the reference, symbol or person from the ad and the landing page; there is no context exception stated on the ads page.

### human-exploitation — Human Exploitation (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/human-exploitation/
- Source: meta/human-exploitation.md
- Rule: Ads must not contain content that facilitates or coordinates the exploitation of humans, including human trafficking. Beyond the Community Standard, ads can't include content that recruits people as domestic helpers in private homes or for temporary marriages, even without an exchange of money or anything of value. Ads must also comply with the Illegal Products or Services and Adult Products or Services standards.
- Look for: Copy or a landing page that recruits maids, nannies or live-in domestic helpers for private homes, or offers or seeks a temporary marriage; images or video that present people as available to be hired into a home or married; any offer that reads as trafficking.
- Fix: Remove the recruitment or marriage offer from the ad and landing page; there is no stated permission route for domestic-helper or temporary-marriage recruitment.

### child-sexual-exploitation-abuse-nudity — Child Sexual Exploitation, Abuse, and Nudity (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/objectionable-content/child-sexual-exploitation-abuse-nudity/
- Source: meta/child-sexual-exploitation-abuse-nudity.md
- Rule: Ads must not contain content that sexually exploits or endangers children. Beyond the Community Standard, ads can't contain any child nudity, even nudity the Community Standards allow. Ads can't depict real or non-real non-sexual child abuse, even where organic content would get a warning screen, unless the imagery is from real-world art, cartoons, movies or video games. Apparent child exploitation is reported to NCMEC.
- Look for: In the image or video, any nudity of a child (including a baby or toddler shown unclothed) and any scene of a child being hurt or mistreated that is not clearly taken from art, a cartoon, a film or a game; in copy and the landing page, anything that sexualises or endangers a minor.
- Fix: Replace or crop the picture so the child is clothed and no abuse is shown; there is no age-targeting or permission route for this content.

### locally-illegal-products-services — Locally Illegal Content, Products, or Services (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/unacceptable-content/locally-illegal-products-services/
- Source: meta/locally-illegal-products-services.md
- Rule: Ads on Facebook and Instagram must not be unlawful. Ads reported by a government, a court order, non-governmental organizations or members of the public as violating local law may be removed. Meta may restrict such content locally, may globally remove ads reported as unlawful, and may globally remove content that violates local law when the product is subject to a recall. The page is thin; it does not list which products are illegal where.
- Look for: A product, service or claim in the image, copy or landing page that is illegal in a targeted country, or a product that has been recalled; the countries the ad is set to run in.
- Fix: Drop the countries where the product or claim is unlawful, or remove the unlawful product or claim; a recalled product cannot be advertised anywhere.

## Intellectual property

### third-party-infringement — Third-Party Intellectual Property Infringement (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/intellectual-property-infringement/third-party-infringement/
- Source: meta/third-party-infringement.md
- Rule: Ads may not contain content that violates the intellectual property rights of any third party, including copyright, trademark or other legal rights. This includes the promotion or sale of counterfeit goods: products that copy the trademark (name or logo) and/or distinctive features of another company's products to imitate a genuine product. If an ad contains music, the advertiser must secure the necessary licences for the sound recording and/or the musical composition. Ads may be rejected on a rights holder's report or on signs that the ad may infringe.
- Look for: In the image or video, another brand's logo, name, packaging or distinctive design on the product or in the frame, stock or film footage and characters the brand does not own, and a music track with no licence; in the copy, another company's trademark used as the product's name. On the landing page, counterfeit or look-alike goods.
- Fix: Remove the third-party logo, footage, character or music, or get and keep the licence or permission; replace the music with a licensed track.

### using-meta-intellectual-property-licenses — Using Meta Intellectual Property and Licenses (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/intellectual-property-infringement/Using-Meta-Intellectual-Property-Licenses/
- Source: meta/using-meta-intellectual-property-licenses.md, meta/cs-meta-intellectual-property.md
- Rule: Ads must not use Meta's intellectual property unlawfully, without Meta's prior written permission, or in a manner inconsistent with the Brand Resource Center. The Community Standard bars using Meta's copyrights or trademarks without written permission, making a Meta brand the most distinctive or prominent feature of the creative, modifying brand assets (design, colour, special effects, animation), implying an endorsement or partnership with Facebook, Instagram or WhatsApp, showing a product's user interface inaccurately, modified, in separate pieces or outside a relevant device, using marks confusingly similar to Meta's, and using music in a way that violates Meta's music licensing agreements. Use that Meta has permitted in writing or that follows the Brand Resource Center is allowed.
- Look for: In the image or video, a Facebook, Instagram, WhatsApp or Messenger logo that dominates the frame, is recoloured, animated or redrawn, a mocked-up app screen that does not match the real interface or floats outside a phone or desktop frame; in the copy, "Instagram's favourite", "as seen on Facebook" or any line implying Meta endorses or partners with the brand. On the landing page, the same logos and claims.
- Fix: Remove the Meta logo, UI mock-up or endorsement line, or use the asset exactly as the Brand Resource Center allows, unmodified and not the main feature; anything beyond that needs Meta's prior written permission.

## Format, targeting and account rules

### relevance — Relevance (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Ads must clearly represent the company, product, service or brand being advertised. All ad components, including any text, images or other media, must be relevant to the product or service being offered. The products and services promoted in an ad must match those promoted on the landing page.
- Look for: An image or video of something other than what is sold, a headline or copy about a different product or offer, a brand name or look that is not the advertiser's, or a landing page that sells a different product, price or offer than the ad shows.
- Fix: Replace the unrelated picture or copy with the actual product and brand, and make the landing page sell exactly what the ad promotes.

### video-ads — Video Ads (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Video ads and other dynamic ad types must comply with all Advertising and Community Standards. They must not use overly disruptive tactics, such as flashing screens. Ads for movie trailers, TV shows, video game trailers and similar content are only allowed with prior written permission from Meta and must target people 18 or older, and must not contain excessive depictions of drug and alcohol use, adult content, profanity, or violence and gore.
- Look for: In the video, rapid flashing, strobing or screen flicker; a trailer or show clip run without Meta's permission or with an audience under 18; scenes heavy on drinking or drugs, sex, swearing, blood or gore.
- Fix: Cut the flashing frames; for entertainment content get prior written permission, set targeting to 18+, and trim the excessive drug, adult, profane or violent scenes.

### lead-ads — Lead Ads (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Lead ad forms must not ask for these kinds of information without Meta's prior written permission: account numbers (frequent flyer, loyalty, cable or telephone), criminal or arrest history, financial information (bank or card numbers, routing numbers, credit scores, income, net worth, debt, bankruptcy), government-issued identifiers (Social Security, passport, driver's licence numbers), health information (conditions, treatments, mental health, disabilities), insurance information, political affiliation, race or ethnicity, religion or philosophical beliefs, sexual orientation or sexual life, trade union membership, and usernames or passwords. Forms also must not add custom questions that ask for the same or substantially similar information an existing Prefill Question covers, such as date of birth. Political affiliation is listed with no permission route.
- Look for: In the lead form fields, questions like "have you been charged with a crime", "have you declared bankruptcy", "do you have depression or anxiety", "do you use a wheelchair", "who is your insurer", "how did you vote", "are you Christian", "are you a union member", or any field asking to set a username and password or re-asking a prefill field.
- Fix: Delete the field, use the matching Prefill Question where one exists (for example Date of Birth for age), or obtain Meta's prior written permission; to sign people up for an account, use the Clicks to Website or Website Conversions objective instead of a lead form.

### targeting — Targeting (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Advertisers must not use targeting options to discriminate against, harass, provoke or disparage people, or to engage in predatory advertising practices. Advertisers who target custom audiences must comply with the applicable terms when creating the audience. The section is short; the Discriminatory Practices policy adds that audience tools may not wrongfully target or exclude groups, and that US, Canada and certain European housing, employment and financial ads must run as a Special Ad Category with approved targeting.
- Look for: Audience settings that single out or exclude people by a protected attribute, that pair a hostile or mocking creative with a group it aims at, or that aim a risky offer at a vulnerable group; a custom audience built from data the advertiser had no right to use; housing, credit or jobs ads without the Special Ad Category.
- Fix: Remove the discriminating or predatory targeting choices, declare the Special Ad Category where it applies, and rebuild custom audiences under the applicable terms.

### branded-content — Branded Content (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Ads promoting branded content must tag the featured third-party product, brand or business partner using the branded content tool. Branded content in ads is a creator's or publisher's content that features or is influenced by a business partner for an exchange of value. Advertisers promoting branded content integrations must use the tool to tag the partner.
- Look for: A creator or publisher post run as an ad that features, mentions or shows a brand or product it was paid to include, with no partner tag on the ad; the brand appears in the image, the video or the copy but the ad is not labelled as a partnership.
- Fix: Tag the featured brand or business partner with the branded content tool before running the ad.

### siep — Ads about Social Issues, Elections or Politics (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/SIEP-advertising/SIEP/
- Source: meta/siep.md
- Rule: Ads about social issues, elections or politics may run only if the advertiser completes Meta's authorization process (in designated countries, news publishers excepted) and carries a verified "Paid for by" disclaimer; an ad without the disclaimer is disapproved. This covers any ad made by, on behalf of or about a candidate, political figure, party or PAC, any ad about an election, referendum or ballot initiative, any ad about a social issue where it runs, and anything regulated as political advertising. Such ads are not allowed in the EU (except voting-information ads placed by election authorities), must not run in or target Washington state when about its officials, elections or Seattle legislation, and in the US, Brazil, India, Israel, Mexico and the UK must not discourage voting, question the legitimacy of an election or claim victory early. The advertiser must also disclose photorealistic image, video or audio made or edited with third-party generative AI that shows a real person doing or saying something they did not, a realistic person or event that does not exist, or altered footage of a real event.
- Look for: Copy, image or video that names or shows a candidate, party, election, referendum, ballot measure, "get out the vote" message or a social issue, with no "Paid for by" disclaimer or no authorization on the account; targeting that includes the EU or Washington state; claims that voting is pointless, that the election is rigged, or that a result is already decided. In video and audio, look for realistic AI-made or altered people and events with no AI disclosure.
- Fix: Complete the authorization process and add the verified "Paid for by" disclaimer, or remove the political and social-issue content; exclude the EU and Washington state from targeting where the rules apply; add the generative AI disclosure; cut any line that discourages voting or questions the election.

### spam — Spam (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/business-assets/spam/
- Source: meta/spam.md, meta/cs-spam.md
- Rule: Ads must not share deceptive links or attempt to buy, sell or exchange platform assets, features, privileges or engagement. Deceptive links include cloaking (showing Meta's systems different off-platform content than users see), misleading links that promise one thing and deliver something substantially different, deceptive redirects, like/share-gating, fake platform functionality such as drawn-on play buttons, polls or Like buttons that do not work, landing pages with pop-ups, pop-unders or clickjacking, and landing pages or domains that impersonate a reputable brand through typos or lookalike names. Offering cash, prizes or anything of value in exchange for likes, shares, follows or clicks, or requiring engagement before showing promised content, is also not allowed; clearly identified Branded Content and unpaid cross-promotion are fine.
- Look for: In the image or video, a fake play button, poll, Like button or fundraising element that is only a picture; in copy, "like to win", "share to unlock" or payment for engagement; a landing page whose domain differs from the one in the ad, redirects after a captcha or "click here", traps the visitor with pop-ups on leaving, or copies a known brand's name or look.
- Fix: Remove the fake interface elements and engagement-for-reward offers, link straight to the real landing page with no redirect, cloaking or pop-up traps, and use the advertiser's own domain rather than a lookalike.

### cybersecurity — Cybersecurity (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/business-assets/Cybersecurity/
- Source: meta/cybersecurity.md, meta/cs-cybersecurity.md
- Rule: Ads must not use phishing or social engineering to capture others' sensitive information, and must not promote or link to malicious code such as malware, spyware or greyware. Ads can't include links that cause an automatic download when the landing page opens, and can't advertise software or products that disrupt communication or signal sharing, such as jammers and descrambling devices. The Community Standard also forbids accessing accounts other than one's own by deceptive means, encouraging people to download files or apps that compromise their security, and sharing or advertising software, courses or products that enable hacking or bypassing security systems.
- Look for: A landing page that looks like a trusted site or login form and asks for passwords, login or recovery details; a link that starts a download by itself; copy or video selling a jammer, descrambler, hacking tool or course, a browser extension or app that harvests data, or "unlock any account" offers.
- Fix: Remove the phishing form, the auto-download and the malicious or hacking product; link only to the advertiser's own site that asks for nothing sensitive; signal jammers and descramblers cannot be advertised at all.

### inauthentic-behavior — Inauthentic Behavior (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/business-assets/inauthentic-behavior/
- Source: meta/inauthentic-behavior.md, meta/cs-inauthentic-behavior.md
- Rule: Advertisers cannot create or use inauthentic assets (accounts, Pages, Groups, business manager accounts) to deceive Meta or users about their identity or the origin, popularity or purpose of their content. They cannot use inauthentic assets to evade enforcement under the Community or Advertising Standards, must not misuse Meta reporting systems to harass or silence others, and must not engage in or claim to engage in Coordinated Inauthentic Behavior or Foreign Interference (networks of false identities, operators outside the country of the audience they target).
- Look for: A Page or account that does not represent the business behind the ad, a fake identity, a fresh account used to re-run an ad another account had rejected, or copy and landing pages that claim an origin, audience or popularity the advertiser does not have. In the creative, look for a brand, person or publisher presented as the source when it is not.
- Fix: Run the ad from the authentic Page and ad account of the business it is for, stop using extra accounts to get around a rejection, and remove claims about who is behind the ad or how popular it is that are not true.

### account-integrity — Account Integrity (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/business-assets/account-integrity/
- Source: meta/account-integrity.md
- Rule: Business assets must comply with the Community Standard on Account Integrity. Meta restricts or removes accounts that are used to egregiously or persistently violate its policies across any of its products, by automated and manual systems. The page is thin: it states no rule about the content of a single ad beyond this.
- Look for: This is an account-level rule, not an ad-content one; the ad itself shows no breach. A reviewer looks at the history of the account: repeated rejections under other policies, or one egregious violation, point to restriction of the ad account, Page or user account.
- Fix: Bring the ads into compliance with the policies they broke and stop repeating the violation; if the asset was restricted by mistake, request a review in Account Quality.

### user-requests — User Requests (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/business-assets/user-requests/
- Source: meta/user-requests.md, meta/cs-user-requests.md
- Rule: Requests for removal of business assets must comply with the Community Standard on User Requests. Meta complies with removal of an account when requested by the account owner, or of an account belonging to an incapacitated person when requested by an authorized representative with Proof of Authority and medical documentation confirming incapacitation; other requests may be rejected or need clarification. The page is thin and states no rule about ad content.
- Look for: Nothing in an ad; this governs who may ask Meta to remove an account, Page or ad account. A request from anyone other than the owner, or a representative without Proof of Authority and medical documentation, does not meet the standard.
- Fix: Have the account owner make the removal request, or supply Proof of Authority and the medical documentation when acting for an incapacitated owner.

### data-use — Data use restrictions (prohibits)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: Meta advertising data (data collected, received or derived from a Facebook or Instagram ad) may only be shared with someone acting on the advertiser's behalf, such as a service provider, who must keep it confidential and secure. It must not be used for any purpose except on an aggregate, anonymous basis to assess campaign performance (unless Meta authorizes otherwise), including no retargeting, no commingling across advertisers' campaigns and no piggybacking or redirecting with tags. It must not be used, together with the ad's targeting criteria, to build, append to, edit or augment user profiles or device identifiers, and must not be transferred to any ad network, ad exchange, data broker or other advertising or monetization service.
- Look for: Nothing in the creative; this is about what happens to the data after the ad runs. A reviewer looks at the landing page and tracking setup for third-party tags that piggyback on the ad, data passed to brokers, networks or exchanges, or ad data used to build profiles or retarget outside the advertiser's own campaigns.
- Fix: Keep Meta advertising data with the advertiser and its service providers, use it only in aggregate to measure the campaign, and remove any tag, feed or sharing that sends it to a broker, network, exchange or profile.

### eu-transparency — Transparency requirements under the EU Digital Services Act (restricts)
- URL: https://transparency.meta.com/policies/ad-standards/
- Source: meta/index.md
- Rule: EU law requires Meta to let users in the EU and associated territories see on whose behalf an ad is presented and who paid for it. When creating an ad, the advertiser must fill in the Beneficiary field with the full legal name of the person, company, business, charity or institution on whose behalf the ad is presented, and the Payor field (if different) with the full legal name of who paid for it. The advertiser is responsible for keeping this information complete, accurate and up to date for the whole time the ad runs.
- Look for: An ad reaching the EU with an empty Beneficiary field, a trading name, abbreviation or agency name in place of the full legal name, or a Payor that differs from the Beneficiary but is not filled in.
- Fix: Enter the full legal name of the beneficiary, and of the payor where it differs, and update the fields if either changes while the ad runs.
