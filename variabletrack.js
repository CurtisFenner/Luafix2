// This whole file is garbage.

"use strict";
// Type:

var TYPE_CHECK = false;

var NIL, NUMBER, STRING, BOOLEAN;
NIL = {sort: "nil"};
NUMBER = {sort: "number"};
// STRING = {sort: "string", index: {"string": makeFUNCTION(["string", "X", "Y"], [STRING, NIL]) }};
BOOLEAN = {sort: "boolean"};


////////////////////////////////////////////////////////////////////////////////
function variableStage(parse, source) {
	var globals = {};
	globals.wait = {
		sort: "function",
		inputs: [{sort:"number"}, {sort: "nil"}],
		outputs: [{sort:"number"}] // TODO FIXME HACK it's a tuple
	};
	globals.print = {
		sort: "function",
		outputs: [{sort:"nil"}]
	};
	globals.string = {
		sort: "table",
		index: {
			string: makeFUNCTION([]) // TODO FIXME HACK finish tuples
		}
	};
	globals.os = {
		sort: "table",
		index: {
			string: makeFUNCTION([]) // TODO FIXME HACK finish tuples
		}
	}
	if (USE_ROBLOX) {
		globals.game = {
			sort: "roblox",
			class: "DataModel"
		};
		globals.workspace = {
			sort: "roblox",
			class: "Workspace"
		};
		globals.script = {
			sort: "roblox",
			class: "Script" // LocalScript?
		}
	};
	var stack = [globals, {/*Top locals*/}];
	lprecurse(parse, trackVariables, openBlock, closeBlock, stack);
	closeBlock(parse, stack);
}


////////////////////////////////////////////////////////////////////////////////

function makeFUNCTION(sorts, out) {
	return {
		sort: "function",
		callIn: sorts, // To be checked. Sorts, not types -- just strings.
		callOut: out // Result.
	};
}

function makeTABLE() {
	return {
		sort: "table",
		index: {}
	};
}

function jsonEqual(a, b) {
	if (a === b) {
		return true;
	}
	if (typeof a != typeof b) {
		return false;
	}
	if (typeof a != typeof {}) {
		return false;
	}
	for (p in a) {
		if (!jsonEqual(a[p], b[p])) {
			return false;
		}
	}
	return true;
}

function typeDifference(a, b) {
	var bs = [];
	for (var i = 0; i < b.length; i++) {
		bs.push(JSON.stringify(b[i]));
	}
	var r = [];
	for (var i = 0; i < a.length; i++) {
		var as = JSON.stringify(a[i]);
		if (bs.indexOf(as) < 0) {
			r.push(a[i]);
		}
	}
	return r;
}

function typeUnion(a, b) {
	var made = {};
	var r = [];
	var c = a.concat(b);
	for (var i = 0; i < c.length; i++) {
		var s = JSON.stringify(c[i]);
		if (made[s]) {
			r.push(c[i]);
		}
		made[s] = true;
	}
	// Returns a join of a and b but with duplicates removed
	return r;
}

// REQUIRES: tab is (reference to) the TYPE of a table
// index is an EXPRESSION
// valueType is TYPE
function setTABLE(tab, index, valueType, stack) {
	var typ = getType(index);
	for (var i = 0; i < typ.length; i++) {
		var inSort = typ[i].sort;
		// typ is only one thing, but valueType is expected to be a list.
		var currently = tab.index[inSort];
		if (currently) {
			tab.index[inSort] = typeUnion(currently, valueType);
		} else {
			tab.index[inSort] = currently.slice();
		}
	}
}

// REQUIRES: tab is the TYPE of a table. index is a VALUE (not a type)
// EFFECTS: returns a REFERENCE to the type
function getTABLE(tab, index, stack) {
	// Index is a VALUE, not a type
	var typ = getType(index, stack);
	return tab.index[typ] || [NIL];
}

