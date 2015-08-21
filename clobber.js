"use strict";
function assert(condition, message) {
	if (!condition) {
		alert("Assertion failed.");
		throw message || "Assertion failed";
	}
}

// Finds the given name on the stack (or returns null if no such variable was
// defined)
function stackFind(name, stack) {
	for (var i = stack.length - 1; i >= 0; i--) {
		if (stack[i][name]) {
			return stack[i][name];
		}
	}
	return null;
}

function clobber(e, stack, lefthandside) {
	assert(stack);
	if (e.type === "Identifier") {
		var iden = stackFind(e.name, stack);
		if (e.name === "_") {
			if (iden && iden.writes + iden.reads + iden.closures !== 0) {
				error(i.purpose + "<code>_</code> was used.",
					"You should only declare this as a placeholder where you don't "
					+ "need the value. "
					+ "Give this variable a descriptive name.", iden);
			}
		} else {
			if (iden) {
				iden.lastClobber = e;
				if (iden.constFor) {
					error("Modifying " + iden.purpose + " <code>" + iden.name + "</code>",
						"<quote>&ldquo;You should never change the value of the control "
						+ "variable [in a numeric for loop]&rdquo;</quote>" +
						"<sup>PIL 4.3.4</sup>", iden)
				}
				if (iden.writes + iden.reads + iden.closures === 0) {
					warn(iden.purpose + "<code>" + e.name + "</code>'s previous value is "
						+ "overwritten, "
						+ "but was not used",
						"You assigned to a variable, but didn't use that value. "
						+ "E.g. <code>a = one(); a = two(); b = a + 1</code> does not use "
						+ "the first assignment. "
						+ "You might have a typo where you used the wrong variable nearby, "
						+ "or this variable may be unnecessary.", iden);
				}
			}
		}
	}
}

// Opens a scope (with a reason) on the stack.
function openScope(stack, reason) {
	stack.push({"$":reason});
}

// Closes a scope on the stack. Emits warnings based on decaying variables.
function closeScope(stack) {
	var top = stack.pop();
	for (var name in top) {
		var i = top[name];
		if (name == "=" && i.writes + i.reads + i.closures !== 0) {
			error(i.purpose + "<code>_</code> was used.",
				"You should only declare this as a placeholder where you don't need "
				+ "the value. "
				+ "Give this variable a descriptive name.");
		}
		if (i.writes + i.reads + i.closures === 0) {
			if (name !== "_") {
				var method = error;
				if (i.purpose === "numeric for index ") {
					method = warn;
				}
				var suffix = "";
				if (i.purpose === "numeric for index " ||
					i.purpose === "generic for variable ") {
					suffix = " If you don't need this variable, you should"
						+ " consider naming it <code>_</code>.";
				}
				method(i.purpose + "<code>" + name +"</code>'s final value was not used",
					"You might have meant to use this variable but made a typo, "
					+ "or this variable may be unnecessary." + suffix, i.lastClobber);
			}
		} else if (i.reads + i.closures == 0) {
			warn(i.purpose + "<code>" + name + "</code> was written to, but never "
				+ "read from.",
				"While <code>name = cat.Name; name = 'Tom';</code> does "
				+ "<em>something</em> to the <em>variable</em> <code>cat</code>, "
				+ "but ultimately this variable does nothing. "
				+ "This variable might be unnecessary, or you might have made a "
				+ "typo somewhere where you meant "
				+ "to use it.");
		}
	}
}

// Creates a new Identifier to put in the stack.
// n is name
// p is purpose (optional)
// home is stack frame that this is being put in
// def is a tree that defines it.
// 
function Identifier(n, p, home, def) {
	if (p) {
		p = p + " ";
	} else {
		p = "";
	}
	return {closures: 0, writes: 0, reads: 0, name: n, purpose: p, home: home,
		definition: def, lastClobber: def};
}

