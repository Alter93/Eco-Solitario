# Character assets — Chapter I v1.1

The original `alter_master_sheet.png` is retained for history and reference.
The active atlas is `assets/alter-actions.png`, generated and cleaned with the
built-in image tool using Alter's original design as reference. The PNG was
re-encoded losslessly for decoder compatibility; RGBA pixels were verified equal.

`characters.js` extracts the 32 connected figures at alpha >= 128. It never
assumes that a weapon ends at a grid boundary. Small disconnected debris is
excluded, lower-torso alignment and a shared scale preserve the character's
size, and feet use a common canvas baseline. Three bandit palettes reuse the
same cached poses. Source artwork is never modified during loading.

The rows contain eight running phases, eight running pistol phases, eight
running baton phases, then idle / rise / fall / land / windup / strike /
followthrough / hurt. During melee while moving, legs keep the running cycle
while the torso follows the swing; the baton can be occluded in followthrough.

`assets/radio-hosts.png` contains Jack (left) and Dexter (right), interpreted
from the established pixel-art descriptions: brown swept hair and teal for
Jack, fuller dark hair and mauve for Dexter, both with cyan headsets. These are
stylized character illustrations, not reproductions of unavailable photos.

No external asset URLs or runtime libraries are required by the game.