// stackframe.apple.call( "string" , "number" )
// is the type of indexing apple by a string and a number
// stackframe.apple.index["string"] is the type of indexing apple by a string
// stackframe.apple.op["+"]("string", <type of apple>) is type of `"cat" + apple` 
// (metatable)


// Makes a new identifier on the stack: on the top if local, bottom if not.
// home is a string identifying what "kind" of thing it is:
// for, variable, parameter, function.
function makeStackIdentifier(name, stack, local, home) {
	var find = findStackIdentifier(name, stack);
	if (local && find && find.level == stack.length - 1) {
		warn("<code>local " + name +
			"</code> is redefined as a local variable in the same scope.");
	}
	if (local && find && find.level === 0) {
		warn("<code>local " + name + "</code> covers up a global variable");
	}
	var place = local ? (stack.length - 1) : 0;
	stack[place][name] = {type: [NIL], name: name, level: place, home:home, uses: 0};
	return stack[place][name];
}

// Returns a reference to the variable with the given name on the stack.
// Returns nothing when the variable hasn't been defined.
function findStackIdentifier(name, stack) {
	for (var i = stack.length - 1; i >= 0; i--) {
		var frame = stack[i];
		if (frame[name]) {
			frame[name].uses++;
			return frame[name];
		}
	}
}

function identifierSetType(identifier, type) {
	if (type instanceof Array) {
		identifier.type = type;
	} else {
		identifier.type = [type];
	}
}

function identifierAddToType(identifier, type) {
	alert(JSON.stringify(identifier));
	identifier.type.push(type);
}

// Returns the object for the index in the tuple (0 indexed)
function tupleExtract(tuple, index) {
	return tuple[index];
}

function getAllIdentifiers(stack) {
	var vars = [];
	for (var i = stack.length - 1; i >= 0; i--) {
		for (var lname in stack[i]) {
			vars.push(lname);
		}
	}
	return vars;
}


function getType(value, stack) {
	if (!value) {
		// Undefined value!
		return [NIL];
	}
	var give = [];
	give["NumericLiteral"] = [NUMBER];
	give["StringLiteral"] = [STRING];
	give["BooleanLiteral"] = [BOOLEAN];
	give["TableConstructorExpression"] = makeTABLE(); // TODO FIXME HACK
	give["NilLiteral"] = [NIL];

	if (give[value.type]) {
		return give[value.type];
	}

	if (value.type === "Identifier") {
		var name = value.name;
		var obj = findStackIdentifier(name, stack);
		if (obj) {
			return obj.type;
		} else {
			var variables = getAllIdentifiers(stack);
			variables = name.closest(variables).slice(0, 5);
			var didmean = wrappedList(variables, "<code>", "</code>", "or");
			error("Use of undefined variable " + name,
				"Did you maybe mean " + didmean + "?");
			return [NIL]; 
		}
	}

	if (value.type === "BinaryExpression") {
		var op = value.operator;
		if (op == "..") {
			return [STRING]; // Metatables?
		}
		if (op === "+" || op === "*" || op === "/"
			|| op === "%" || op === "^" || op === "-") {
			return [NUMBER]; // TODO FIXME HACK metatables
		}
	}
	if (value.type === "LogicalExpression") {
		var left = getType(value.left);
		var right = getType(value.right);
		if (difference(left, [STRING, NUMBER, "table", "function"]).length === 0) {
			var op = value.operator;
			if (op === "or") {
				error("Truthy Value in <code>or</code>",
					show(tree) + " will always be " + show(tree.left));
				return left;
			} else {
				error("Truthy Value in <code>and</code>",
					show(tree) + " will always be " + show(tree.right));
				return right;
			}
		}
		return union(left, getType(value.right));
	}

	if (value.type === "CallExpression") {
		var base = getType(value.base, stack);
		for (var i = 0; i < base.length; i++) {
			if (base[i].sort !== "function") {
				if (TYPE_CHECK) {
					error("Cannot call <code>" + show(value.base) + "</code>, a " + base[i].sort + " value.");
				}
			}
		}
		// 
		var args = [];
		for (var i = 0; i < value.arguments.length; i++) {
			args.push(getType(value.arguments[i], stack));
		}
	}
	if (TYPE_CHECK) {
		implementation("Can't determine type of " + value.type);
	}
	return [NIL];
}

