const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};

class player{
    constructor(dispatch, mods) {
        // Mount
        this.onMount = false;
        // Alive
        this.alive = true;
        // Inventory
        this.inven = {weapon: false, effects: []};
        let readInventory = true;
        let inventoryBuffer = [];
        // Location
        this.loc = {x: 0, y: 0, z: 0, w: 0, updated: 0};
        this.pos = {x: 0, y: 0, z: 0, w: 0, updated: 0};
        // outfit/apperance info
        this.outfit = {};
        this.apperance = this.outfit;
        this.appearance = this.outfit;
        this.app = this.outfit;

        // Functions
        this.isMe = (arg) => arg.equals(this.gameId);

        // Login
        this.sLogin = (e) => {
            this.gameId = e.gameId;
            this.templateId = e.templateId;
            this.serverId = e.serverId;

            this.race = Math.floor((e.templateId - 10101) / 100);
            this.job = (e.templateId - 10101) % 100;
        }
        dispatch.hook('S_LOGIN', 9, DEFAULT_HOOK_SETTINGS, this.sLogin);

        // Attack Speed & Stamina
        this.sPlayerStatUpdate = (e) => {
            this.sPlayerStatUpdate = e;
            this.stamina = e.stamina;
            this.attackSpeed = e.attackSpeed;
            this.attackSpeedBonus = e.attackSpeedBonus;
            this.aspdDivider = (this.job >= 8 ? 100 : e.attackSpeed);
            this.aspd = (e.attackSpeed + e.attackSpeedBonus) / this.aspdDivider;
        }
        dispatch.hook('S_PLAYER_STAT_UPDATE', 8, DEFAULT_HOOK_SETTINGS, this.sPlayerStatUpdate);

        // Outfit information
        this.sUserExternalChange = (e) => {
            if(this.isMe(e.gameId)) Object.assign(this.outfit, e);
        }
        dispatch.hook('S_USER_EXTERNAL_CHANGE', 4, DEFAULT_HOOK_SETTINGS, this.sUserExternalChange);

        // Stamina
        this.sPlayerChangeStamina = (e) => {
            this.stamina = e.current;
        }
        dispatch.hook('S_PLAYER_CHANGE_STAMINA', 1, DEFAULT_HOOK_SETTINGS, this.sPlayerChangeStamina);

        // Mount
        this.sLoadTopo = (e) => {
            this.onMount = false;
        }
        dispatch.hook('S_LOAD_TOPO', DEFAULT_HOOK_SETTINGS, this.sLoadTopo);

        this.sMount = (onMount, e) => {
            if(this.isMe(e.target)) this.onMount = onMount;
        }
        dispatch.hook('S_MOUNT_VEHICLE', 1, DEFAULT_HOOK_SETTINGS, this.sMount.bind(null, true));
        dispatch.hook('S_UNMOUNT_VEHICLE', 1, DEFAULT_HOOK_SETTINGS, this.sMount.bind(null, false));

        // Party
        this.sPartyMemberList = (e) => {
            this.playersInParty = [];
			
			for(let member of e.members){
				// If the member isn't me, we can add him/her/helicopter. Let's not assume genders here
				if(!this.isMe(member.cid)) this.playersInParty.push(member.cid.toString());
			}
        }
        dispatch.hook('S_PARTY_MEMBER_LIST', 5, this.sPartyMemberList);

        this.sLeaveParty = (e) => {
            this.playersInParty = [];
        }
        dispatch.hook('S_LEAVE_PARTY', this.sLeaveParty);

        // Alive
        this.sSpawnMe = (e) => {
            this.alive = true;
        }
        dispatch.hook('S_SPAWN_ME', DEFAULT_HOOK_SETTINGS, this.sSpawnMe);

        this.sCreatureLife = (e) => {
            if(this.isMe(e.target)) this.alive = e.alive;
        }
        dispatch.hook('S_CREATURE_LIFE', 1, DEFAULT_HOOK_SETTINGS, this.sCreatureLife);

        // Inventory
        this.sUserStatus = e => {
            if(this.isMe(e.target)) {
                readInventory = e.status === 1;
            }
        }
        dispatch.hook('S_USER_STATUS', 1, DEFAULT_HOOK_SETTINGS, this.sUserStatus);

        this.sInven = e => {
            if(readInventory) {
                inventoryBuffer = e.first ? e.items : inventoryBuffer.concat(e.items);

                if(!e.more) {
                    this.inven.weapon = false;
                    this.inven.effects = [];

                    for(let item of inventoryBuffer) {
                        switch(item.slot) {
                            case 1:
                                this.inven.weapon = true;
                                break;
                            case 3:
                                for(var set of item.passivitySets) {
                                    for(var id of set.passivities) {
                                        this.inven.effects.push(Number(id.dbid));
                                    }
                                }
                                break;
                        }
                    }

                    inventoryBuffer = [];
                }
            }
        }
        dispatch.hook('S_INVEN', 11, {filter: {fake: null}, order: 1000}, this.sInven);

        // Player location
        this.handleMovement = (serverPacket, e) => {
            if(e.type !== 7 && serverPacket?e.gameId.equals(this.gameId):true) {
                let loc = {
                    x: e.x,
                    y: e.y,
                    z: e.z,
                    w: e.w,
                    updated: Date.now()
                };
                this.loc = loc;
                this.pos = loc;
            }
        }
        dispatch.hook('S_ACTION_STAGE', 3, {filter: {fake: null}, order: 10000}, this.handleMovement.bind(null, true));
        dispatch.hook('S_ACTION_END', 2, {filter: {fake: null}, order: 10000}, this.handleMovement.bind(null, true));
        dispatch.hook('S_INSTANT_MOVE', 2, {filter: {fake: null}, order: 10000}, this.handleMovement.bind(null, true));
        dispatch.hook('C_PLAYER_LOCATION', 2, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        // Notify location in action
        dispatch.hook('C_NOTIFY_LOCATION_IN_ACTION', 1, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_NOTIFY_LOCATION_IN_DASH', 1, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        // skills
        dispatch.hook('C_START_SKILL', 3, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_TARGETED_SKILL', 3, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_COMBO_INSTANT_SKILL', 1, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_INSTANCE_SKILL', 2, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_START_INSTANCE_SKILL_EX', 2, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
        dispatch.hook('C_PRESS_SKILL', 1, {filter: {fake: null}, order: -10000}, this.handleMovement.bind(null, false));
    }
}

module.exports = player;