{
	"use strict";
	let luafix2 = require("./luafix2.js");
	let show = require("./show.js");

	document.getElementById("checkbutton").onclick = function() {
		let options = {
			USE_ROBLOX: USE_ROBLOX,
		};
		var results = luafix2.luafix(
			document.getElementById("source").value, options);

		document.getElementById("formatted").innerHTML =
			new show.PlainHTMLShower().show(results.parse);
	}
}
