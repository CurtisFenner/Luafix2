{
	"use strict";
	let luafix2 = require("./luafix2.js");
	let htmlshow = require("./htmlshow.js");

	document.getElementById("checkbutton").onclick = function() {
		let options = {
			USE_ROBLOX: USE_ROBLOX,
		};
		let results = luafix2.luafix(
			document.getElementById("source").value, options);

		let src =
			new htmlshow.HTMLShower().show(results.parse);
		document.getElementById("formatted").innerHTML = src;
	}

	// makes debuggin faster
	setTimeout(checkbutton.onclick, 500);
}
