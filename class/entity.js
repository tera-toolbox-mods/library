const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};
const Vec3 = require('tera-vec3');

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

            let pos = e.loc;
            pos.w = e.w * 0x8000 * Math.PI;
    
            let data = {
                name: e.name,
                info: {
                    huntingZoneId: e.huntingZoneId,
                    templateId: e.templateId
                },
                gameId: e.gameId,
                apperance: outfit,
                appearance: outfit,
                app: outfit,
                outfit,
                job,
                race,
                pos
            };
            
            // relation(10 door), unk15 == isMob, relation(12 for special cases), rel = 10 & spawnType = 1 == HW dummy
            if(mob && (e.unk15 || e.relation == 12 || (e.relation == 10 && e.spawnType == 1))) this.mobs[id] = data;
            else if(!mob) this.players[id] = data;

            /*
            { 
                gameId: Long { low: 372719, high: 1146880, unsigned: true },
                target: Long { low: 0, high: 0, unsigned: true },
                loc: Vec3 { x: 23319.291015625, y: 1357.065673828125, z: 6261.15625 },
                w: 2.338649584930903,
                relation: 10,
                templateId: 9997,
                huntingZoneId: 183,
                unk4: 0,
                unk5: 0,
                unk6: 0,
                unk7: 5,
                visible: true,
                villager: false,
                spawnType: 1,
                unk11: Long { low: 0, high: 0, unsigned: true },
                unk12: 0,
                unk13: 0,
                unk14: 0,
                unk15: 0,
                owner: Long { low: 0, high: 0, unsigned: true },
                unk16: 0,
                unk17: 0,
                unk18: Long { low: 0, high: 0, unsigned: true },
                unk19: 0,
                unk20: 16777216,
                unk25: 16777216,
                unk22: [],
                unk24: [],
                npcName: '허수아비' 
            }
            
            */
        }
        dispatch.hook('S_SPAWN_USER', 12, DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, false));
        dispatch.hook('S_SPAWN_NPC', 6, DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, true));

        // Apperance/outfit update
        this.sUserExternalChange = (e) => {
            let id = e.gameId.toString();
            if(this.players[id]) Object.assign(this.players[id].outfit, e);
        }
        dispatch.hook('S_USER_EXTERNAL_CHANGE', 6, DEFAULT_HOOK_SETTINGS, this.sUserExternalChange);

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

            let pos = new Vec3(
                ((e.toX || e.x) + e.x) / 2,
                ((e.toY || e.y) + e.y) / 2,
                ((e.toZ || e.z) + e.z) / 2
            );
            pos.w = e.w;
    
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
    
            let pos = new Vec3({
                x: e.x,
                y: e.y,
                z: e.z
            });
            pos.w = e.w;
            
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