---
name: video-director
description: How a short ad clip is directed for a video model - the film planned before its shots, a run of shots with hard cuts at stated seconds, a new picture about every 2 seconds, every cut changing both how close the camera is and where it stands (12 named shots), the subject changing too, the camera travelling in about half the shots, each shot 1 action that changes the picture, the product arriving when the words reach it and opened the way the brand says, a voice that runs on across the cuts, and the same world kept. Describes, never instructs. Every video format rests on this and adds only the shots of its own kind.
---

# Directing a clip

`production-principles` says what a good generated picture or clip is. This says how the shots of a clip are chosen and put in order, for any format and any D2C brand. A format's own skill adds the kinds of shot that format cuts between.

It was written on 2026-10-08, after 5 test clips came back as 1 held shot each: 1 person, 1 small action, 1 place, 10 seconds. The app had asked for exactly that ("one continuous take with no cuts"). The owner's read: "This is just boring people to death... things should keep happening on screen."

## Where the rules come from

- **The owner's Seedance 2.5 prompt skill** (`seedance-clean`, on his machine): a clip of up to 30 seconds can hold many shots; cuts are asked for at stated seconds ("timed multishot"); when cuts are stated the camera is told to cut only there; across cuts the same people, geometry, screen direction, light, clothes and state of each object are held.
- **The owner's Seedance director skill** (`seedance-director`, written for 2.0): every cut changes both shot size and camera character; positions and facing are said again after a cut; cutaways are short, show a named subject and are there for a reason the viewer understands; the scene starts already in progress; a face is directed as what the muscles do, not as a feeling. Its ban on timecodes and shot labels is for 2.0 and is not followed: the maker's guide for 2.5 says whole-second timestamps are followed.
- **The AI Video School course** the owner handed over (63 lessons, read 2026-10-08; it teaches Seedance 2.0 and Kling 3.0): its multi-cut prompts state the total length and the second of each hard cut, as this app now does, and every cut changes both the shot size and the camera's behaviour. 2 rules were taken from it. "'Mech punches the monster.' That's a caption, not direction": a shot says what force does to a body, with weight and where it lands. A held shot is given small movement (a breath, a weight shift). 2 things it does differently and this app does not follow yet: it gives the video model the person, the product and at most 1 place as pictures and lets the words frame each shot, where this app also sends 1 still per shot; and it never sends a voice with the clip, but changes the voice of each finished clip to 1 chosen voice afterwards.
- **The owner's read of the second round** (8 clips, 2026-10-08): "it's still on the slower side and not much is happening", "this is just one static shot", "same shot, maybe like same objects", "there's no movement in front", "the data should plan out the entire scene and then we have to execute on that scene". What the 25 rendered shots had asked for: "locked off" in 17, a camera move in 3, a small gesture (a lean, a look, a shrug, "slides a little and stops") in 13, 1 place in 7 clips of 8, the same 2 to 4 objects in every shot of a clip, and in 5 of 17 cuts only the size changed, from the same spot. The clips did what they were told. Rules 1, 4 to 8 and 11 are the answer.
- **The owner's sheet of 12 camera shots** (2026-10-08): wide, full, medium, close-up, extreme close-up, over the shoulder, low angle, high angle, point of view, overhead, profile, framed, each with when to use it. Its 2 working notes are kept: "just saying 'low angle' gives the model too much room", so a shot says where the camera is and what part fills the frame; and an extreme close-up names the exact part, or it comes back as a plain close-up. Its 3-shot pattern (a look, the point of view, the reaction) is in rule 5.
- **`seedance-director`, the newer file the owner sent** (2026-10-08): an order of care (what the viewer must understand, then performance and blocking, then space and cause, then light and sound, then camera and rhythm, then style); 1 primary action and at most 1 primary camera move a stage, each with a visible end state; a photo is given a job and told what it must not carry; product work names the object, the operation, the physical cause and the success state.
- **Atlas Cloud's Seedance 2.5 prompt skills and examples** (github.com/atlascloudai/awesome-seedance-2.5-prompts-skills, CC BY 4.0, read 2026-10-08; the techniques are used here, not its wording): a shot line is size, subject and 1 action, angle, 1 camera move; in its fastest official example every cut is a "double contrast", size and angle changing together, 8 shots in 20 seconds; "dynamic camera" and "fast-paced" lock nothing, a named move with what it follows does; pace comes from more, shorter shots with 1 action each, never from more action in a shot; and on Seedance 2.0 it measured that a picture beats the words on composition, so a reference is bound for what it shows and told not to lend its framing. Its numbers for 2.5 are launch claims, not measurements.
- **2 prompts by other people that the owner sent** (2026-10-08; `references/cut-lists.md`): films of 8 seconds in 10 cuts, timed to a tenth of a second, each cut saying what moves, how the camera moves and what the light does. His read: "look at how much is happening", then "don't take the exact style... take the principles", "it's going to be case dependent", "give the model that amount of flexibility and creativity". The principles are in rule 2 and in "How a shot is written". Their look is not used.
- **The owner's sheet of 10 camera movements** (2026-10-08): dolly in, dolly out, handheld, static, orbit, tracking shot, crane up, truck, tilt and drone flyover, each with the feeling it gives and a ready phrase for the end of a video prompt. Its question is rule 6: "what do I want the viewer to feel?" 3 moves the app did not have were added to the fixed words (truck, crane up, fly over); the others were already there under the app's own names. Each ready phrase names the move the way a crew does and says what it does to depth (the foreground sliding past the background): the clip prompt now writes a shot's move that way. Each also asks for a slow move with a film look; that is not taken, because a slow move is what the owner read as slow and a clip shot on a phone is not a film. The table is under "What each camera move is for".
- **The app's own ad research** (`video-ad-scripts/references/winning-ad-patterns.md`, 486 ads): a median of 3.7 seconds a shot, 2.5 in ads for buyers who do not know the problem yet, about 2.6 in ads with no speech, and 3.3 spoken words a second. `creative-qa`: about 2 seconds a frame at the least.

