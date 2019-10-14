const DEFAULT_HOOK_SETTINGS = {order: 1000, filter: {fake: null}};

class Effect{
    constructor(dispatch, mods) {
        // Abnormalities active
        this.abnormals = {};
        // Glyphs
        this.glyphs = {};
        // "Permanent" buffs
        this.permanentBuffs = {};

        // Functions
        this.hasEffect = (id) => (this.glyphs[id] || this.permanentBuffs[id] || this.abnormals[id]);
		this.hasAbnormality = (id) => this.abnormals[id] === true;
		this.hasGlyph = (id) => this.glyphs[id] === true;
		this.hasBuff = (id) => this.permanentBuffs[id] === true;

		this.getAbnormalities = () => this.abnormals;
		this.getGlyphs = () => this.glyphs;
		this.getBuffs = () => this.permanentBuffs;
        
        // Reset
        this.reset = (e) => {
            this.abnormals = {};
            this.glyphs = {};
            this.permanentBuffs = {};
        }
        dispatch.hook('S_LOGIN', 'raw', DEFAULT_HOOK_SETTINGS, this.reset);

        // Perma buffs
		dispatch.hook(...mods.packet.get_all("S_HOLD_ABNORMALITY_ADD"), DEFAULT_HOOK_SETTINGS, e=> {
			this.permanentBuffs[e.id] = true;
		});

		dispatch.hook(...mods.packet.get_all("S_CLEAR_ALL_HOLDED_ABNORMALITY"), DEFAULT_HOOK_SETTINGS, e=> {
			this.permanentBuffs = {};
        });
        
        // Glyph/Crest
		dispatch.hook(...mods.packet.get_all("S_CREST_INFO"), DEFAULT_HOOK_SETTINGS, e=>{
			this.glyphs = {};
			for(let glyph of e.crests){
				if(glyph.enable) this.glyphs[glyph.id] = true;
			}
		});

		dispatch.hook(...mods.packet.get_all("S_CREST_APPLY"), DEFAULT_HOOK_SETTINGS, e=> {
			this.glyphs[e.id] = e.enable?true:false;
        });
        
        // Abnormality
        // Begin & Refresh
        this.abnormalityApply = (e) => {
            if(mods.player.isMe(e.target)) {
                this.abnormals[e.id] = true;
            }
        }
        dispatch.hook(...mods.packet.get_all("S_ABNORMALITY_BEGIN"), DEFAULT_HOOK_SETTINGS, this.abnormalityApply);
        dispatch.hook(...mods.packet.get_all("S_ABNORMALITY_REFRESH"), DEFAULT_HOOK_SETTINGS, this.abnormalityApply);

        // End
        this.abnormalityEnd = (e) => {
            if(mods.player.isMe(e.target)) {
                this.abnormals[e.id] = false;
            }
        }
        dispatch.hook(...mods.packet.get_all("S_ABNORMALITY_END"), DEFAULT_HOOK_SETTINGS, this.abnormalityEnd);
    }
}

module.exports = Effect;
