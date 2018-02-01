# Library
A generic library for Tera-Proxy.

## Development examples

### How to import
After successfully importing the library refer to the "Class functions" section to figure out how to access variables
```JS
const Library = require('library');

module.exports = (dispatch)=> {
  const library = Library(dispatch);
  library.<class library>.<class function/variable>;
}
```

### How to inherit
```JS
const PlayerLibrary = require('library/class/player');
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
players: An object with all the players in the area. each player object has two sub objects pos and info. Info isn\'t used for players, but for mobs

mobs: see players aswell as info contains huntingZoneId and templateId
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
version: The dispatch.base.protocolVersion after update
```
#### Functions
```JS
applyDistance(loc, distance): applies distance to a location object, then returns the object. 
getSkillInfo(id, usingMask): Get the info of a player skill. returns an object with 4 values. raw(actual skill id), id(unpacked skill id), skill(double digit skill) and sub(the skill sub "stage")
emptyLong(bool=true): creates an empty long
jsonEqual(a, b): Checks if two json objects are the same
opositeDirection(direction): Takes a direction value and changes it to the oposite
arrayItemInArray(idk, idk): What the name says, I have no clue why this is here tbh
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
aspd: The attack speed of the player using a secret algorithm (Kappa)
```
#### Functions
```
isMe(arg): takes a long(int 64) argument and checks if it's equal to your player id/gameId
```

### Mods object
This is a object which references all the modules loaded by the library.