function trackVariables(tree, stack) {
	"use strict";
	if (tree.type === "Identifier") {
		var typ = getType(tree, stack);
	}
	if (tree.type === "ForNumericStatement") {
		// tree.variable is an identifier
		makeStackIdentifier(tree.variable.name, stack, true, "numeric for");
	}
	if (tree.type === "FunctionDeclaration") {
		if (tree.identifier) {
			if (tree.identifier.type === "Identifier") {
				// identifier is an Identifier
				// parameters is a list of Identifiers
				// body is a list of statements
				var iden = makeStackIdentifier(tree.identifier.name, stack, tree.isLocal, "function");
				identifierSetType(iden, {sort:"function"});
			} else {
				implementation("Function definition given " + tree.identifier.type);
			}
		} else {
			// An anonymous function
		}
		for (var i = 0; i < tree.parameters.length; i++) {
			makeStackIdentifier(tree.parameters[i].name, stack, true, "parameter");
		}
	}
	if (tree.type === "AssignmentStatement") {
		// Identifiers on left, values on right.
		for (var i = 0; i < tree.variables.length; i++) {
			var value = tupleExtract(tree.init, i);
			var newType = getType(value, stack);
			//
			var variable = tree.variables[i];
			if (variable.type === "Identifier") {
				var reference = findStackIdentifier(variable.name, stack);
				// Decrement its reference
				if (!reference) {
					if (stack.length > 2) {
						var variables = variable.name.closest(getAllIdentifiers(stack)).slice(0, 3);
						var didmean = wrappedList(variables, "<code>", "</code>", "or");
						error("Definition of global <code>" + variable.name + "</code> not at the top level",
							"Did you maybe mean one of " + didmean +
							"? Otherwise, consider defining variable as <code>local " +
							variable.name + "</code> instead.");
					}
					reference = makeStackIdentifier(variable.name, stack);
				} else {
					reference.type = newType;
					reference.uses--;
					if (reference.uses === 0) {
						error("The variable <code>" + variable.name + 
							"</code> is clobbered by assignment, but " +
							"its previous value was unused",
							"For example, if you wrote <code>a = one();" +
							" a = two()</code> the first value of <code>one()" + 
							"</code> gets forgotten. This was very likely a mistake.");
					}
				}
				reference.uses = 0; // It's a "new" value
				//
				// info("Type of " + (variable.name || "...") + " is " + JSON.stringify(newType));
			} else {
				implementation("Cannot Assign to ", variable.type);
			}
		}
	}
	if (tree.type === "LocalStatement") {
		// Identifiers on LEFT get values on RIGHT
		for (var i = 0; i < tree.variables.length; i++) {
			var variable = tree.variables[i];
			// Must be identifier; is a localstatement
			var newType = getType( tupleExtract(tree.init, i), stack );
			//
			var newIden = makeStackIdentifier( variable.name, stack, true );
			newIden.type = newType;
			newIden.uses--;
			//
			// info("Type of " + (variable.name || "...") + " is ",
			// 	JSON.stringify(newType));
		}
	}

}

function closeBlock(tree, stack) {
	var top = stack.pop();
	for (var varname in top) {
		// Check uses?
		var variable = top[varname];
		console.log(varname, variable.uses);
		if (variable.uses === 0) {
			error("<code>" + varname + "</code> is unused.",
				"You probably meant to use this variable, but you didn't." + JSON.stringify(variable));
		}
	}
}

function openBlock(tree, stack) {
	stack.push({});
}