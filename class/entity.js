const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};

const ACTION_TYPES = {
    "STAGE": 1,
    "END": 2,
    "REACTION": 3,
    "MOVING": 4,
    "ROTATING": 5,
}

function clampAngleToPiRange(angle) {
    angle = (angle + Math.PI) % (2 * Math.PI);
    if (angle < 0) {
        angle += (2 * Math.PI);
    }

    return angle - Math.PI;
}

class Entity {
    constructor(e, mods) {
        this._mods = mods;

        this.isPlayer = !!e.name;
        this.isMob = !this.isPlayer && e.villager;
        
        this.name = e.name || e.npcName;
        this.huntingZoneId = e.huntingZoneId;
        this.templateId = e.templateId;

        this.gameId = e.gameId;
        this.relation = e.relation;
        this.visible = e.visible;

        this.runSpeed = e.runSpeed;
        this.walkSpeed = e.walkSpeed;
        
        this.templateId = e.templateId;
        this.job = (e.templateId - 10101) % 100;
        this.race = Math.floor((e.templateId - 10101) / 100);

        // internal shit
        this._loc = e.loc;
        this._w = e.w;
        this._lastActionUpdate = null;
    }

    get isHostile() {
        throw new Error("Not implemented");
    }

    get info() {
        throw new Error("No longer supported");
    }

    get loc() {
        throw new Error("No longer supported");
    }

    getLocation() {
        if(!this._lastActionUpdate) return this._loc;

        switch(this._lastActionUpdate.actionType) {
            case ACTION_TYPES.ROTATING: {
                return this._loc;
            }

            case ACTION_TYPES.END: {
                return this._lastActionUpdate.loc;
            }

            case ACTION_TYPES.MOVING: {
                // should be dist3D, but applyDistance only works on 2d
                const dist = this._lastActionUpdate.loc.dist2D(this._lastActionUpdate.dest);
                const travelTime = (1000 * dist) / this._lastActionUpdate.speed;
                const now = Date.now();

                if(now >= (this._lastActionUpdate._time + travelTime)) this._lastActionUpdate.dest;

                const progress = Math.min((now - this._lastActionUpdate._time) / travelTime, 1);

                // NOTE: this will have incorrect Z axis, but what can you do
                const loc = this._lastActionUpdate.loc.clone();
                loc.w = this._lastActionUpdate.w;
                return this._mods.library.applyDistance(loc, dist * progress);
            }

            case ACTION_TYPES.STAGE:
            case ACTION_TYPES.REACTION: {
                // TODO: change this logic to be correct everytime
                if(this._lastActionUpdate.animSeq.length === 0) return this._lastActionUpdate.loc;

                const now = Date.now();
                const loc = this._lastActionUpdate.loc.clone();
                loc.w = this._lastActionUpdate.w;

                let animTime = this._lastActionUpdate._time;
                for(const seq of this._lastActionUpdate.animSeq) {
                    const dist = seq.distance;
                    const progress = (now - animTime) / seq.duration;
                    
                    if(progress >= 1) {
                        this._mods.library.applyDistance(loc, dist);
                        animTime += seq.duration;
                        continue;
                    }

                    this._mods.library.applyDistance(loc, dist * progress);
                    break;
                }

                return loc;
            }
        }

        throw new Error(`Unmapped type ${this._lastActionUpdate.actionType}`);
    }

    getDirection() {
        if(!this._lastActionUpdate) return this._w;

        // TODO: change this logic to be correct everytime
        if(this._lastActionUpdate.actionType !== ACTION_TYPES.ROTATING) return this._lastActionUpdate.w;

        const now = Date.now();
        const progress = Math.min((now - this._lastActionUpdate._time) / this._lastActionUpdate.time, 1);

        const totalChange = clampAngleToPiRange(this._lastActionUpdate.w - this._lastActionUpdate.startDirection);

        return this._lastActionUpdate.startDirection + (totalChange * progress);
    }

    updateLocation(e) {
        this._lastActionUpdate = {
            ...e,
            _time: Date.now(),
            actionType: ACTION_TYPES.MOVING,
        };
    }

    updateDirection(e) {
        const startDirection = this.getDirection();
        this._loc = this.getLocation();

        this._lastActionUpdate = {
            ...e,
            _time: Date.now(),
            startDirection,
            actionType: ACTION_TYPES.ROTATING,
        };
    }

    updateAction(e, actionType) {
        if(actionType === ACTION_TYPES.REACTION && !e.reaction.enable) return;
        
        if(actionType === ACTION_TYPES.REACTION) {
            e = e.reaction;
        }

        this._lastActionUpdate = {
            ...e,
            _time: Date.now(),
            actionType: actionType
        };
    }
}

