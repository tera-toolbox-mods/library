const DEFAULT_HOOK_SETTINGS = {order: -1001, filter: {fake: null}};
const Vec3 = require('tera-vec3');

class player{
    constructor(dispatch, mods) {
        // Mount
        this.onMount = false;
        // Alive
        this.alive = true;
        // Inventory
        this.inven = {weapon: false, effects: []};
        let inventoryBuffer = [];
        // Location
        this.loc = {x: 0, y: 0, z: 0, w: 0, updated: 0};
        this.pos = {x: 0, y: 0, z: 0, w: 0, updated: 0};
        // Is the player moving?
        this.moving = false;
        // zone information
        this.zone = -1;
        // List over players in party
        this.playersInParty = [];
        // Pegasus status
        this.onPegasus = false;
        // Channel
        this.channel = 0;

        // Functions
        this.isMe = (arg) => {
            return arg == this.gameId;
        }

        // Login
        this.sLogin = (e) => {
            this.onPegasus = false;
            this.gameId = e.gameId;
            this.templateId = e.templateId;
            this.serverId = e.serverId;

            this.race = Math.floor((e.templateId - 10101) / 100);
            this.job = (e.templateId - 10101) % 100;
            this.name = e.name;
            this.level = e.level;
        }
        dispatch.hook('S_LOGIN', 10, DEFAULT_HOOK_SETTINGS, this.sLogin);

        // Level up
        try{
            dispatch.hook('S_USER_LEVELUP', 2, e=> {
                if(this.isMe(e.gameId)) this.level = e.level;
            });
        }catch(e) {}

        // Attack Speed & Stamina
        this.sPlayerStatUpdate = (e) => {
            //this.sPlayerStatUpdate = e;
            this.stamina = e.stamina;
            // Attack speed
            this.attackSpeed = e.attackSpeed;
            this.attackSpeedBonus = e.attackSpeedBonus;
            this.aspdDivider = (this.job >= 8 ? 100 : e.attackSpeed);
            this.aspd = (e.attackSpeed + e.attackSpeedBonus) / this.aspdDivider;
            // movement speed
            this.msWalk = e.walkSpeed + e.walkSpeedBonus;
            this.msWalkBase = e.walkSpeed;
            this.msWalkBonus = e.walkSpeedBonus;

            this.msRun = e.runSpeed + e.runSpeedBonus;
            this.msRunBase = e.runSpeed
            this.msRunBonus = e.runSpeedBonus;

            // Sorc edge shit
            this.fireEdge = e.fireEdge;
            this.iceEdge = e.iceEdge;
            this.lightningEdge = e.lightningEdge;
        }
        dispatch.hook('S_PLAYER_STAT_UPDATE', dispatch.majorPatchVersion < 75 ? 9 : 10, DEFAULT_HOOK_SETTINGS, this.sPlayerStatUpdate);

        // Channel/zone information
        dispatch.hook('S_CURRENT_CHANNEL', 2, e=> {
            this.channel = e.channel - 1;
            this.zone = e.zone;
        });

        // Stamina
        this.sPlayerChangeStamina = (e) => {
            this.stamina = e.current;
        }
        dispatch.hook('S_PLAYER_CHANGE_STAMINA', 1, DEFAULT_HOOK_SETTINGS, this.sPlayerChangeStamina);

        // Mount
        this.sLoadTopo = (e) => {
            this.onMount = false;
            this.zone = e.zone;
        }
        dispatch.hook('S_LOAD_TOPO', 3, DEFAULT_HOOK_SETTINGS, this.sLoadTopo);

        this.sMount = (onMount, e) => {
            if(this.isMe(e.gameId)) this.onMount = onMount;
        }
        dispatch.hook('S_MOUNT_VEHICLE', 2, DEFAULT_HOOK_SETTINGS, this.sMount.bind(null, true));
        dispatch.hook('S_UNMOUNT_VEHICLE', 2, DEFAULT_HOOK_SETTINGS, this.sMount.bind(null, false));

        // Party
        this.sPartyMemberList = (e) => {
            this.playersInParty = [];
			
			for(let member of e.members){
				// If the member isn't me, we can add him/her/helicopter. Let's not assume genders here
				if(!this.isMe(member.gameId)) this.playersInParty.push(member.gameId.toString());
			}
        }
        dispatch.hook('S_PARTY_MEMBER_LIST', 7, this.sPartyMemberList);

        this.sLeaveParty = (e) => {
            this.playersInParty = [];
        }
        dispatch.hook('S_LEAVE_PARTY', 'raw', this.sLeaveParty);

        // Alive
        this.sSpawnMe = (e) => {
            this.alive = true;
        }
        dispatch.hook('S_SPAWN_ME', 'raw', DEFAULT_HOOK_SETTINGS, this.sSpawnMe);

        this.sCreatureLife = (e) => {
            if(this.isMe(e.gameId)) {
                this.alive = e.alive;
                Object.assign(this.loc, e.loc);
            }
        }
        dispatch.hook('S_CREATURE_LIFE', 2, DEFAULT_HOOK_SETTINGS, this.sCreatureLife);

        // Inventory
        this.sInven = (opcode, payload, incoming, fake) => {
            const e = mods.library.getEvent(opcode, 16, payload);


            inventoryBuffer = e.first ? e.items : inventoryBuffer.concat(e.items);
            this.gold = e.gold;

            if(!e.more) {
                this.inven.weapon = false;
                this.inven.effects = [];
                this.inven.items = {};

                for(let item of inventoryBuffer) {
                    if(!this.inven.items[item.id]) this.inven.items[item.id] = [];
                    this.inven.items[item.id].push({ amount: item.amount, dbid: item.dbid, slot: item.slot });
                    
                    switch(item.slot) {
                        case 1:
                            this.inven.weapon = true;
                            break;
                        case 3:
                            // We put a try statement here because fuck everything and everyone. :)
                            let activeSet = item.passivitySets[item.passivitySet];
                            if(!activeSet)
                                activeSet = item.passivitySets[0];

                            try {
                                for (const effect of activeSet.passivities) {
                                    this.inven.effects.push(Number(effect.id));
                                }
                            }catch(e) {this.inven.effects = [];}

                            break;
                    }
                }

                inventoryBuffer = [];
            }
        }
        dispatch.hook('S_INVEN', 'raw', DEFAULT_HOOK_SETTINGS, this.sInven);

        // Pegasus
        dispatch.hook('S_USER_STATUS', 2, e=> {
            if(this.isMe(e.gameId)) this.onPegasus = (e.status === 3);
        });

        // Player moving
        dispatch.hook('C_PLAYER_LOCATION', 5, DEFAULT_HOOK_SETTINGS, e=> {
            this.moving = e.type !== 7;
        });

        // Player location
        this.handleMovement = (serverPacket, e) => {
            if(e.type !== 7 && serverPacket ? e.gameId == this.gameId : true) {
                let loc = e.loc;
                loc.w = e.w || this.loc.w;
                loc.updated = Date.now();

                this.loc = loc;
                this.pos = loc;
            }
        }
        
        dispatch.hook('S_ACTION_STAGE', 8, {filter: {fake: null}, order: 10000}, this.handleMovement.bind(null, true));
        dispatch.hook('S_ACTION_END', 5, {filter: {fake: null}, order: 10000}, this.handleMovement.bind(null, true));
        dispatch.hook('C_PLAYER_LOCATION', 5, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        // Notify location in action
        dispatch.hook('C_NOTIFY_LOCATION_IN_ACTION', 4, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_NOTIFY_LOCATION_IN_DASH', 4, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        // skills
        dispatch.hook('C_START_SKILL', 7, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_TARGETED_SKILL', 6, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_COMBO_INSTANT_SKILL', 4, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_INSTANCE_SKILL', 5, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_INSTANCE_SKILL_EX', 5, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_PRESS_SKILL', 4, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
    }
}

module.exports = player;