## The rules, with the reason for each

**1. Plan the film first.** The main place and the places it cuts to, who and what is in each, and the picture for each idea. A plan written shot by shot from the top stays where shot 1 put it: 1 corner, 1 height, the same objects. A plan made as a whole can spend its seconds on different things.

A clip is 1 scene, and it is as long as its words need. The owner asked, after the test clip (2026-10-08): "is it because we are stretching the clips to 10 seconds?", "we shouldn't drag a visual just because we have a fixed timing", "the scene should be completed", "it should be clipped based on the shot". It was part of it. Clips were filled to 10 seconds, so 1 request of 3,200 characters had to direct 2 or 3 of the script's scenes in up to 6 shots, about 120 characters a shot, from 1 opening picture, and the planner spread 1 small action over the time. Now a clip is about 6 seconds: 1 scene of the script in 3 or 4 shots, ending where its scene or sentence ends, with the job's clip length (10 seconds) only as the longest it may be. Each clip gets a picture of its own, and the one this format shows better than any other: "we have to break out of our shackles and actually show great visuals". What it costs: more joins between clips, and a voice the video model makes afresh for each clip can change at each join.

**2. Keep it tight: the picture changes every 2 seconds or sooner, and each change is something new being done.** In a feed a held picture reads as "nothing is happening" and the thumb moves. The first round's 3 to 5 shots in 10 seconds read as slow to the owner. The second round's test clip had 4 shots (cut at 3.0, 5.5 and 7.3 seconds) with the camera right, and he still found it slow, and then said exactly why: "the voice is going fast, but the video is so slow", "it's like you're just showing one motion", "it's not about the pacing, it's about being tight", "the amount of action per second should be maximized", "what's happening in visuals for 10 seconds should be covered in 4". That clip spent 10 seconds on 1 small thing: a pack tipped out, a gummy looked at, lifted and bitten. So 2 things changed. A clip has more shots, cut to the speaker's pace: 5 or 6 in 10 seconds at the usual pace of an ad, 6 with fast cuts, with shots of different lengths and none past 3 seconds. And a clip is planned as if it had half its seconds: the action that would have filled it is done in its first shots, and the rest is what the person does next, each thing leading to the next and belonging to the words. A shot that only shows the same thing nearer, or a face that looks, is not something new happening. The fastest example the video model's maker publishes is 2.5 seconds a shot, so this is past what the maker shows.