class EntityManager{
    constructor(dispatch, mods) {
        this.entityClass = Entity;
        this.entities = {};

        this.mobs = {};
        this.players = {};
        this.npcs = {};
        this.unknown = {};

        // Functions
        this.getLocationForThisEntity = (id) => {
            if(this.players[id]) return this.players[id].pos;
            if(this.mobs[id]) return this.mobs[id].pos;
            if(this.npcs[id]) return this.npcs[id].pos;
            if(this.unknown[id]) return this.unknown[id].pos;
        }
        this.getLocationForPlayer = (id) => this.players[id].pos;
        this.getLocationForMob = (id) => this.mobs[id].pos;
        this.getLocationForNpc = (id) => this.npcs[id].pos;

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

        this.getEntityData = (id) => {
            return this.npcs[id.toString()] || this.mobs[id.toString()] || this.players[id.toString()] || this.unknown[id.toString()];
        };

        this.getEntitiesData = (huntingZoneId, templateId) => {
            const ret = [];
            const added = new Set();

            for(const key of ["npcs", "mobs", "players", "unknown"]) {
                for(const id in this[key]) {
                    const data = this[key][id];
                    if(!added.has(data.gameId) && data.info.huntingZoneId === huntingZoneId && data.info.templateId === templateId) {
                        ret.push(data);
                        added.add(data.gameId);
                    }
                }
            }

            return ret;
        }

        this.getSettingsForEntity = (id, object) => {
            const entity = this.getEntityData(id);

            if(object[entity.info.huntingZoneId]) {
                return object[entity.info.huntingZoneId][entity.info.templateId];
            }
        }

        // Zone reloaded -- reset cache
        this.resetCache = () => {
            this.entities = {};
            this.mobs = {};
            this.players = {};
            this.npcs = {};
            this.unknown = {};
        }
        dispatch.hook('S_LOAD_TOPO', 'raw', DEFAULT_HOOK_SETTINGS, this.resetCache);

        // Entity spawned
        this.spawnEntity = (mob, e) => {
            this.entities[e.gameId] = new this.entityClass(e, mods);

            let id = e.gameId.toString();
            let job = (e.templateId - 10101) % 100;
            let race = Math.floor((e.templateId - 10101) / 100);

            let pos = e.loc;
            pos.w = e.w;
    
            let data = {
                name: e.name,
                info: {
                    huntingZoneId: e.huntingZoneId,
                    templateId: e.templateId
                },
                relation: e.relation,
                huntingZoneId: e.huntingZoneId,
                templateId: e.templateId,
                gameId: e.gameId,
                visible: e.visible,
                loc: pos,
                job,
                race,
                pos
            };
            
            // relation(10 door), aggressive == isMob, relation(12 for special cases), rel = 10 & spawnType = 1 == HW dummy
            if(mob && e.villager) this.npcs[id] = Object.assign(data, {"var": "npcs"});
            else if(mob && (e.aggressive || e.relation == 12 || (e.relation == 10 && e.spawnType == 1))) this.mobs[id] = Object.assign(data, {"var": "mobs"});
            else this.unknown[id] = Object.assign(data, {"var": "unknown"});
            if(!mob) this.players[id] = Object.assign(data, { "var": "players", serverId: e.serverId, playerId: e.playerId });
        }
        dispatch.hook(...mods.packet.get_all("S_SPAWN_USER"), DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, false));
        dispatch.hook(...mods.packet.get_all("S_SPAWN_NPC"), DEFAULT_HOOK_SETTINGS, this.spawnEntity.bind(null, true));

        // Entity despawned
        this.despawnEntity = (e) => {
            if(this.entities[e.gameId]) delete this.entities[e.gameId];

            let id = e.gameId.toString();
            
            if (this.mobs[id]) delete this.mobs[id];
            if (this.npcs[id]) delete this.npcs[id];
            if (this.players[id]) delete this.players[id];
            if (this.unknown[id]) delete this.unknown[id];
        };
        dispatch.hook(...mods.packet.get_all("S_DESPAWN_NPC"), DEFAULT_HOOK_SETTINGS, this.despawnEntity);
        dispatch.hook(...mods.packet.get_all("S_DESPAWN_USER"), DEFAULT_HOOK_SETTINGS, this.despawnEntity);

