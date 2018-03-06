const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};

class entity{
    constructor(dispatch, mods) {
        this.mobs = {};
        this.players = {};

        // Functions
        this.getLocationForThisEntity = (id) => {
            if(this.players[id]) return this.players[id].pos;
            else if(this.mobs[id]) return this.mobs[id].pos;
        }
        this.getLocationForPlayer = (id) => this.players[id].pos;
        this.getLocationForMob = (id) => this.mobs[id].pos;

        // Pos is player position
        this.isNearEntity = (pos, playerRadius = 50, entityRadius = 50) => {
            if(this.isNearPlayer(pos, playerRadius, entityRadius)) return true;
            if(this.isNearBoss(pos, playerRadius, entityRadius)) return true;
            return false;
        }

        // Pos is player position
        this.isNearPlayer = (pos, playerRadius = 50, entityRadius = 50) => {
            for(let key in this.players) {
                let entity = this.players[key];
                if(mods.library.positionsIntersect(entity.pos, pos, playerRadius, entityRadius)) return true;
            }
            return false;
        }

        // Pos is player position
        this.isNearBoss = (pos, playerRadius = 50, entityRadius = 50) => {
            for(let key in this.mobs) {
                let entity = this.mobs[key];
                if(mods.library.positionsIntersect(entity.pos, pos, playerRadius, entityRadius)) return true;
            }
            return false;
        }

        this.getSettingsForEntity = (id, object) => {
            let entity = this.mobs[id.toString()] || this.players[id.toString()];

            if(object[entity.info.huntingZoneId]) {
                return object[entity.info.huntingZoneId][entity.info.templateId];
            }
        }

        // Zone reloaded -- reset cache
        this.resetCache = () => {
            this.mobs = {};
            this.players = {};
        }
        dispatch.hook('S_LOAD_TOPO', DEFAULT_HOOK_SETTINGS, this.resetCache);

        // Entity spawned
        this.spawnEntity = (mob, e) => {
            let id = e.gameId.toString();
            let job = (e.templateId - 10101) % 100;
            let race = Math.floor((e.templateId - 10101) / 100);

            let outfit = {
                appearance: e.appearance,
                weapon: e.weapon,
                body: e.body,
                hand: e.hand,
                feet: e.feet,
                underwear: e.underwear,
                head: e.head,
                face: e.face,
                styleHead: e.styleHead,
                styleFace: e.styleFace,
                styleBack: e.styleBack,
                styleWeapon: e.styleWeapon,
                styleBody: e.styleBody,
                styleFootprint: e.styleFootprint,
                styleBodyDye: e.styleBodyDye,
                bodyDye: e.bodyDye
            };
    
            let data = {
                name: e.name,
                pos: {
                    x: e.x || e.loc.x,
                    y: e.y || e.loc.y,
                    z: e.z || e.loc.z,
                    w: (e.loc ? e.w * 0x8000 * Math.PI : e.w)
                },
                info: {
                    huntingZoneId: e.huntingZoneId,
                    templateId: e.templateId
                },
                apperance: outfit,
                appearance: outfit,
                app: outfit,
                outfit,
                job,
                race
            };
            
            // relation(10 door), unk15 == isMob, relation(12 for special cases)
            if(mob && (e.unk15 || e.relation == 12)) this.mobs[id] = data;
            else if(!mob) this.players[id] = data;
        }
        dispatch.hook('S_SPAWN_NPC', 5, DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, true));

        // Apperance/outfit update
        this.sUserExternalChange = (e) => {
            let id = e.gameId.toString();
            if(this.players[id]) Object.assign(this.players[id].outfit, e);
        }

        // Temp hook installment
        dispatch.hook('C_CHECK_VERSION', 1, e=> {
            dispatch.hook('S_SPAWN_USER', [328427, 328305].includes(dispatch.base.protocolVersion) ? 12 : 11, DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, false));

            dispatch.hook('S_USER_EXTERNAL_CHANGE', [328427, 328305].includes(dispatch.base.protocolVersion) ? 5 : 4, DEFAULT_HOOK_SETTINGS, this.sUserExternalChange);
        });

        // Entity despawned
        this.despawnEntity = (mob, e) => {
            let id = e.gameId.toString();
            try{
                if(mob) delete this.mobs[id];
                else delete this.players[id];
            }catch(e){}
        }
        dispatch.hook('S_DESPAWN_NPC', 2, DEFAULT_HOOK_SETTINGS, this.despawnEntity.bind(null, true));
        dispatch.hook('S_DESPAWN_USER', 3, DEFAULT_HOOK_SETTINGS, this.despawnEntity.bind(null, false));

        // Move location update
        this.updatePosition = (mob, e) => {
            let id = e.gameId.toString();
            let pos = {
                x: ((e.toX || e.x) + e.x) / 2,
                y: ((e.toY || e.y) + e.y) / 2,
                z: ((e.toZ || e.z) + e.z) / 2,
                w: e.w
            };
    
            if(mob && this.mobs[id]) this.mobs[id].pos = pos;
            else if(!mob && this.players[id]) this.players[id].pos = pos;
        }
        dispatch.hook('S_NPC_LOCATION', 2, DEFAULT_HOOK_SETTINGS, this.updatePosition.bind(null, true));
        dispatch.hook('S_USER_LOCATION', 2, DEFAULT_HOOK_SETTINGS, this.updatePosition.bind(null, false));

        // Direction update
        this.directionUpdate = (e) => {
            let id = e.gameId.toString();
            if(this.mobs[id]) this.mobs[id].pos.w = e.w;
        }
        dispatch.hook('S_CREATURE_ROTATE', 1, DEFAULT_HOOK_SETTINGS, this.directionUpdate);


        // S_ACTION_STAGE / END location update
        // Make this update position "live" later on
        this.sAction = (e) => {
            let id = e.gameId.toString();
            let mob = (this.mobs[id] != undefined);
    
            let pos = {
                x: e.x,
                y: e.y,
                z: e.z, 
                w: e.w
            };
            if(e.movement) {
                let distance = 0;
                for(let idx in e.movement){
                    distance += e.movement[idx].distance;
                }
                mods.library.applyDistance(pos, distance);
            }
    
            if(mob && this.mobs[id]) this.mobs[id].pos = pos;
            else if(!mob && this.players[id]) this.players[id].pos = pos;
        }
        dispatch.hook('S_ACTION_STAGE', 3, DEFAULT_HOOK_SETTINGS, this.sAction);
        dispatch.hook('S_ACTION_END', 2, DEFAULT_HOOK_SETTINGS, this.sAction);
    }
}

module.exports = entity;