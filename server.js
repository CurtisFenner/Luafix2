"use strict";

let util = require("./extend.js");
let luaparse = require("./luaparse.js");
let show = require("./show.js");
let lphelp = require("./lphelp.js");
let antipatterns = require("./antipatterns.js");
let magic = require("./magic.js");
let variables = require("./variables.js");
let redundant = require("./redundant.js");
let names = require("./names.js");

// main file
let luafix2 = require("./luafix2.js");

console.log(luafix2.luafix(`
local a = 1
if false then
	a = 2
	a = 4
else
	a = 3
end
print(a)
`, {USE_ROBLOX: true}));
