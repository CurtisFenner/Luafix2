'use strict';

function Variable(name) {
	if (!name) {
		throw "invalid name";
	}
	this.name = name;
	this.value = "uninitialized";
	this.reads = [];
}
Variable.prototype.assign = function assign(value, assignment, mayIgnore) {
	// value: the value to be assigned
	// (TODO deal with table key/element values)
	// assignment: the Identifier in the statement causing this assignment
	// mayIgnore: do not warn about value being unused
	this.check();
	this.value = value;
	this.assignment = assignment;
	this.mayIgnore = mayIgnore;
	this.reads = [];
};
Variable.prototype.copy = function copyVariable() {
	var v = new Variable(this.name);
	v.value = this.value.slice(0);
	v.reads = this.reads.slice(0);
	v.mayIgnore = this.mayIgnore;
	return v;
};

Variable.prototype.check = function check() {
	if (this.mayIgnore) {
		// do nothing
	} else {
		if (this.reads.length === 0) {
			error("Unused assignment", "The value of <code>" + this.name + "</code> wasn't used.", this.assignment);
		}
	}
};
Variable.prototype.read = function read(source) {
	if (this.value === "uninitialized") {
		throw "Variable in invalid state. value was not initialized";
	}
	this.reads.push(source);
	return this.value;
};

Variable.prototype.merged = function merged(other) {
	if (this.name != other.name) {
		throw "cannot merge variables with different names: " + this.name + "/" + other.name;
	}
	var r = new Variable(this.name);
	r.value = setUnion( this.value, other.value );
	r.mayIgnore = this.mayIgnore && other.mayIgnore;
	r.reads = setUnion(this.reads, other.reads); // TODO: verify this is right
	r.assignment = this.assignment; // TODO: resolve this with setUnion
	return r;
}

function builtin(name) {
	var x = new Variable(name);
	//x.assign(["any"], null, true);
	x.value = ["any"];
	x.assignment = null;
	x.mayIgnore = true;
	return x;
}

function VariableContext() {
	this.globals = {
		math: builtin("math"),
		print: builtin("print"),
	};
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
		error("Use of undefined variable <code>" + tree.name + "</code>", "This name has not been defined. Did you make a typo?", tree);
		return ["nil"];
		// TODO: standardize types;
		// if it's a global set elsewhere, return "any" type instead (since I can't track value but isn't necessarily wrong)
	}
	return x.read();
};

VariableContext.prototype.local = function local(parse) {
	var x = new Variable(parse.name);
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
		if (getEnclosingFunction(parse)) {
			error("Global defined in function", "Global <code>" + parse.name + "</code> is defined in a function. Did you make a typo?", parse);
		}
		if (parse.type !== 'Identifier') {
			throw ["Invalid parameter 'parse'", parse];
		}
		x = new Variable(parse.name);
		x.assign(value, parse, mayIgnore);
		this.globals[parse.name] = x;
	}
};

function setUnion(a, b) {
	if (a instanceof Array && b instanceof Array) {
		var x = a.concat(b);
		x.sort();
		return x; // TODO: Remove duplicates
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
		r.globals[global] = here.merged(there);
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
	console.log("check[" , scope, "]");
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

function variableStage(parse) {
	var context = {variables: new VariableContext()};
	variablePass(parse, context);
	context.variables.finish();
	//lprecurse(parse, variableProcess, variablePre, variablePost, context);
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
					context.variables.local(parse);
				}
				context.variables.assign(parse.variables[i], values[i], false);
			}
		}
		break;
	case 'CallStatement':
		variablePass(parse.expression, context);
		break;
	// COMPOUND STATEMENTS
	case 'IfStatement':
		for (var i = 0; i < parse.clauses.length; i++) {
			var hasElse = false;
			if (parse.clauses[i].type === 'ElseClause') {
				hasElse = true;
			} else {
				variablePass(parse.clauses[i].condition, context);
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
				c = subs[0].variables;
				si = 1;
			}
			for (var i = si; i < subs.length; i++) {
				c = c.merged(subs[i]);
			}
			context.variables = c;
		}
		break;
	// EXPRESSIONS
	case 'CallExpression':
		variablePass(parse.base, context);
		for (var i = 0; i < parse.arguments.length; i++) {
			variablePass(parse.arguments[i], context);
		}
		break;
	case 'Identifier':
		context.variables.read( parse );
		break;
	case 'NumericLiteral':
	case 'StringLiteral':
	case 'BooleanLiteral':
		break;
	default:
		implementation("variablePass cannot respond to <code>" + parse.type + "</code>", "", parse);
	}
}


/*
function variablePre(parse, context) {
	context = (parse.parent && parse.parent.context) || context;
	context.variables = context.variables.copy();
	console.log("<" + parse.type + ">");
	var type = parse.type;
	parse.opens = OPENER.indexOf(type) >= 0;
	if (parse.opens) {
		context.variables.open();
	}
}

function variableProcess(parse, context) {
	if (parse.type === "Identifier" && parse.property !== "variables") {
		context.variables.read(parse);
	}
}

function variablePost(parse, context) {
	console.log("</" + parse.type + ">");
	if (parse.opens) {
		context.variables.close();
	}
	if (parse.type === "AssignmentStatement" || parse.type === "LocalStatement") {
		// Assign variables
		// TODO: deal correctly with tuples
		var values = [];
		for (var i = 0; i < parse.init.length; i++) {
			values[i] = computeType(parse.init[i], 0, context);
		}
		for (var i = parse.init.length; i < parse.variables.length; i++) {
			values[i] = computeType(parse.init[parse.init.length-1], i - parse.init.length+1, context);
		}
		for (var i = 0; i < parse.variables.length; i++) {
			var variable = parse.variables[i];
			if (variable.type === "Identifier") {
				if (parse.type === "LocalStatement") {
					context.variables.local(variable.name);
				}
				context.variables.assign(variable.name, values[i], variable, false);
			} else {
				// TODO
			}
		}
	} else if (parse.type === "FunctionDeclaration") {
		if (parse.isLocal) {
			context.variables.local(parse.identifier.name);
		}
		if (parse.identifier && parse.identifier.type === "Identifier") {
			context.variables.assign(parse.identifier.name, computeType(parse), parse.identifier, false);
		}
	}
}
*/