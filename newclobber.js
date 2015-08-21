// -> [variable]
function getGlobals() {
	function prefer(name, better) {
		return bad(name, "Prefer <code>" + better + "</code> over <code>" + name + "</code>");
	}
	function okay(name, message) {
		return {name:name, message:message, kind:"warning"};
	}
	function bad(name, message) {
		return {name:name, message:message, kind:"error"};
	}
	function fake(list) {
		var t = [];
		for (var i = 0; i < list.length; i++) {
			var v = {name: list[i], uses: [{}], assignments: [{}], definition: {}};
			if (list[i].message) {
				v.name = list[i].name;
				v.message = list[i].message;
				v.messageKind = list[i].kind;
			}
			t.push(v);
		}
		return t;
	}
	if (USE_ROBLOX) {
		return fake(["assert", "collectgarbage", "dofile", "error", "_G", "gcinfo",
			bad("getfenv", "Avoid interacting with environments. If you must dynamically get values, just use a table."),
			"getmetatable", "ipairs",
			bad("load", "Don't use <code>load</code> in ROBLOX"),
			bad("loadfile", "Don't use <code>loadfile</code> in ROBLOX"),
			bad("loadstring", "Avoid using <code>loadstring</code> in all cases. It's dangerous and messy."),
			"newproxy", okay("next", "Prefer using the clearer <code>pairs</code> to next."), "os", "pairs",
			okay("pcall", "Write code that doesn't error rather than use <code>pcall</code> to cover it up."),
			"print", "rawequal", "rawget",
			"rawset", "select", "setfenv", "setmetatable", "tonumber", "tostring", "unpack",
			"type", "_VERSION", "xpcall",
			"string", "table", "math", "coroutine",
			prefer("Delay", "delay"), "delay", "elapsedTime", prefer("ElapsedTime", "elapsedTime"),
			"LoadLibrary", "printidentity",
			"require", prefer("Spawn", "spawn"), "spawn", "tick", "time", "Version", "version", "Wait", "wait",
			"warn", "ypcall",
			"plugin", "script", "game",
			prefer("Game", "game"),
			"workspace", prefer("Workspace", "workspace"),
			"BrickColor", "Color3", "CFrame", "Vector3", "Region3", "Vector2", "UDim2",
			"Instance", "UDim", "Ray", "Enum"]);
	} else {
		return fake([
			"string", "xpcall", "package", "tostring", "print", "os", "unpack", "require",
			"getfenv", "setmetatable", "next", "assert", "tonumber", "io", "rawequal",
			"collectgarbage", "arg", "getmetatable", "module", "rawset", "math", "debug",
			"pcall", "table", "newproxy", "type", "coroutine", "_G", "select", "gcinfo",
			"pairs", "rawget", "loadstring", "ipairs", "_VERSION", "dofile", "setfenv",
			"load", "error", "loadfile"]);
	}
}

// String -> variable
function newVariable(name) {
	if (!name) {
		throw "newVariable not given name";
	}
	return {name: name, uses: [], assignments: []};
}

// (stack, String, boolean, AST) -> variable
function stackFind(stack, name, nopush, iden) {
	assert(stack.length >= 2, "stack has separate globals");
	for (var i = stack.length - 1; i >= 0; i--) {
		var scope = stack[i];
		for (var j = scope.length - 1; j >= 0; j--) {
			if (scope[j].name == name) {
				return scope[j];
			}
		}
	}
	if (!nopush) {
		var variable = newVariable(name);
		stack[1].push(variable);
		if (stack.length > 3+1 && nopush === 0) {
			// TODO: Ensure there is actually a FUNCTION on the stack
			// (warn for other controls)
			// built in globals : globals : top locals : this function
			error("Definition of global <code>" + name + "</code> in a function",
				"If this a new variable, you should define it to be <code>local</code>. Otherwise, this might be a typo.",
				iden);
		}
		return variable;
	}
}

function stackLocal(stack, name, def, up) {
	var shadowed = stackFind(stack, name, true);
	if (shadowed) {
		warn("<code>" + name +"</code> shadows another variable",
			"You have 'covered up' one variable with another with the same name.", def);
	}
	var v = newVariable(name);
	v.definition = def;
	// TODO: warn about shadowing
	up = up || 0;
	stack[stack.length - 1 - up].push(v);
	return v;
}

