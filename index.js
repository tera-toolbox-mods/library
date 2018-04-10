const Command = require('command');
const LOAD_MODULES = ['entity', 'player', 'effect'];
const PRE_LOAD_MODULES = ['library'];

class Library{
	constructor(dispatch) {
        this.mods = {};
		this.command = Command(dispatch);
		this.cmd = this.command;

		for(let name of PRE_LOAD_MODULES) {
			try {
				let tmp = require(`./class/${name}`);
				this.mods[name] = new tmp(dispatch, this.mods);
				this[name] = this.mods[name];
			}catch(e) {
				console.log(e);
				console.log(`[Library] Failed to load module ${name}. Will close.`);
				process.exit();
			}
		}

		// C_LOGIN_ARBITER for ethical purposes. :eyes:
		dispatch.hook('C_LOGIN_ARBITER', 'raw', ()=> {
			for(let name of LOAD_MODULES) {
				try {
					let tmp = require(`./class/${name}`);
					this.mods[name] = new tmp(dispatch, this.mods);
					this[name] = this.mods[name];
				}catch(e) {
					console.log(e);
					console.log(`[Library] Failed to load module ${name}. Will close.`);
					process.exit();
				}
			}
		});
	}
}

let map = new WeakMap();

module.exports = function Require(dispatch) {
	if(map.has(dispatch.base)) return map.get(dispatch.base);

	let library = new Library(dispatch);
	map.set(dispatch.base, library);
	return library;
}
