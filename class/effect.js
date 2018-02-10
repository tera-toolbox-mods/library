const DEFAULT_HOOK_SETTINGS = {order: -1000, filter: {fake: null}};

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
		this.getAbnormalities = () => this.abnormals;
		this.getGlyphs = () => this.glyphs;
        this.getBuffs = () => this.permanentBuffs;
        
        // Reset
        this.reset = (e) => {
            this.abnormals = {};
            this.glyphs = {};
            this.permanentBuffs = {};
        }
        dispatch.hook('S_LOGIN', DEFAULT_HOOK_SETTINGS, this.reset);

        // Perma buffs
		dispatch.hook('S_HOLD_ABNORMALITY_ADD', 1, e=> {
			this.permanentBuffs[e.id] = true;
		});

		dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 1, e=> {
			this.permanentBuffs = {};
        });
        
        // Glyph/Crest
		dispatch.hook("S_CREST_INFO", 1, e=>{
			this.glyphs = {};
			for(let glyph of e.glyphs){
				if(glyph.enabled) this.glyphs[glyph.id] = true;
			}
		});

		dispatch.hook('S_CREST_APPLY', 1, e=> {
			this.glyphs[e.id] = boolean(e.enabled);
		});
    }
}

module.exports = Effect;