// Local statements
function local(e, stack, purpose) {
	assert(stack);
	if (e.type === "Identifier") {
		var iden = stack.peek()[e.name];
		if (iden && iden.closures + iden.reads + iden.writes === 0) {
			if (e.name != "_") {
				error(iden.purpose + "<code>local " + e.name
					+ "</code> covers up a local variable "
					+ "with the same name, but the previous variable was unused.",
					"You might have a typo where you used the wrong variable nearby, "
					+ "or this variable may be unnecessary.", e);
			}
			iden.purpose = purpose;
		} else if ( (!iden || iden.purpose != purpose) && stackFind(e.name, stack)) {
			if (e.name != "_") {
				error(purpose + "<code>local " + e.name + "</code> covers " + 
					"up a variable in a higher scope", "You might have meant to " +
					"type a different name, or didn't realize that this means you "
					+ " can no longer use " + stackFind(e.name, stack).purpose +
					"<code>" + e.name + "</code>", e);
			}
		}
		stack.peek()[e.name] = Identifier(e.name, purpose, stack.peek(), e);
		return stack.peek()[e.name];
	}
	implementation("local(" + e.type + ", stack)");
}

// Global / assignment statements
function assign(e, stack, purpose) {
	assert(stack);
	clobber(e, stack);
	if (e.type === "Identifier") {
		var iden = stackFind(e.name, stack);
		if (iden) {
			// Does not reset closures
			iden.reads = 0;
			iden.writes = 0;
		} else {
			var size = 0;
			for (var i = 0; i < stack.length; i++) {
				if (stack[i]["$"] !== "do") {
					size++;
				}
			}
			if (size > 3) {
				error("Definition of global " + purpose + " <code>" + e.name
					+ "</code> not at the top level",
					"In general, global (not <code>local</code>) variables " + 
					"should be avoided. You created one here. "
					+ "This may be a typo, where you meant to use a previous "
					+ "variable but accidentally introduced a new one. "
					+ "Otherwise, declare this as <code>local " + e.name +
					"</code>.", e);
			}
			stack[1][e.name] = Identifier(e.name, purpose, stack[1], e);
			var globalsContains = false;
			for (var i = 0; i < stack.globals.length; i++) {
				if (stack.globals[i].name === e.name) {
					globalsContains = true;
				}
			}
			if (globalsContains) {
				warn("Definition of global <code>" + e.name + "</code> after first use",
					"It's best practice to define your variables before using them; if "
					+ "a function uses a global variable, that variable should be defined "
					+ "before that function.", e);
			}
		}
		return;
	}
	implementation("assign(" + e.type + ", stack)");
}

function complainFinalUnderscore(tree) {
	if (tree.peek() && tree.peek().name === "_") {
		error("Ending tuple with <code>_</code>",
			"There's no need to end a tuple with a variable you don't use. "
			+ "Don't include the underscore.");
	}
}