        // Move location update
        this.updatePosition = (mob, e) => {
            if(this.entities[e.gameId]) this.entities[e.gameId].updateLocation(e);

            let id = e.gameId.toString();

            let pos = e.dest;
            pos.w = e.w;
    
            if(this.mobs[id]) this.mobs[id].pos = pos;
            if(this.players[id]) this.players[id].pos = pos;
            if(this.npcs[id]) this.npcs[id].pos = pos;
            if(this.unknown[id]) this.unknown[id].pos = pos;
        }
        dispatch.hook(...mods.packet.get_all("S_NPC_LOCATION"), DEFAULT_HOOK_SETTINGS, this.updatePosition.bind(null, true));
        dispatch.hook(...mods.packet.get_all("S_USER_LOCATION"), DEFAULT_HOOK_SETTINGS, this.updatePosition.bind(null, false));

        // Direction update
        this.directionUpdate = (e) => {
            if(this.entities[e.gameId]) this.entities[e.gameId].updateDirection(e);

            let id = e.gameId.toString();
            if(this.mobs[id]) this.mobs[id].pos.w = e.w;
            if(this.players[id]) this.players[id].pos.w = e.w;
            if(this.npcs[id]) this.npcs[id].pos.w = e.w;
            if(this.unknown[id]) this.unknown[id].pos.w = e.w;
        }
        dispatch.hook(...mods.packet.get_all("S_CREATURE_ROTATE"), DEFAULT_HOOK_SETTINGS, this.directionUpdate);

        // Entity CC'ed -- update location
        dispatch.hook(...mods.packet.get_all("S_EACH_SKILL_RESULT"), DEFAULT_HOOK_SETTINGS, e=> {
            if(mods.player.isMe(e.target)) return;

            if(this.entities[e.target]) this.entities[e.target].updateAction(e, ACTION_TYPES.REACTION);

            let id = e.target.toString();
            let loc = null;

            if(this.npcs[id]) loc = this.npcs[id].pos;
            if(this.mobs[id]) loc = this.mobs[id].pos;
            if(this.players[id]) loc = this.players[id].pos;
            if(this.unknown[id]) loc = this.unknown[id].pos;

            if(loc) {
                if(e.reaction.enable) {
                    let dist = 0;
                    for(let i in e.reaction.animSeq) dist += e.reaction.animSeq[i].distance;
                    dist *= -1;
                    mods.library.applyDistance(loc, dist);
                }
            }
        });


        // S_ACTION_STAGE / END location update
        // Make this update position "live" later on
        this.sAction = (end) => (e) => {
            if(mods.player.isMe(e.gameId)) return;

            if(this.entities[e.gameId]) this.entities[e.gameId].updateAction(e, end ? ACTION_TYPES.END : ACTION_TYPES.STAGE);

            let id = e.gameId.toString();

            e._active = !end;
            let pos = e.loc;
            pos.w = e.w;
            
            if(e.movement) {
                let distance = 0;
                for(let idx in e.movement){
                    distance += e.movement[idx].distance;
                }
                mods.library.applyDistance(pos, distance);
            }
    
            if(this.mobs[id]) {
                this.mobs[id].pos = pos;
                this.mobs[id].action = e;
            }
            if(this.players[id]) {
                this.players[id].pos = pos;
                this.players[id].action = e;
            }
            if(this.npcs[id]) {
                this.npcs[id].pos = pos;
                this.npcs[id].action = e;
            }
            if(this.unknown[id]) {
                this.unknown[id].pos = pos;
                this.unknown[id].action = e;
            }
        }
        dispatch.hook(...mods.packet.get_all("S_ACTION_STAGE"), DEFAULT_HOOK_SETTINGS, this.sAction(false));
        dispatch.hook(...mods.packet.get_all("S_ACTION_END"), DEFAULT_HOOK_SETTINGS, this.sAction(true));

        // Mob hp got updated
        dispatch.hook(...mods.packet.get_all("S_CREATURE_CHANGE_HP"), DEFAULT_HOOK_SETTINGS, e=> {
            let id = e.target.toString();

            const data = {
                curHp: e.curHp,
                maxHp: e.maxHp,
            };

            if(this.mobs[id]) Object.assign(this.mobs[id], data);
            if(this.players[id]) Object.assign(this.players[id], data);
            if(this.npcs[id]) Object.assign(this.npcs[id], data);
            if(this.unknown[id]) Object.assign(this.unknown[id], data);
        });

        // Relation got updated
        dispatch.hook(...mods.packet.get_all("S_CHANGE_RELATION"), DEFAULT_HOOK_SETTINGS, e=> {
            if(this.entities[e.target]) this.entities[e.target].relation = e.relation;

            let id = e.target.toString();

            if(this.mobs[id]) this.mobs[id].relation = e.relation;
            if(this.players[id]) this.players[id].relation = e.relation;
            if(this.npcs[id]) this.npcs[id].relation = e.relation;
            if(this.unknown[id]) this.unknown[id].relation = e.relation;
        });
    }
}

module.exports = EntityManager;