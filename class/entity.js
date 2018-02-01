const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};

class entity{
    constructor(dispatch, mods) {
        this.mods = mods;
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
                if(Math.pow((entity.pos.x - pos.x), 2) + Math.pow((entity.pos.y - pos.y), 2) < Math.pow((playerRadius + entityRadius), 2)) return true;
            }
            return false;
        }

        // Pos is player position
        this.isNearBoss = (pos, playerRadius = 50, entityRadius = 50) => {
            for(let key in this.mobs) {
                let entity = this.mobs[key];
                if(Math.pow((entity.pos.x - pos.x), 2) + Math.pow((entity.pos.y - pos.y), 2) < Math.pow((playerRadius + entityRadius), 2)) return true;
            }
            return false;
        }

        this.getSettingsForEntity = (id, object) => {
            let entity = this.mobs[id.toString()] || this.players[id.toString()];

            if(object[entity.info.huntingZoneId]) {
                return object[entity.info.huntingZoneId][entity.info.zone];
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
    
            let data = {
                pos: {
                    x: e.x,
                    y: e.y,
                    z: e.z,
                    w: e.w
                },
                info: {
                    huntingZoneId: e.huntingZoneId,
                    template: e.templateId
                }
            };
    
            if(mob) this.mobs[id] = data;
            else this.players[id] = data;
        }
        dispatch.hook('S_SPAWN_NPC', 5, this.spawnEntity.bind(null, true));
        dispatch.hook('S_SPAWN_USER', 11, this.spawnEntity.bind(null, false));

        // Entity despawned
        this.despawnEntity = (mob, e) => {
            let id = e.gameId.toString();
            if(mob) delete this.mobs[id];
            else delete this.players[id];
        }
        dispatch.hook('S_DESPAWN_NPC', 2, this.despawnEntity.bind(null, true));
        dispatch.hook('S_DESPAWN_USER', 3, this.despawnEntity.bind(null, false));

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
                this.mods.library.applyDistance(pos, distance);
            }
    
            if(mob && this.mobs[id]) this.mobs[id].pos = pos;
            else if(!mob && this.players[id]) this.players[id].pos = pos;
        }
        dispatch.hook('S_ACTION_STAGE', 3, DEFAULT_HOOK_SETTINGS, this.sAction);
        dispatch.hook('S_ACTION_END', 2, DEFAULT_HOOK_SETTINGS, this.sAction);
    }
}

module.exports = entity;