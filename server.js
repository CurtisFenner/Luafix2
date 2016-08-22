var util = require("./extend.js");
var luaparse = require("./luaparse.js");
require("./show.js");
require("./lphelp.js");
require("./antipatterns.js");
require("./magic.js");
require("./variables.js");
require("./redundant.js");
require("./names.js");

// main file
var luafix = require("./luafix2.js");

console.log(luafix(`
local a = 1
if false then
	a = 2
	a = 4
else
	a = 3
end
print(a)
`, {USE_ROBLOX: true}));
