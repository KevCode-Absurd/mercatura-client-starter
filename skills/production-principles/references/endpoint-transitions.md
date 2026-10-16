# Continuous motion between start and end frames

Adapted from the user's start/end-frame café lesson and two stills (2026-10-09). Use the decisions as conditional rules. The café, cast, ten seconds, cinematic look and final two-second hold are examples, not D2C defaults or a request to render. Named-model claims and app routing notes are kept in [Models](../models.md).

## Check the pair before planning the journey

Use endpoint control only through a route that actually exposes start and end frame inputs. Bind each image to its real input role; two general references or a prompt saying “end here” do not establish native endpoint control. Select the supported duration/aspect and continuous-shot mode where available. A multi-shot setting, if present, must agree with the intended continuous take; do not invent a switch on routes that lack it.

Compare the endpoints for approved identity, hair, wardrobe, product variant and geometry, room layout, physical light sources, object state and aspect ratio. Different framing is intentional, but incompatible facts are not. If input handling resizes or crops, inspect the actual submitted images: a changed crop can hide the necessary grip or shift the intended composition. Resolve conflicts before paying for motion; interpolation is not a way to reconcile two different products or outfits.

Write the changes explicitly: starting pose and hand positions, ending pose and gaze target, product state, camera start/end position and boundary. Ask whether that change could occur in one real take in the available time. A close-up reached from a wide view requires a feasible path through the room, not a face enlargement over a stretching background. Account for obstacles and other characters crossing the camera's path. A matching aspect ratio alone does not establish spatial compatibility.

## Describe motion between the endpoints

The endpoints supply intended visual states; the prompt supplies the connecting action. Name one main camera behaviour, its direction and stopping position, plus feasible sequential character behavior. Describe when a hand leaves the cheek, where it comes to rest and when the gaze changes. Keep supporting gestures small; split incompatible simultaneous operations rather than demanding extra hands.

For a forward move, foreground/background relationships change through coherent perspective and parallax. Objects can leave a tightening frame naturally while remaining in their established world positions. “The cup leaves view” does not mean “the cup disappears.” A close endpoint cannot prove that an off-screen product or prop retained its state. Check its visible exit and any later reappearance; avoid claiming unseen continuity is verified.

Let the camera settle before a useful recognition hold, with natural live expression and real playback speed. Allocate the hold within the actual duration, leaving enough time for the journey. A gaze toward a visitor needs a defined target consistent with the ending camera position; camera-facing reference eyes do not automatically mean visitor-facing recognition. Explicitly direct sound under the format's rules; endpoints do not define speech, footsteps or ambience.

## What these café stills establish

The wide image shows a seated woman with a hand supporting her cheek, a cup on a saucer and envelope on the table, and a visitor already approaching. The portrait crops out the table and the visitor. Plan the hand leaving the cheek and the visitor's final steps from those actual states. The supplied clothing appears gray-brown and checked over a cream knit top; the lesson's “olive-gray jacket” wording should not override the images. Fix the description rather than recoloring the wardrobe during the transition.

The stills illustrate endpoint scale and apparent styling consistency. They do not prove one continuous camera path, successful hand movement, identity stability or a readable narrative reveal.

## Inspect the middle, then refine one cause

Watch the complete take at normal speed and inspect the camera travel, face turns, hand contact and prop exits frame by frame. Look for hidden cuts, dissolves, room bending, background stretching, a face morphing as it enlarges, sliding hands or objects, and a snap into the target pose. Check the actual ending crop and recognition time as well as the opening. Strong endpoints do not establish a successful transition.

When the spatial distance is too ambitious, try an approved medium starting composition closer to the end. That is a documented new source, not the same-input retry. For a sudden smile, separate gaze onset from expression development. Simplify the responsible motion or extend the duration only through supported controls and the authorized budget. Change one controlling decision per bounded comparison and save the inputs, settings, prompt and full result. If no plausible continuous path exists, revise the endpoints or propose an edited sequence; never label a cut as a continuous move. See [Motion review](video-generation.md) and [Camera coverage](camera-shots.md).