function clobberProcess(tree, stack, write) {
	assert(stack);
	if (tree instanceof Array) {
		complainFinalUnderscore(tree);
		for (var i = 0; i < tree.length; i++) {
			clobberProcess(tree[i], stack);
		}
		return;
	}
	// Is a tree
	var type = tree.type;
	if (type === "NumericLiteral" || type === "NilLiteral"
		|| type === "StringLiteral" || type === "BooleanLiteral") {
		return;
	}

	if (type === "Identifier") {
		var iden = stackFind(tree.name, stack);
		if (!iden) {
			stack.globals.push(tree);
			return;
		}
		if (iden.deprecate) {
			warn("Use of " + iden.purpose + "<code>" + iden.name + "</code>",
				iden.deprecate, tree);
		}
		// Mark it as a "closure" if I am writing and there is a "function"
		// scope between current and declaration.
		var fn = false;
		for (var i = stack.length - 1; stack[i] !== iden.home; i--) {
			if (stack[i]["$"] === "function") {
				fn = true;
			}
		}
		if (fn) {
			iden.closures++; // Uses in a closure rather than number of closures using...
		}
		if (write) {
			// This is a write to a field on that variable.
			iden.writes++;
		} else {
			// This is a read to that variable.
			// (It may also signify a closure)
			iden.reads++;
		}
		return;
	}
	if (type === "MemberExpression") {
		clobberProcess(tree.base, stack, write);
		return;
	}

	if (type === "IndexExpression") {
		var base = tree.base;
		var index = tree.index;
		clobberProcess(base, stack, write);
		clobberProcess(index, stack);
		//
		// Complain about tab[i] in pairs / ipairs:
		if (index.type === "Identifier" && base.type === "Identifier") {
			var indexIdentifier = stackFind(index.name, stack);
			if (indexIdentifier) {
				if (indexIdentifier.purpose === "generic for variable ") {
					if (index.name !== indexIdentifier.variables[0].name) {
						return;
					}
					if (indexIdentifier.iterators[0].type !== "CallExpression") {
						return;
					}
					var iter = indexIdentifier.iterators[0]; //.base;
					if (iter.base.type !== "Identifier") {
						return;
					}
					if (iter.base.name !== "pairs" &&
						iter.base.name !== "ipairs") {
						return;
					}
					if (iter.arguments[0].type !== "Identifier") {
						return;
					}
					var instead = indexIdentifier.variables[1];
					if (instead) {
						tree.suggestion = {
							type:"Identifier", name: instead.name};
						instead = "<code>" + instead.name +
							"</code> is defined for you!";
					} else {
						instead = "<code>" + iter.base.name + "</code> " + 
							"returns a second " + 
							"variable that you didn't keep!";
					}
					if (iter.arguments[0].name === base.name) {
						error("Indexing <code>" + showu( tree ) +
							"</code> when " + instead,
							"You should use the variable provided by <code>" + 
							iter.name + "</code> instead of calculating it " +
							"again; this is cleaner, shorter, and faster.",
							tree);
					}
				}
			}
		}
		return;
	}

	if (type === "FunctionDeclaration") {
		// <FunctionDeclaration>
		// Clobber first. The use of this in the definition will refer to the
		// new one.
		var iden = tree.identifier;
		if (iden) {
			if (iden.type != "Identifier") {
				clobberProcess(iden, stack, true);
			} else {
				if (tree.isLocal) {
					local(iden, stack, "function");
				} else {
					assign(iden, stack, "function");
				}
			}
		}
		// Process body...
		openScope(stack, "function");
		var ps = tree.parameters;
		for (var i = 0; i < ps.length; i++) {
			var parameter = ps[i];
			if (parameter.type === "Identifier") {
				local(parameter, stack, "parameter");
			} else {
				implementation("clobberProcess: Parameter of type " + parameter.type);
			}
		}
		clobberProcess(tree.body, stack);
		closeScope(stack);
		// </FunctionDeclaration>
	} else if (type === "TableConstructorExpression") {
		for (var i = 0; i < tree.fields.length; i++) {
			clobberProcess(tree.fields[i], stack);
		}
	} else if (type === "TableValue") {
		clobberProcess(tree.value, stack);
	} else if (type === "TableKeyString") {
		clobberProcess(tree.value, stack);
	} else if (type === "TableKey") {
		clobberProcess(tree.key, stack);
		clobberProcess(tree.value, stack);
	} else if (type === "LocalStatement") {
		// <LocalStatement>
		for (var i = 0; i < tree.init.length; i++) {
			clobberProcess(tree.init[i], stack);
		}
		var vars = tree.variables;
		complainFinalUnderscore(vars);
		for (var i = 0; i < vars.length; i++) {
			if (vars[i].type === "Identifier") {
				local(vars[i], stack);
			} else {
				clobberProcess(vars[i], stack, true);
			}
		}
		// </LocalStatement>
	} else if (type === "AssignmentStatement") {
		// <AssignmentStatement>
		var vars = tree.variables;
		complainFinalUnderscore(vars);
		for (var i = 0; i < vars.length; i++) {
			if (vars[i].type !== "Identifier") {
				clobberProcess(vars[i], stack, true);
			}
		}
		for (var i = 0; i < tree.init.length; i++) {
			clobberProcess(tree.init[i], stack);
		}
		for (var i = 0; i < vars.length; i++){
			if (vars[i].type === "Identifier") {
				assign(vars[i], stack);
			}
		}
		// </AssignmentStatement>
	} else if (type === "StringCallExpression") {
		clobberProcess(tree.base, stack);
	} else if (type === "TableCallExpression") {
		clobberProcess(tree.base, stack);
		clobberProcess(tree.arguments, stack);
	} else if (type === "CallExpression") {
		// <CallExpression>
		clobberProcess(tree.base, stack);
		for (var i = 0; i < tree.arguments.length; i++) {
			clobberProcess(tree.arguments[i], stack);
		}
		// </CallExpression>
	} else if (type === "CallStatement") {
		// <CallStatement>
		clobberProcess(tree.expression, stack);
		// </CallStatement>
	} else if (type === "IfStatement") {
		// <IfStatement>
		for (var i = 0; i < tree.clauses.length; i++) {
			openScope(stack, "if");
			clobberProcess(tree.clauses[i], stack);
			closeScope(stack);
		}
		// </IfStatement>
	} else if (type === "ElseifClause") {
		// <ElseifClause>
		// condition then body
		clobberProcess(tree.condition, stack);
		clobberProcess(tree.body, stack);
		// </ElseifClause>
	} else if (type === "ElseClause") {
		clobberProcess(tree.body, stack);
	} else if (type === "IfClause") {
		// <IfClause>
		// condition then body
		clobberProcess(tree.condition, stack);
		clobberProcess(tree.body, stack);
		// </IfClause>
	} else if (type === "ReturnStatement") {
		clobberProcess(tree.arguments, stack);
	} else if (type === "BreakStatement") {
		// Do nothing...
	} else if (type === "BinaryExpression" || type === "LogicalExpression") {
		clobberProcess(tree.left, stack);
		clobberProcess(tree.right, stack);
	} else if (type === "UnaryExpression") {
		clobberProcess(tree.argument, stack);
	} else if (type === "DoStatement") {
		openScope(stack, "do");
		clobberProcess(tree.body, stack);
		closeScope(stack);
	} else if (type === "WhileStatement") {
		clobberProcess(tree.condition, stack);
		openScope(stack, "while");
		clobberProcess(tree.body, stack);
		closeScope(stack);
		clobberProcess(tree.condition, stack);
		openScope(stack, "while");
		clobberProcess(tree.body, stack);
		closeScope(stack);
	} else if (type === "RepeatStatement") {
		openScope(stack, "repeat");
		clobberProcess(tree.body, stack);
		clobberProcess(tree.condition, stack);
		closeScope(stack);
		openScope(stack, "repeat");
		clobberProcess(tree.body, stack);
		clobberProcess(tree.condition, stack);
		closeScope(stack);
	} else if (type === "ForNumericStatement") {
		// Introduce a new variable...
		clobberProcess(tree.start, stack);
		clobberProcess(tree.end, stack);
		if (tree.step) {
			clobberProcess(tree.step, stack);
		}
		// Iterate body twice
		for (var iteration = 0; iteration < 2; iteration++) {
			openScope(stack, "for");
			local(tree.variable, stack, "numeric for index");
			stackFind(tree.variable.name, stack).constFor = true;
			clobberProcess(tree.body, stack);
			closeScope(stack);
		}
	} else if (type === "ForGenericStatement") {
		clobberProcess( tree.iterators, stack );
		// Iterate body twice
		for (var iteration = 0; iteration < 2; iteration++) {
			openScope(stack, "for");
			for (var i = 0; i < tree.variables.length; i++) {
				var iden = local(tree.variables[i], stack, "generic for variable");
				iden.iterators = tree.iterators;
				iden.variables = tree.variables;
			}
			clobberProcess( tree.body, stack);
			closeScope(stack);
		}
	} else {
		implementation("Unknown: clobberProcess(" + tree.type + ")");
	}
}

