'use strict';
{
let lphelp = require("./lphelp.js");

function assert(value, string) {
	if (!value) {
		throw string;
	}
}

function Variable(name) {
	if (!name) {
		throw "invalid name";
	}
	this.name = name;
	this.value = "uninitialized";
	this.assignments = [];
	//this.assignment = "constructor...";
}
Variable.prototype.assign = function assign(value, assignment, mayIgnore) {
	// value: the value to be assigned
	// (TODO deal with table key/element values)
	// assignment: the Identifier in the statement causing this assignment
	// mayIgnore: do not warn about value being unused
	this.check();
	this.value = value;
	this.assignments = [assignment];
	if (!assignment) {
		throw "no assignment given to assign";
	}
	assignment.reads = assignment.reads || [];
	assignment.mayIgnore = mayIgnore; // TODO check this
	assignment.definition = this.definition;
};
Variable.prototype.copy = function copyVariable() {
	var v = new Variable(this.name);
	v.value = this.value.slice(0);
	v.mayIgnore = this.mayIgnore;
	v.assignments = this.assignments.slice(0);
	v.definition = this.definition;
	return v;
};

Variable.prototype.check = function check() {
	// Do nothing?
};
Variable.prototype.read = function read(source) {
	if (!source) {
		throw "Cannot read without source";
	}
	if (this.value === "uninitialized") {
		throw "Variable in invalid state. value was not initialized";
	}
	for (var i = 0; i < this.assignments.length; i++) {
		this.assignments[i].reads.push(source);
	}
	return this.value;
};

Variable.prototype.merged = function merged(other) {
	assert(other, "other must be defined");
	if (this.name !== other.name) {
		throw "cannot merge variables with different names: " + this.name + "/" + other.name;
	}
	if (this.definition !== other.definition) {
		console.log(this, other);
		throw ["cannot merge variables with different definitions", this.definition, other.definition];
	}
	var r = new Variable(this.name);
	r.value = setUnion( this.value, other.value );
	r.mayIgnore = this.mayIgnore && other.mayIgnore;
	// r.reads = setUnion(this.reads, other.reads); // TODO: verify this is right
	r.assignments = setUnion(this.assignments, other.assignments); // TODO: resolve this with setUnion
	r.definition = this.definition;
	return r;
};

function builtin(name) {
	var x = new Variable(name);
	//x.assign(["any"], null, true);
	x.value = ["any"];
	x.mayIgnore = true;
	x.definition = null; // (global)
	return x;
}

function VariableContext(options) {
	this.globals = {
		math: builtin("math"),
		print: builtin("print"),
		os: builtin("os"),
		string: builtin("string"),
		table: builtin("table"),
		unpack: builtin("unpack"),
		coroutine: builtin("coroutine"),
		io: builtin("io"),
		require: builtin("require"),
	};
	var builtins = [
		"pairs", "ipairs", "next", "assert", "error", "pcall",
		"xpcall", "debug", "_G",
		"package", "tostring", "tonumber", "getfenv", "setfenv",
		"select", "rawequal", "collectgarbage", "rawset", "rawget",
		"newproxy", "loadstring", "load", "loadfile", "dofile", "type",
		"gcinfo", "_VERSION",
	];
	for (var i = 0; i < builtins.length; i++) {
		this.globals[ builtins[i] ] = builtin(builtins[i]);
	}
	// TODO: make this work
	/*
	if (options.USE_ROBLOX) {
		delete this.globals.os;
		delete this.globals.io;
		delete this.globals.debug;
		this.globals.wait = builtin("wait");
		this.globals.workspace = builtin("workspace");
		this.globals.game = builtin("game");
		this.globals.script = builtin("script");
		this.globals.tick = builtin("tick");
		this.globals.plugin = builtin("plugin");
		this.globals.spawn = builtin("spawn");
		this.globals.delay = builtin("delay");
		var builtins = [
			"Color3", "UDim", "Vector3", "UDim2", "BrickColor", "Enum",
			"CFrame", "Ray", "Region3", "Instance", "ypcall",
			"Vector2",
		];
		for (var i = 0; i < builtins.length; i++) {
			this.globals[builtins[i]] = builtin(builtins[i]);
		}
	}
	*/
	this.stack = [[]];
}

VariableContext.prototype.copy = function copyContext() {
	var n = new VariableContext();
	for (var p in this.globals) {
		n.globals[p] = this.globals[p].copy();
	}
	for (var i = 0; i < this.stack.length; i++) {
		n.stack[i] = [];
		for (var j = 0; j < this.stack[i].length; j++) {
			n.stack[i][j] = this.stack[i][j].copy();
		}
	}
	return n;
};

// Return a Variable object based on the current variables in scope
VariableContext.prototype.search = function search(name) {
	for (var i = this.stack.length - 1; i >= 0; i--) {
		var scope = this.stack[i];
		for (var j = scope.length - 1; j >= 0; j--) {
			if (scope[j].name === name) {
				return scope[j];
			}
		}
	}
	return this.globals[name];;
};

VariableContext.prototype.read = function read(tree) {
	var x = this.search(tree.name);
	if (!x) {
		tree.undefined = true;
		return ["any"];
		// TODO: standardize types;
		// if it's a global set elsewhere, return "any" type instead (since I can't track value but isn't necessarily wrong)
	}
	return x.read(tree);
};

VariableContext.prototype.local = function local(parse) {
	var x = new Variable(parse.name);
	x.definition = parse;
	this.stack[this.stack.length-1].push(x);
	return x;
};

// Returns the function a given tree is defined in, or false if it is not in any
// function.
function getEnclosingFunction(tree) {
	if (!tree) {
		return false; // not in any function
	}
	if (tree.type === "FunctionDeclaration") {
		return tree;
	}
	return getEnclosingFunction(tree.parent);
}

VariableContext.prototype.assign = function assign(parse, value, mayIgnore/*??*/) {
	var x = this.search(parse.name);
	if (x) {
		x.assign(value, parse, mayIgnore);
	} else {
		var p = parse.property === 'identifier' ? parse.parent.parent : parse;
		if (getEnclosingFunction(p)) {
			error("Global defined in function", "Global <code>" + parse.name + "</code> is defined in a function. Did you make a typo?", parse);
		}
		if (parse.type !== 'Identifier') {
			throw ["Invalid parameter 'parse'", parse];
		}
		x = new Variable(parse.name);
		x.definition = false;
		x.mayIgnore = true; // <-- new globals can have old (uninitialized) ignored
		x.assign(value, parse, mayIgnore);
		this.globals[parse.name] = x;
	}
};

function setUnion(a, b) {
	if (a instanceof Array && b instanceof Array) {
		var x = a.concat(b).filter(function(item, pos, arr) { // Remove duplicates
			return arr.indexOf(item) === pos;
		});
		return x;
	} else {
		throw ["invalid parameters to setUnion", a, b];
	}
}

// Returns a context representing the states of variables in both contexts are
// possible (e.g., after an 'if')
VariableContext.prototype.merged = function merged(otherContext) {
	// TODO: assert that variables are the same, for sure
	var r = new VariableContext();
	for (var global in this.globals) {
		var here = this.globals[global];
		var there = otherContext.globals[global];
		if (!there) {
			r.globals[global] = here;
			warn("Suspicious use of globals", "The assignment of <code>" + global + "</code> is conditional.");
		} else {
			r.globals[global] = here.merged(there);
		}
	}
	for (var global in otherContext.globals) {
		if (!r.globals[global]) {
			warn("Suspicious use of globals", "The assignment of <code>" + global + "</code> is conditional.");
			r.globals[global] = otherContext.globals[global];
		}
	}
	for (var i = 0; i < this.stack.length; i++) {
		r.stack[i] = [];
		for (var j = 0; j < this.stack[i].length; j++) {
			r.stack[i][j] = this.stack[i][j].merged(otherContext.stack[i][j]);
		}
	}
	return r;
};

VariableContext.prototype.check = function check(scope) {
	for (var i = 0; i < scope.length; i++) {
		scope[i].check();
	}
};

VariableContext.prototype.close = function close() {
	this.check(this.stack.pop());
};

VariableContext.prototype.open = function open() {
	this.stack.push([]);
};

VariableContext.prototype.finish = function finish() {
	this.close(); // close initial scope
	var last = [];
	for (var name in this.globals) {
		last.push( this.globals[name] );
	}
	this.check(last);
};

function computeType(tree, tuple, context) {
	return ["type"];
}

// Returns the context of a statement
function statementContext(parse) {
	if (parse.property === "identifier" && parse.parent.type === "FunctionDeclaration") {
		return statementContext(parse.parent.parent);
	} else if (parse.type === "FunctionDeclaration" || parse.type === "Chunk") {
		return parse;
	} else {
		return statementContext(parse.parent);
	}
}

// Preprocess variables to condense usages
function variableProcess(parse) {
	if (parse.type === 'ForGenericStatement') {
		for (var i = 0; i < parse.variables.length; i++) {
			parse.variables[i].property = "variables";
			parse.variables[i].parent = parse;
			variableProcess(parse.variables[i]);
		}
	}
	if (parse.type === 'FunctionDeclaration') {
		for (var i = 0; i < parse.parameters.length; i++) {
			parse.parameters[i].property = "parameters";
			parse.parameters[i].parent = parse;
			variableProcess(parse.parameters[i]);
		}
		if (parse.identifier) {
			parse.identifier.property = "identifier";
			parse.identifier.parent = parse;
			variableProcess(parse.identifier);
		}
	}
	if (parse.definition) {
		parse.definition.access = parse.definition.access || [];
		parse.definition.access.push(parse);
	}
}

// Check variable usage graph and emit warnings
function variableCheck(parse, context) {
	if (parse.type === 'ForGenericStatement') {
		for (var i = 0; i < parse.variables.length; i++) {
			variableCheck(parse.variables[i]);
		}
	}
	if (parse.type === 'FunctionDeclaration') {
		for (var i = 0; i < parse.parameters.length; i++) {
			variableCheck(parse.parameters[i]);
		}
		if (parse.identifier) {
			variableCheck(parse.identifier);
		}
	}
	if (parse.undefined) {
		if (!context.variables.globals[parse.name] || statementContext(parse).type === "Chunk") {
			error("The variable <code>" + parse.name + "</code> is not defined", "This name hasn't been defined. Have you made a typo?", parse);
		}
	}
	if (parse.definition) {
		//info(parse.idnum, parse.type, parse);
		var contexts = parse.definition.access.map(statementContext);
		// If there's more than one...
		var unique = true;
		for (var i = 0; i < contexts.length; i++) {
			for (var j = 0; j < i; j++) {
				if (contexts[i] !== contexts[j]) {
					unique = false;
				}
			}
		}
		if (parse.name.replace(/_+/g, "") === "") {
			for (var i = 0; i < parse.reads.length; i++) {
				parse.reads[i].warn("Use of placeholder <code>" + parse.name + "</code>",
					"This value was not given a name. Usually, <code>" +
					parse.name + "</code> is reserved for values that will not be used.");
			}
		} else if (!parse.mayIgnore && parse.reads.length === 0) {
			if (unique) {
				parse.error("Unused assignment", "This assignment to <code>" + parse.name + "</code> was never used. Did you forget to use it?");
			}
		}
	}
}

function variableStage(parse, options) {
	var context = {variables: new VariableContext()};
	variablePass(parse, context);
	context.variables.finish();
	lphelp.recurse(parse, variableProcess);
	lphelp.recurse(parse, variableCheck, null, null, context);
}

var OPENER = [
	"IfStatement",
	"DoStatement",
	"RepeatStatement",
	"WhileStatement",
	"FunctionDeclaration",
	"ForNumericStatement",
	"ForGenericStatement",
];

function variablePass(parse, context) {
	if (!context || !context.variables) {
		throw "invalid context";
	}
	var TYPE = parse.type;
	switch (TYPE) {
	case 'Chunk':
		for (var i = 0; i < parse.body.length; i++) {
			variablePass(parse.body[i], context);
		}
		break;
	case 'LocalStatement':
	case 'AssignmentStatement':
		var values = [];
		for (var i = 0; i < parse.init.length; i++) {
			variablePass(parse.init[i], context);
		}
		for (var i = 0; i < parse.variables.length; i++) {
			if (parse.variables[i].type != 'Identifier') {
				variablePass(parse.variables[i], context);
			}
		}
		for (var i = 0; i < parse.init.length; i++) {
			values[i] = computeType(parse.init[i], 0, context);
		}
		for (var i = parse.init.length; i < parse.variables.length; i++) {
			values[i] = computeType(parse.init[parse.init.length-1], i - parse.init.length+1, context);
		}
		for (var i = 0; i < parse.variables.length; i++) {
			if (parse.variables[i].type === 'Identifier') {
				if (parse.type === 'LocalStatement') {
					context.variables.local(parse.variables[i]);
				}
				context.variables.assign(parse.variables[i], values[i], false);
			}
		}
		break;
	case 'CallStatement':
		variablePass(parse.expression, context);
		break;
	case 'ReturnStatement':
		for (var i = 0; i < parse.arguments.length; i++) {
			variablePass(parse.arguments[i], context);
		}
		break;
	case 'BreakStatement':
		break;
	// COMPOUND STATEMENTS
	case 'IfStatement':
		var hasElse = false;
		for (var i = 0; i < parse.clauses.length; i++) {
			if (parse.clauses[i].type === 'ElseClause') {
				hasElse = true;
			} else {
				variablePass(parse.clauses[i].condition, context);
			}
		}
		var subs = [];
		for (var i = 0; i < parse.clauses.length; i++) {
			var copy = {variables: context.variables.copy()};
			copy.variables.open();
			variablePass(parse.clauses[i], copy);
			copy.variables.close();
			subs[i] = copy.variables;
		}
		// Recombine to make new context.
		var si = 0;
		var c = context.variables;
		if (hasElse) {
			c = subs[0];
			si = 1;
		}
		for (var i = si; i < subs.length; i++) {
			c = c.merged(subs[i]);
		}
		context.variables = c;
		break;
	case 'IfClause':
	case 'ElseClause':
	case 'ElseifClause':
		// (condition has already been executed by ElseClause code)
		for (var i = 0; i < parse.body.length; i++) {
			variablePass(parse.body[i], context);
		}
		break;
	case 'DoStatement':
		context.variables.open();
		for (var i = 0; i < parse.body.length; i++) {
			variablePass(parse.body[i], context);
		}
		context.variables.close();
		break;
	case 'RepeatStatement':
		for (var count = 0; count < 2; count++) {
			context.variables.open();
			for (var i = 0; i < parse.body.length; i++) {
				variablePass(parse.body[i], context);
			}
			variablePass(parse.condition, context);
			context.variables.close();
		}
		break;
	case 'WhileStatement':
		variablePass(parse.condition, context);
		var copy = {variables: context.variables.copy()};
		for (var count = 0; count < 2; count++) {
			copy.variables.open();
			for (var i = 0; i < parse.body.length; i++) {
				variablePass(parse.body[i], copy);
			}
			copy.variables.close();
			variablePass(parse.condition, copy);
		}
		context.variables = context.variables.merged(copy.variables);
		break;
	case 'ForNumericStatement':
		variablePass(parse.start, context);
		variablePass(parse.end, context);
		if (parse.step) {
			variablePass(parse.step, context);
		}
		var copy = {variables: context.variables.copy()};
		// Run loop twice with copy
		for (var count = 0; count < 2; count++) {
			// TODO make first and second pass use separate structures for
			// assignment
			copy.variables.open();
			copy.variables.local(parse.variable);
			copy.variables.assign(parse.variable, ["number"], false);
			for (var i = 0; i < parse.body.length; i++) {
				variablePass(parse.body[i], copy);
			}
			copy.variables.close();
		}
		context.variables = context.variables.merged(copy.variables);
		// TODO: determine if it is known statically that the loop runs at least
		// once
		break;
	case 'ForGenericStatement':
		var copy = {variables: context.variables.copy()};
		for (var i = 0; i < parse.iterators.length; i++) {
			variablePass(parse.iterators[i], context);
		}
		// Run loop twice with 'copy'
		for (var count = 0; count < 2; count++) {
			// TODO make first and second pass use separate structures for
			// assignment
			copy.variables.open();
			for (var i = 0; i < parse.variables.length; i++) {
				copy.variables.local(parse.variables[i]);
				copy.variables.assign(parse.variables[i], ["any"], false);
			}
			for (var i = 0; i < parse.body.length; i++) {
				variablePass(parse.body[i], copy);
			}
			copy.variables.close();
		}
		context.variables = context.variables.merged(copy.variables);
		break;
	// FUNCTIONS
	case 'FunctionDeclaration':
		// TODO parse.identifier may be member expressions;
		// do these need variablePass
		if (parse.identifier && parse.identifier.type === 'Identifier') {
			// it's an assignment
			if (parse.isLocal) {
				context.variables.local(parse.identifier);
			}
			context.variables.assign(parse.identifier, computeType(parse), false);
		}
		var copy = {variables: context.variables.copy()};
		copy.variables.open();
		for (var i = 0; i < parse.parameters.length; i++) {
			if (parse.parameters[i].type === 'Identifier') {
				copy.variables.local(parse.parameters[i]);
				copy.variables.assign(parse.parameters[i], ["any"], false);
			}
		}
		for (var i = 0; i < parse.body.length; i++) {
			variablePass(parse.body[i], copy);
		}
		copy.variables.close();
		context.variables = context.variables.merged(copy.variables);
		break;
	// EXPRESSIONS
	case 'TableKeyString':
		variablePass(parse.value, context);
		break;
	case 'TableValue':
		variablePass(parse.value, context);
		break;
	case 'TableKey':
		variablePass(parse.key, context);
		variablePass(parse.value, context);
		break;
	case 'TableConstructorExpression':
		for (var i = 0; i < parse.fields.length; i++) {
			variablePass(parse.fields[i], context);
		}
		break;
	case 'MemberExpression':
		variablePass(parse.base, context);
		break;
	case 'IndexExpression':
		variablePass(parse.base, context);
		variablePass(parse.index, context);
		break;
	case 'TableCallExpression':
		variablePass(parse.base, context);
		variablePass(parse.arguments, context); // "arguments" intentional...
		break;
	case 'StringCallExpression':
		variablePass(parse.base, context);
		variablePass(parse.argument, context);
		break;
	case 'CallExpression':
		variablePass(parse.base, context);
		for (var i = 0; i < parse.arguments.length; i++) {
			variablePass(parse.arguments[i], context);
		}
		break;
	case 'BinaryExpression':
		variablePass(parse.left, context);
		variablePass(parse.right, context);
		break;
	case 'LogicalExpression':
		variablePass(parse.left, context);
		variablePass(parse.right, context);
		break;
	case 'UnaryExpression':
		variablePass(parse.argument, context);
		break;
	case 'Identifier':
		context.variables.read( parse );
		break;
	case 'VarargLiteral':
	case 'NumericLiteral':
	case 'StringLiteral':
	case 'BooleanLiteral':
	case 'NilLiteral':
		break;
	default:
		implementation("variablePass cannot respond to <code>" + parse.type + "</code>", "", parse);
	}
}

module.exports.lint = variableStage;
}