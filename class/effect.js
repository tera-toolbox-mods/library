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
		dispatch.hook('S_HOLD_ABNORMALITY_ADD', 2, DEFAULT_HOOK_SETTINGS, e=> {
			this.permanentBuffs[e.id] = true;
		});

		dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 1, DEFAULT_HOOK_SETTINGS, e=> {
			this.permanentBuffs = {};
        });
        
        // Glyph/Crest
		dispatch.hook("S_CREST_INFO", 1, DEFAULT_HOOK_SETTINGS, e=>{
			this.glyphs = {};
			for(let glyph of e.glyphs){
				if(glyph.enabled) this.glyphs[glyph.id] = true;
			}
		});

		dispatch.hook('S_CREST_APPLY', 1, DEFAULT_HOOK_SETTINGS, e=> {
			this.glyphs[e.id] = e.enabled?true:false;
        });
        
        // Abnormality
        // Begin & Refresh
        this.abnormalityApply = (e) => {
            if(mods.player.isMe(e.target)) {
                this.abnormals[e.id] = true;
            }
        }
        dispatch.hook('S_ABNORMALITY_BEGIN', 3, DEFAULT_HOOK_SETTINGS, this.abnormalityApply);
        dispatch.hook('S_ABNORMALITY_REFRESH', 1, DEFAULT_HOOK_SETTINGS, this.abnormalityApply);

        // End
        this.abnormalityEnd = (e) => {
            if(mods.player.isMe(e.target)) {
                this.abnormals[e.id] = false;
            }
        }
        dispatch.hook('S_ABNORMALITY_END', 1, DEFAULT_HOOK_SETTINGS, this.abnormalityEnd);
    }
}

module.exports = Effect;