How many shots a clip gets is the director's to choose, inside a range (2026-10-08, after the 2 prompts in `references/cut-lists.md`). The fewest is what the paragraph above gives. The most is a shot every 1.2 seconds for a filmed person (3 to 5 shots in 6 seconds), and every 0.75 seconds in a made world, where the lens can go anywhere and anything can move (4 to 8 shots in 6 seconds, never more than 10 in a clip). A shot is timed to a tenth of a second, never under half a second in a made world or 1 second with a filmed person. The shots of a clip differ in length: quick where it builds, longer where it lands. And a clip has a shape of its own: it opens on its most telling picture, each cut goes somewhere new, it builds to the 1 picture the words are about, and its last shot lands it. The planner is told this as principles and told it is no formula: "it should be actually attractive as an ad", "give the model that amount of flexibility and creativity". The numbers are starting choices of the app's builder, not the owner's and not measured.

**3. Start in the middle.** Shot 1 is judged in under a second with the sound off. It opens on the action already under way and on the most telling picture the clip has. Walking in, sitting down and greeting are cut before they are shot.

**4. Every cut changes how close the camera is and where it stands, both.** A cut that changes the size alone, from the same spot, reads as a jump and is often drawn as no cut at all.

How close:

| Shot | What it holds | Use it for |
|---|---|---|
| Wide | The place, the subject small in it | Where we are, scale, a first look at a new place |
| Full | The subject head to toe | Meeting someone, how they stand and move |
| Medium | From the waist up | Talking, doing something with the hands and face both in view |
| Close-up | A face, or 1 object | A reaction, a feeling, the product's detail |
| Extreme close-up | 1 named detail: an eye, fingertips on a seal, a texture | The 1 thing the shot is about, a held breath |

Where it stands:

| Shot | Where the camera is | Use it for |
|---|---|---|
| Eye level | Level with the subject, in front | The plain shot the others are measured from |
| Low angle | Below the subject's eyeline, looking up | Size, nerve, a win; or the subject looking up at something bigger |
| High angle | Above, looking down | Small, caught out, being watched |
| Overhead | Straight down | Hands at work, a surface, a layout, a flat lay |
| Over the shoulder | Behind 1 shoulder, which fills the near edge | What the person faces: a screen, a shelf, another person |
| Point of view | Where the person's eyes are, their own hands in frame | Putting the viewer in the action |
| Profile | Square from the side | A thought, a shape, a quiet beat |
| Framed | Through something near the lens: a doorway, a shelf, a gap | Depth, watching unseen |

A name alone is not enough: "low angle" leaves the model to choose. A shot says where the camera is and what part of the subject fills the frame ("the camera on the counter by her elbow, looking up; her face and the pack fill the top half"). An extreme close-up names the exact part. A clip uses at least 3 sizes and 3 angles.

**5. The subject changes too.** A face, the whole person, hands, the product, another object, the place. 4 shots of 1 thing from 4 distances is still 1 thing. A look, what is looked at through the person's eyes, then the reaction, is 3 shots and reads as 1 moment.

**6. The camera travels in about half the shots.** A push in to what matters, a pull back to show where we are, a pan or a track with the thing that moves, a tilt, an orbit. 1 move a shot, said with what it follows and where it ends, because a move with no end is skipped. A very fast action gets a held camera: 2 fast things in 1 shot smear. The first rule here was "the camera is steady, the cut does the moving", and 17 of 25 shots came back locked off.

Make the path suit the crop. As a face fills more of the frame, use a shorter, simpler move so identity and mouth movement stay readable. For an orbit, name what the new angle reveals and travel only far enough to show it; a quarter turn can do the job without a full circle. Tracking matches the moving subject's pace and relative distance; a truck crosses the set on its own path. State the beginning, path, speed and arrival in the existing shot description. These additions come from AI Video Bootcamp's Camera Movement transcript (pp. 3–5), Full Catalogue (pp. 3, 18, 22–27) and High-Impact Camera Moves (pp. 8, 18); [the audit](../../docs/bootcamp-audit/video-flows-filmmaking.md) records the exact local sources. They are prompt directions, not measured guarantees or extra camera controls.