function openBlock(tree, stack) {
	stack.push([]);
	if (tree.type === "FunctionDeclaration") {
		// Push parameters onto stack
		for (var i = 0; i < tree.parameters.length; i++) {
			if (tree.parameters[i].type === "VarargLiteral") {
				stackLocal(stack, "...", tree.parameters[i]);
			} else {
				stackLocal(stack, tree.parameters[i].name, tree.parameters[i]);
			}
		}
	}
}

function functionContext(tree) {
	if (!tree.parent) {
		return tree;
	} else if (tree.type == "FunctionDeclaration") {
		return tree;
	} else {
		if (tree.property == "identifier") {
			// Variables used in definition of function aren't part of
			// the function's scope.
			return functionContext(tree.parent.parent);
		}
		return functionContext(tree.parent);
	}
}


function checkVariable(variable) {
	// Search for unused assignments
	// We don't really know for any variables that have been leaked to closures...
	var funs = [];
	var closes = [];
	var all = variable.uses.concat(variable.assignments);
	for (var i = 0; i < all.length; i++) {
		var fun = functionContext(all[i]);
		if (!funs.contains(fun)) {
			funs.push(fun);
			closes.push(all[i]);
		}
	}
	if (funs.length > 1 && variable.assignments.length > 1) {
		info("<code>" + variable.name + "</code> is used in a closure ",
			"Unable to check for unused assignments.", closes[1]);
		console.log("closure IDENS:",variable.name, closes);
		console.log("closure FUNS: ",variable.name, funs);
		return;
	}
}

function checkScope(scope) {
	for (var i = 0; i < scope.length; i++) {
		checkVariable(scope[i]);
	}
}

function closeBlock(tree, stack) {
	checkScope(stack.pop());
}
function matchIdentifier(tree, stack) {
	if (tree.type === "Identifier") {
		if (tree.property == "variables" && tree.parent.type == "LocalStatement") {
			var variable = stackLocal(stack, tree.name, tree);
		} else if (tree.property === "variables") {
			var variable = stackFind(stack, tree.name, 0, tree);
			variable.assignments.push(tree);
			tree.variable = variable;
		} else {
			var variable = stackFind(stack, tree.name, false, tree);
			variable.uses.push(tree);
			tree.variable = variable;
			if (variable.message) {
				message(variable.message, "", variable.messageKind, tree);
			}
		}
	} else if (tree.type === "FunctionDeclaration") {
		var iden = tree.identifier;
		if (iden && iden.type === "Identifier") {
			var variable = tree.isLocal
				? stackLocal(stack, iden.name, iden, 1)
				: stackFind(stack, iden.name, 0, iden);
			variable.assignments.push(tree.identifier);
		} else {
			// Anonymous function or member expression
		}
	} else if (tree.type === "ForGenericStatement") {
		for (var i = 0; i < tree.variables.length; i++) {
			stackLocal(stack, tree.variables[i].name, tree.variables[i]);
		}
	} else if (tree.type === "ForNumericStatement") {
		stackLocal(stack, tree.variable.name, tree.variable);
	}
}

function setupClobber(tree) {
	var stack = [getGlobals(), []];
	// Capture all stack information
	lprecurse(tree, matchIdentifier, openBlock, closeBlock, stack);
	// Complain about undefined / redefined globals:
	var globals = stack[1];
	for (var n = 0; n < globals.length; n++) {
		var variable = globals[n];
		var name = variable.name;
		if (variable.assignments.length == 0) {
			for (var i = 0; i < variable.uses.length; i++) {
				error("Undefined variable <code>" + name + "</code>",
					"This variable was used, but was never defined. You likely made a typo, or forgot to define it.",
					variable.uses[i]);
			}
		} else if (variable.assignments.length > 1) {
			for (var i = 1; i < variable.assignments.length; i++) {
				warn("Redefinition of global <code>" + name + "</code>",
					"You redefined this global. Consider using a local variable for non-constants",
					variable.assignments[i]);
			}
		}
		variable.definition = variable.assignments[0];
	}
	checkScope(globals);
	// Unused assignments checked in "uses.js". Most of this logic should move into there.
}


function clobberStage(tree) {
	var stack = [];
	info("BEGINNING OF CLOBBER");
	setupClobber(tree, stack);
	info("END OF CLOBBER");
}
