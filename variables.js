function Variable(name) {
	this.name = name;
	this.value = "uninitialized";
	this.reads = [];
}
Variable.prototype.assign = function assign(value, assignment, mayIgnore) {
	// value: the value to be assigned
	// (TODO deal with table key/element values)
	// tree: the Identifier in the statement causing this assignment
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
	v.reads = this.reads.slie(0);
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

function builtin(name) {
	var x = new Variable(name);
	x.assign(["any"], null, true);
	return x;
}

function VariableContext() {
	this.globals = {
		math: builtin("math"),
		print: builtin("math"),
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

VariableContext.prototype.local = function local(name) {
	var x = new Variable(name);
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

VariableContext.prototype.assign = function assign(name, value, tree, mayIgnore/*??*/) {
	var x = this.search(name);
	if (x) {
		x.assign(value, tree, mayIgnore);
	} else {
		if (getEnclosingFunction(tree)) {
			error("Global defined in function", "Global <code>" + name + "</code> is defined in a function. Did you make a typo?", tree);
		}
		x = new Variable(name);
		x.assign(value, tree, mayIgnore);
		this.globals[name] = x;
	}
};

// Returns a context representing the states of variables in both contexts are
// possible (e.g., after an 'if')
VariableContext.prototype.merged = function merged(otherContext) {
	// TODO
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
	return "type";
}

function variableStage(parse, context) {
	var context = {variables: new VariableContext()};
	lprecurse(parse, variableProcess, variablePre, variablePost, context);
	context.variables.finish();
}

var OPENER = [
	"IfStatement",
	"DoStatement",
	"RepeatStatement",
	"WhileStatement",
	"FunctionDeclaration",
	"ForNumericStatement",
	"ForGenericStatement",
]

function variablePre(parse, context) {
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
	console.log(" +" + parse.type);
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