**7. Each shot is 1 action that changes the picture.** The model draws 1 action well and 2 unrelated ones badly, so a different action is the next shot. 2 moves that run on in the same hands ("tears the top off and tips it out") are 1 action: split into 2 shots, they are what made a clip slow. The action is quick and is finished inside its shot. But the action has to be one: something is different when the shot ends. Say who, which hand, how hard and where it lands. Write what moves, never what holds still: every "stays", "remains", "once" and "slightly" is a brake, and the model obeys it. A look, a nod or a shrug rides on an action; it is not one.

**8. Give the frame depth.** Something near the lens, the subject, something behind, and 1 of them moving with the place: steam, a curtain, a screen, passing light. A subject against a blank wall with nothing moving but a hand reads as a still.

**9. A cut may change the place.** A real ad is shot in several corners of a life. Each shot that leaves the main place names its own, and says again who is where, because the model has no memory of the shot before.

**10. Use the cut to bring things in.** An object that appears from somewhere hidden inside a shot is invented and comes out wrong. An object already in the frame when a shot opens is drawn from its reference. So the cut is how anything new arrives.

**11. The product comes in when the words reach it, being used, and exactly as the brand says.** Before then it is not in the frame and its photo is not sent. The shot shows the object the words are about: where a product is used 1 serving at a time, that serving's own pack is the object, with its own photo, and the pack it is sold in stays out of the shot. How it opens and what comes out are said in the brand's words. A photo is the strongest thing in a request: sent the pouch of 28 as "the product", a clip tore the corner off the pouch and poured pellets from it. A pack that stands on a counter through every shot is furniture. (See also `product-in-picture-by-stage`.)

**12. The voice does not stop for the cuts, and it talks at the pace of the person speaking.** The lines are 1 track across the clip, each sentence straight after the last. How fast is set by the speaker's age (`src/lib/pace.ts`, the 1 table every step reads): 3.6 spoken words a second under 30, 3.4 from 30 to 44, 3.2 from 45 to 59, 3.0 from 60 to 74, 2.8 from 75, and 3.3 when the age is not known; a calm pace is a sixth slower, and speech that runs past a minute a tenth slower. The owner asked for it: "people speak at X amount of words a minute... faster for younger people, maybe a little slower when we are denoting older people... it shouldn't be a catch-all". Where the numbers come from:

- Measured conversation, pauses counted: about 194 words a minute at 20 and 169 at 60, a little under 3% slower a decade ([Horton and others 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2943985), 336 speakers; few of them over 50).
- People of 75 and over take about a fifth longer to say the same words than young adults ([Smith and others 1987](https://pubs.asha.org/doi/epdf/10.1044/jshr.3004.522), read speech, 20 speakers, seen second-hand).
- People talk about a tenth faster to someone they know than to a stranger, 214 against 193 words a minute ([Yuan, Liberman and Cieri 2006](https://www.ldc.upenn.edu/sites/default/files/interspeech2006-towards-integrated-understanding.pdf)). An ad talks to the viewer as a friend would, so the measured rates are raised by that.
- The ads this app has read run at a median of 3.3 words a second, which is where the table sits when the age is not known.
- A listener follows speech up to about 270 words a minute ([Kuperman and others 2021](https://experts.mcmaster.ca/scholarly-works/2127220)); every rate here is under it. Longer pauses alone make speech sound slower ([Frontiers 2022](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.778018/full)), which is why a clip is as long as its words and no longer.
- Gender changes the rate by about 2%, and region by more than age does. Neither is in the table.

Mine and not measured: the steps between the measured ages, the rate from 75, the calm and the long factors, and the choice to raise conversation to how friends talk. The test clip was planned at 2.8, the measured pace of someone of 60, for a woman in her thirties; its 28 words took about 9 of its 10 seconds, with nothing said from 7.1 to 8.0 seconds. A person on camera is seen saying part of it and heard over the rest; a cutaway shows what the words just said or are about to say, and names whose hand or face it is. This is what lets the picture move faster than the sentences.

**13. Keep the same world.** The same person in the same clothes, the same light and time of day, each object in the state it was left in. This is what makes several shots read as 1 film.

**14. The last shot lands the point.** Only the last shot of the whole video holds still.

**15. What still goes wrong.** More than 3 people tracked across cuts; a reflection in a mirror, glass or water; someone leaving the frame and coming back inside 1 shot; counting on fingers; a hand over the product's printing.

## How a shot is written

- Its seconds, to a tenth where the cut wants it. A calm plan keeps whole seconds.
- In a made world, where it makes the picture: how fast the camera goes, what the light and the lens do, and whether this 1 shot runs slow.
- Its size, its angle and its camera move, each in 1 of the fixed words, and what fills the frame.
- The exact framing in a few words: what part of the subject the frame holds, where the camera is, and for a move what it follows and where it ends.
- The place, by its name, when it is not the main one.
- The objects in it, by their 1 name each.
- The action: who, which hand, what changes, where it lands.

## What each camera move is for

The planner is sent this with every plan, and picks a move by the feeling, never by habit.

| Move | What the camera does | What the viewer feels |
|---|---|---|
| locked off | does not move | watching closely, tension; a fast action stays readable |
| hand-held | a little natural shake | there in the room, real and unposed |
| push in | goes toward the subject | this matters; attention tightens on a face or the product |
| pull back | goes away from the subject | how big the place is, how alone they are, an ending |
| pan | turns to the side | look over there; from 1 thing to the next |
| tilt | turns up or down | how tall; a reveal from the bottom up |
| track | goes along with a subject that moves | we are with them; the story moves |
| truck | slides sideways across the scene | exploring; things near the lens slide past and give depth |
| crane up | rises straight up | scale and power; the place opens out below |
| orbit | goes round the subject | the hero moment; the thing shown off from every side |
| fly over | glides forward from the air | spectacle, a big place, an opening |

A crane up, an orbit or a fly over is not something a phone in a hand does. They belong to a made world, or to a clip filmed like a commercial.

In the clip prompt the move is written the way a crew says it, with what it does to depth ("dolly in toward the subject, the foreground sliding past"), because a named move with its effect is followed and a bare word is not. A prompt that has to be shortened keeps the 1 word.

For physical movement versus a lens zoom, use the existing [camera behaviour guidance](../production-principles/references/camera-shots.md#choose-one-camera-behaviour-for-the-shot). Do not label a fixed-position zoom as a push in. The app's fixed camera fields remain authoritative; a source's dolly zoom, rig handoff or impossible camera chain does not add a supported mode.

## Review a generated performance

A good opening image does not establish a good take. Inspect the opening, middle and final spoken beat for delayed lip closures, drifting teeth/jaw, face changes and expressions disconnected from the words. Listen separately for omitted or added words, robotic delivery and a voice changing at a clip join. Judge camera path and product contact as well as the overall look. Fix the affected instruction or choose a clean take within the authorized render scope; music, softer contrast and faster cutting do not repair broken speech or anatomy. This separates visual quality from speaking quality, following the bootcamp's Lip-sync Test transcript (pp. 1–3) without adopting its provider ranking.

## What a calm pace changes

A brand or a format that is slow on purpose (a quiet craft film, a held "satisfying" shot) keeps fewer, longer shots: about 2 in 10 seconds, each held for a reason, and the camera may stay where it is. Rules 3, 4, 10, 11 and 13 hold all the same.

## Not yet proven on a rendered clip

Written on 2026-10-08 from the owner's read and the sources above. 1 test clip was rendered at the pace before this one (4 shots in 10 seconds, 2.8 words a second): the cuts, 2 camera moves and the product came back as asked; the opening shot's angle did not. What was asked for after that clip has not been rendered: clips of about 6 seconds that each hold 1 scene, 5 or 6 shots in 10 seconds, a clip planned as if it had half its seconds, 2 linked moves in 1 shot, the voice at the pace of the speaker's age, and cuts timed to a tenth of a second, as often as about once a second in a made world. The 3 new camera moves and the written-out moves of the owner's camera sheet have not been rendered either. Whether the video model draws that much action cleanly in shots under 2 seconds, follows a named move in them, and says the words at that pace, is settled by rendering, not by this page.
