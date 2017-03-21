{
	"use strict";
	let luafix2 = require("./luafix2.js");
	let htmlshow = require("./htmlshow.js");

	document.getElementById("checkbutton").onclick = function() {
		let options = {
			USE_ROBLOX: USE_ROBLOX,
		};

		let input = document.getElementById("source").value;
		let analysis = luafix2.luafix(input, options);

		let src = new htmlshow.HTMLShower().show(analysis.parse);
		document.getElementById("formatted").innerHTML = src;
	}

	// makes debuggin faster
	setTimeout(checkbutton.onclick, 100);
}
