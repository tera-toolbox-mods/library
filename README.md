# Library
A generic library for Tera-Proxy.

DO NOT INSTALLED IT AS "library-master" MAKE SURE IT'S NAMED "library"

## Development examples

### How to import
After successfully importing the library refer to the "Class functions" section to figure out how to access variables
```JS
module.exports = (dispatch)=> {
  const library = dispatch.require.library;
  library.<class library>.<class function/variable>;
}
```

### How to inherit
```JS
const PlayerLibrary = require('../library/class/player');
class Player extends PlayerLibrary {
  constructor(dispatch) {
    super(dispatch);
  }
}
module.exports = Player;
```

## Class functions
### Entity
Entity requires a mods object as a secondary argument when initilizing it.

#### Variables
```JS
players/mobs: Contains the information below -- accessed by their gameId

  pos:
    x: x position of the entity
    y: y position of the entity
    z: z position of the entity
    w: w value for the entity

  info:
    huntingZoneId: The huntingZoneId for the entity (used for mobs mostly)
    templateId: The templateId(modelId) for the entity.

  name: The entities name.
  job: The entities job. (Used for players mostly)
  race: The entities race. (Used for players mostly)
  ---------- below is appearance information ----------
  outfit/app/apperance/appearance: (passed by reference)
    appearance
    weapon
    body
    hand
    feet
    underwear
    head
    face
    styleHead
    styleFace
    styleBack
    styleWeapon
    styleBody
    styleFootprint
    styleBodyDye
    bodyDye
```
#### Functions
```JS
getLocationForThisEntity(id): runs getLocationForPlayer and getLocationForMob
getLocationForPlayer(id): returns the location of a player
getLocationForMob(id): returns the location of a mob

isNearEntity(pos, playerRadius=50, entityRadius=50): checks if the position(pos) is within playerRadius of any entity + entityRadius.
isNearPlayer(pos, playerRadius=50, entityRadius=50): Same as isNearEntity but for players only
isNearBoss(pos, playerRadius=50, entityRadius=50):Same as isNearEntity but for mobs only

getSettingsForEntity(id, object): returns an objects values in entity[entity.info.huntingZoneId][entity.info.templateId]
```

### Library
#### Variables
```JS
sp: true if sp is found
startSkillsPackets: A list of C packets which are called when client presses any skill
command: The command module
version: The dispatch.protocolVersion after update
```
#### Functions
```JS
applyDistance(loc, distance): applies distance to a location object, then returns the object. 
dist3D(loc1, loc2): Returns the distance between two points(x, y, z)
opositeDirection(direction): Takes a direction value and changes it to the oposite (deprecated, use Angle equivalents).
positionsIntersect(a, b, aRadius, bRadius): I don't remember. returns true of two circles intersects? doesn't account for Z value

getSkillInfo(id, usingMask): Get the info of a player skill. returns an object with 4 values. raw(actual skill id), id(unpacked skill id), skill(double digit skill) and sub(the skill sub "stage")

getEvent(opcode, packetVersion, payload): Returns the event of a raw payload.
getPayload(opcode, packetVersion, data): Returns the raw payload of an event

emptyLong(bool=true): creates an empty long (deprecated, use BigInt equivalents).
jsonEqual(a, b): Checks if two json objects are the same
objectLength(obj): Returns the length of an object.
arrayItemInArray(idk, idk): What the name says, I have no clue why this is here tbh

saveFile(filePath, data, dirname): Saves a json file to filePath with the data data. the dirname variable needs to be passed __dirname
readFile(dirname, filePath): Reads the context of a file and returns it.
```

### Player
#### Variables
```JS
serverId: Server id of the player
templateId: Template/model id of the player
gameId: gameId/guid of the player
race: Math.floor((templateId - 10101) / 100)
job: (templateId - 10101) % 100
onMount: If the player is on a mount
alive: If the player is alive
inven: An object containing two keys. weapon(does player have weapon equipped) and effects(active armor effects effecting client)
loc/pos: x/y/z/w location of the player aswell as a update variable which tells when the position got updated
stamina: How much stamina the player has left

attackSpeed: The base attack speed of the player
attackSpeedBonus: The bonus attack speed of the player
aspdDivider: The value (attackSpeed + attackSpeedBonus) "get's divided with to create aspd"
aspd: The attack speed of the player using a secret algorithm (Kappa)

---------- below is appearance information ----------
outfit/app/apperance/appearance: (passed by reference)
  appearance
  weapon
  body
  hand
  feet
  underwear
  head
  face
  styleHead
  styleFace
  styleBack
  styleWeapon
  styleBody
  styleFootprint
  styleBodyDye
  bodyDye
```
#### Functions
```
isMe(arg): takes a BigInt(int 64) argument and checks if it's equal to your player id/gameId
```

### Effect
#### Variables
```JS
abnormals: 

glyphs: 

permanentBuffs: 
```
#### Functions
```
hasEffect(id): basically returns true if either of the three below is true

hasAbnormality(id): Checks if the player has the abnormality id.
hasGlyph(id): Checks if the player has the glyph id.
hasBuff(id): Checks if the player has the "buff" id.

getAbnormalities(): Returns all the abnormalities the player has
getGlyphs(): Returns all the glyphs the player has
getBuffs(): Returns all the "buffs" the player has
```

### Mods object
This is a object which references all the modules loaded by the library.