function shoveVariables(g, ns, p) {
	for (var i = 0; i < ns.length; i++) {
		g[ns[i]] = Identifier(ns[i], p, g);
	}
}

var qs;
function clobberStage(parse) {
	var globals = {};
	shoveVariables(globals,
		["print", "table", "math", "string", "pcall", "loadstring", "pairs",
		"ipairs", "next", "_G", "coroutine", "ypcall", "xpcall", "io",
		"_VERSION", "package", "tostring", "unpack", "require", "getfenv",
		"setmetatable", "assert", "tonumber", "rawequal", "collectgarbage",
		"getmetatable", "module", "rawset", "debug", "newproxy", "type",
		"select", "gcinfo", "rawget", "load", "error", "loadfile", "dofile",
		"setfenv"],
		"built-in");
	globals.loadstring.deprecate = "Don't use <code>loadstring</code> unless " +
		"<strong>absolutely</strong> necessary.";
	globals.pcall.deprecate = "Avoid the use of <code>pcall</code>; if your " +
		"code is producing errors, you should address those errors rather than " +
		"cover them up.";
	globals.xpcall.deprecate = "Avoid the use of <code>xpcall</code>; if your " +
		"code is producing errors, you should address those errors rather than " +
		"cover them up.";
	globals.setfenv.deprecate = "Avoid using <code>setfenv</code>. Instead, store" +
		"values in a table.";
	globals.getfenv.deprecate = "Avoid using <code>getfenv</code>. Instead, store" +
		"values in a table.";
	if (USE_ROBLOX) {
		delete globals.debug;
		delete globals.module;
		shoveVariables(globals,
			["workspace", "Workspace", "Game", "game", "wait", "script",
			"BrickColor", "Color3", "Vector3", "CFrame", "Vector2", "UDim2",
			"UDim", "Instance", "spawn", "delay", "Spawn", "tick", "time",
			"version", "Version", "Wait", "warn",
			"PluginManager", "plugin", "LoadRobloxLibrary", "settings",
			"Stats", "stats", "UserSettings",
			"elapsedTime", "ElapsedTime", "LoadLibrary", "printidentity",
			"Enum", "Ray"],
			"ROBLOX built-in");
		console.log(globals);
		globals.Workspace.deprecate = "ROBLOX prefers lowercase " + 
			"<code>workspace</code> to <code>Workspace</code>";
		globals.Game.deprecate = "ROBLOX prefers lowercase " + 
			"<code>game</code> to <code>Game</code>";
		globals.ypcall.deprecate = "Avoid the use of <code>ypcall</code>; if your " +
			"code is producing errors, you should address those errors rather than " +
			"cover them up.";
		globals.load.deprecate = "<code>load</code> is not usable in ROBLOX";
		globals.loadfile.deprecate = "<code>loadfile</code> is not usable in ROBLOX";
		globals.dofile.deprecate = "<code>dofile</code> is not usable in ROBLOX";
		globals._G.deprecate = "<code>_G</code> shouldn't be used in ROBLOX. " +
			"Use Bindable/Remote Functions/Events"
	}
	var stack = [globals, {}, {}]; // [1] is globals. peek gives locals.
	stack.globals = []; // Globals that are requested but did not exist.
	// Descend through and determine if there are any variables that are unused
	// before being clobbered.
	clobberProcess(parse.body, stack);
	// Handle globals that were used before being defined.
	for (var i = 0; i < stack.globals.length; i++) {
		var g = stack.globals[i];
		var name = g.name;
		var iden = stackFind(name, stack);
		if (!iden) {
			error("Use of undefined variable <code>" + name + "</code>",
				"No such variable exists. Did you mean to type a different name? "
				+ "Did you forget to declare this variable?", g);
		} else {
			iden.reads++;
		}
	}
	closeScope(stack);
	closeScope(stack);
}