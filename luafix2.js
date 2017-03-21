"use strict";

let luaparse = require("./luaparse.js");
let variables = require("./variables.js");
let redundant = require("./redundant.js");
let antipatterns = require("./antipatterns.js");
let magic = require("./magic.js");

function makeReportable(object, root) {
	if (object instanceof Array) {
		// Create an array of reportables
		let out = [];
		for (let i = 0; i < object.length; i++) {
			let child = makeReportable(object[i], root);
			out.push(child);

			// Attach parent pointer
			if (typeof child == 'object') {
				// Arrays and OReportables
				child.parentNode = out;
				child.parentIndex = i;
			}
		}
		return out;
	}

	if (typeof object != typeof {}) {
		// Use the same primitive object
		return object;
	}

	// Create an OReportable
	return new OReportable(object, root);
}

// Represents an AST with reporting methods .info, .warn, .error, and
// .implementation
function OReportable(object, root) {
	for (var p in object) {
		if (object[p] !== null) {
			// properties like .step in for loops can be null
			let child = makeReportable(object[p], root);
			this[p] = child;

			// Attach parent pointer
			if (typeof child == 'object') {
				// Arrays and OReportables
				this[p].parentNode = this;
				this[p].parentIndex = p;
			}
		}
	}
	this.root = root;
	this.problems = [];
	if (!this.type) {
		throw "invalid object " + JSON.stringify(object);
	}
}

OReportable.prototype.message = function message(strong, message, type) {
	var add = true;
	for (var i = 0; i < this.problems.length; i++) {
		if (this.problems[i].message == message &&
			this.problems[i].title == strong) {
			add = false;
		}
	}
	if (add) {
		this.problems.push({type: type, message: message, title: strong});
		this.root.push({type: type, message: message, title: strong, tree: this});
	}
}

OReportable.prototype.warn = function warn(strong, msg) {
	this.message(strong, msg || "", "warning");
}

OReportable.prototype.error = function error(strong, msg) {
	this.message(strong, msg || "", "error");
}

OReportable.prototype.info = function info(strong, msg) {
	this.message(strong, msg || "", "info");
}

OReportable.prototype.implementation = function implementation(strong, msg) {
	this.message(strong, msg || "", "implementation");
}

/// XXX: move this function elsewhere (it's currently unused)
function literalCallComplain(tree) {
	if (tree.type == "StringCallExpression") {
		warn("Use of string-call-expression",
			"Don't use calls that look like <code>print \"cat\"</code>. "
			+ "Use <code>print( \"cat\" )</code> instead.", tree);
	}
	if (tree.type == "TableCallExpression") {
		warn("Use of table-call-expression",
			"Don't use calls that look like <code>print {cat}</code>. "
			+ "Use <code>print( {cat} )</code> instead.", tree);
	}
}

function luafix(source, options) {
	try {
		var parse = luaparse.parse(source);
		console.log("PARSE");
		console.log(parse);
		console.log("=============================");
	} catch (e) {
		// TODO: deal with this
		console.log("parser error", e);
		//error(e);
		//info("LuaFix could not run because the input was not syntactically valid.");
		return;
	}
	var root = [
		{type:"info", tree: false, strong: "LuaFix started", message: source.length + " bytes processed"},
	];
	var result = makeReportable(parse, root);
	// Descend through parse
	variables.lint(result, options);
	redundant.lint(result, options);
	antipatterns.lint(result, options);
	magic.lint(result, options);

	var errorCount = root.filter(x => x.type == "error").length;
	var warnCount = root.filter(x => x.type == "warning").length;
	root.push({
		type:"info",
		tree: false,
		strong: "LuaFix finished",
		message: "<strong>" + errorCount + "</strong> errors and <strong>" + warnCount + "</strong> warnings.",
	});
	// Stages:
	// 1) Style (without full parse)
	// 2) Style warnings requiring parse
	// 3) Variable type checking / side effects / use
	// 4) Code reuse check
	// 5) Specific anti-pattern search
	//document.getElementById("post").innerHTML = show(parse);

	//showArrows(ARROWS);
	//SetupHoverables();
	return {
		output: root,
		parse: result,
	};
}

module.exports.luafix = luafix;
