---
name: script-types
description: Library of distinct ad script types (architectures) for building many different scripts from the same research, for any D2C brand - straight argument, confession, failed-solutions journey, discovery, witness, three things, category call-out, demonstration, offer first, objection first, timeline, how it's made, unaware observation, identity led, price of the problem, daily routine, days in, honest review, several side by side. Each type file says how that kind of script opens (for a product that is used up and for one that is kept), the order of its beats, what carries it, and the type it must not be confused with. Load 1 type file alongside script-from-research. Not a method on its own.
---

# Script types (library)

The same research written with the same recipe gives the same ad again and again. A script type is a different architecture for the same truth: a different way in, a different beat order, a different thing doing the persuading. 2 scripts of different types for 1 persona and 1 angle are different ads to the viewer and to the platform.

`script-from-research` is the method. A type file from `types/` tells it which architecture to build. The type wins on the opening, the beat order, person and tense, and what carries the script. The method's rules on facts never change.

A type is judged on 1 thing: given the same research as its neighbour, does it give a script a viewer would call a different ad? Each recipe has a **Not the same as** line for that, and 2 openings, 1 for a product that is used up and 1 for a product that is kept. The openings are made up: nothing in them goes into a script.

## How variety multiplies

| Lever | Typical count |
|---|---|
| Persona (avatar) | 2 to 4 |
| Angle | 3 to 4 per persona |
| Script type | 19 (below), usually 5 to 8 fit a concept |
| Hook swap | 5 per script |
| Format | 8 or more |

1 persona and 1 angle with 6 types is 6 different scripts. 6 concepts give about 36. Each script made in several formats gives a few hundred ads to test, before hook swaps.

## The types, by what carries them

| Carried by | Type | Opens with | Buyer stage | Needs from the brand |
|---|---|---|---|---|
| The problem | `straight-argument` | The accommodation, said to "you" | Problem aware, solution aware | An accommodation |
| | `confession` | Something the speaker did and never said | Unaware, problem aware | An accommodation with stakes |
| | `unaware-observation` | An observation about their life, no problem named | Unaware | A behaviour customers describe from before they knew why |
| The objection | `failed-solutions` | What they tried, in order | Problem aware, solution aware | 2 failed solutions from research |
| | `objection-first` | The doubt, conceded before they think it | Solution aware, product aware | The nearly-didn't-buy |
| | `honest-review` | What is not perfect, said before what is good | Product aware, solution aware | A real shortcoming, and who the brand says it is not for |
| The mechanism | `discovery` | "Here's what I didn't know" | Problem aware, solution aware | 1 true cause |
| | `three-things` | A count and an open question | Solution aware | 2 or 3 features, each with its "which means" |
| | `category-callout` | What the category gets wrong | Solution aware | A true flaw of the usual product, and the detail that answers it |
| | `timeline` | The first time point | Problem aware, solution aware | Time points the brand can support: the first weeks of use, or the life of the thing |
| | `days-in` | A day count, and where things stand that day | Solution aware, product aware | A count of days the brand holds: a pack's length, an adjustment period, the returns window |
| | `how-its-made` | A decision made in making it | Solution aware, product aware | A real process fact |
| Proof | `witness` | Someone else noticing | Problem aware | A real customer's account |
| | `demonstration` | The thing working | Solution aware, product aware | Something the product visibly does, or a use worth watching |
| | `daily-routine` | A moment of an ordinary day, the product in it | Solution aware, product aware | How and when customers use it |
| | `tested-several` | The line-up, and what it is judged on | Solution aware, product aware | A real test, or a fact about each kind of option that can be checked |
| The offer | `offer-first` | The terms | Product aware, most aware | Terms worth leading with |
| | `price-of-the-problem` | What the problem has already cost | Problem aware, solution aware | A cost the research or the brand states |
| Identity | `identity-led` | Who they are | Product aware, most aware; tired markets | A feature that says something about its buyer |

## Picking types for a batch

- Spread a batch across what carries the script before repeating one: 1 problem type, 1 mechanism type, 1 proof type, 1 offer or objection type. 3 scripts carried by the same beat read as 1 ad, whatever their types are called.
- 2 types that would open on the same fact are not both used for 1 concept: `straight-argument` and `confession` on 1 accommodation; `demonstration` and `how-its-made` on 1 process fact; `failed-solutions` and `price-of-the-problem` on the same 2 tries. Give the second a different fact, or pick another type.
- Leave out types the concept's awareness stage doesn't suit, and types the length can't hold (stories need about 60 seconds; a timeline needs longer).
- A type that needs something the brand doesn't have (the last column) is skipped, not faked.

Type files are loaded by id from `src/lib/script-types.ts`, which also holds the label, the stages and the shortest length of each. A file is edited in place; none is renamed.

## What this reads from the brand brain

| The type needs | Document and field | When it is blank |
|---|---|---|
| An accommodation, a failed solution, the nearly-didn't-buy, a behaviour from before they knew | `customer-avatars.md`: Grounded in, What almost stops them, Tried before (new, not in the draft), The moment (new) | The type is skipped. Picked anyway, the writer says in the notes what it assumed. |
| A real customer's account (`witness`) | `customer-avatars.md`: Grounded in, with the name and source | Written as a brief for a real customer to film, with listed placeholders |
| A process fact (`how-its-made`, `category-callout`) | `products-and-positioning.md`, per product: How it is made (new, not in the draft), Key features | A placeholder; no factory story is made up |
| Something visible (`demonstration`) | `products-and-positioning.md`, per product: Visible result, How it is used, Moves and sounds (new) | The use is demonstrated, never an effect |
| Time points (`timeline`) | `products-and-positioning.md`, per product: Buying pattern (new, not in the draft), with the cycle of use or the expected life and warranty | The type is skipped |
| The terms (`offer-first`, `price-of-the-problem`) | `offers.json`; `brand.json`: guarantee | No number is said; the type is skipped where the offer has nothing to lead with |
