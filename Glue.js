// For browserifying node modules.

// REQUIREMENTS:

// Modules must not modify module.exports.

// Required are initialized lazily, so they cannot be referred to outside of
// functions.

{
	let exp = null;
	var module = {
		get exports() {
			return exp;
		},
		set exports(_) {
			throw new Error("module.exports is locked by Glue.js");
		},
	}
	let map = {};
	function require(name) {
		if (map[name] === undefined) {
			map[name] = {}
		}
		return map[name];
	}

	function GLUE(name) {
		if (map[name] === undefined) {
			map[name] = {}
		}
		exp = map[name];
	}
}
