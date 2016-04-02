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
	this.value = [value];
	this.assignment = assignment;
	this.mayIgnore = mayIgnore;
	this.reads = [];
};
Variable.prototype.check = function check() {
	if (this.mayIgnore) {
		// do nothing
	} else {
		if (this.read.length === 0) {
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

function VariableContext() {
	this.globals = {};
	this.stack = [];
}

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

VariableContext.prototype.local = function local(name) {
	var x = new Variable(name);
	this.stack[this.stack.length-1].push(x);
	return x;
};

VariableContext.prototype.assign = function assign(name, value, tree, mayIgnore/*??*/) {
	var x = this.search(name);
	if (x) {
		x.assign(value, tree, mayIgnore);
	} else {
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
	for (var i = 0; i < scope.length; i++) {
		scope[i].check();
	}
};

VariableContext.prototype.close = function close() {
	this.check(this.stack.pop());
};

VariableContext.prototype.open = function open() {
	this.stack.push([]);
}

function variableStage(parse) {
	var context = new VariableContext();
	lprecurse(parse, variableProcess, variablePre, variablePost, context);
}

function variablePre(parse) {

}

function variableProcess(parse) {

}

function variablePost(parse) {

}
