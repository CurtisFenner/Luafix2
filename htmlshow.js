"use strict";
{

	function HTMLShower(showProblems) {
		this.showProblems = showProblems;
	}

	let OPENS_SCOPE = {
		"IfClause": true,
		"ElseifClause": true,
		"ElseClause": true,

		"DoStatement": true,
		"RepeatStatement": true,
		"WhileStatement": true,
		"FunctionDeclaration": true,
		"ForNumericStatement": true,
		"ForGenericStatement": true,

		"Chunk": true,
	};

	let getParseScopeDepth = function(parse) {
		if (!parse.parent) {
			return 0;
		}
		if (OPENS_SCOPE[parse.type]) {
			return 1 + getParseScopeDepth(parse.parent);
		}
		return getParseScopeDepth(parse.parent);
	}

	let precedenceTable = [
		[".", ":"], false,
		["()"], false,
		["^"], true, // associativity is not obvious
		["u_not", "u_#", "u_-"], false,
		["*", "/", "%"], false,
		["+", "-"], false,
		[".."], false,
		["<", ">", "<=", ">=", "~=", "=="], true,
		["and"], false,
		["or"], false,
	];

	let childNeedsParenthesisHelper = function(i, j) {
		if (i < j) {
			return false;
		}
		if (i === j) {
			return precedenceTable[i + 1];
		}
		return true;
	};
	function childNeedsParenthesis(child, parent) {
		if (parent === "") {
			return false;
		}
		if (child === parent && child === "u_-") {
			// prevent --
			return true;
		}
		if (!parent || !child) {
			throw new Error("bad arguments `" + parent + "` ... `" + child + "`");
		}
		if (child === "and" && parent === "or") {
			return true;
		}
		// TODO: add parenthesis around `not` when used in a comparison
		for (var i = 0; i < precedenceTable.length; i += 2) {
			if (precedenceTable[i].contains(child)) {
				for (var j = 0; j < precedenceTable.length; j += 2) {
					if (precedenceTable[j].contains(parent)) {
						return childNeedsParenthesisHelper(i, j, child, parent);
					}
				}
			}
		}
		throw new Error("no operators `" + parent + "` ... `" + child + "`");
	}

	// works on non-evil input
	let stripTags = x => x.replace(/<[^>]+>/g, "");

	let spanner = c => x => "<span class=" + c + ">" + x + "</span>";
	let titler = c => (x, t) => {
		let escaped = stripTags(t).replace(/"/g, "&quot;");
		return "<div class='inline " + c + "' title=\"" + escaped + "\">" + x + "</div>";
	}
	let span = {
		keyword: spanner("keyword"),
		literalKeyword: spanner("literalKeyword"),
		number: spanner("number"),
		string: spanner("string"),
		logical: spanner("logical"),
		//
		error: titler("pred"),
		warning: titler("pyellow"),
		info: titler("pblue"),
	};

	let end = "<div class=line>" + span.keyword("end") + "</div>\n";

	HTMLShower.prototype.scopeBlock = function(depth, content, inline) {
		let element = inline ? "span" : "div";

		if (typeof depth !== "number") {
			depth = getParseScopeDepth(depth);
		}

		if (inline && content.trim() === "") {
			return "<span class=scope" + depth + "></span>";
		}

		// Compute a color corresponding to scope depth
		let lerp = (a, b, t) => a + (b - a) * t;
		// scope0: 197, 200, 176
		// scope20: 67, 52, 8
		let progress = Math.min((depth - 3) / 12, 1);
		let r = lerp(255, lerp(197, 67, progress), 0.75) | 0;
		let g = lerp(255, lerp(200, 52, progress), 0.75) | 0;
		let b = lerp(255, lerp(176, 8, progress), 0.75) | 0;

		// Display the content in the computed color
		let style = "background: rgb(" + r + ", " + g + ", " + b + ");";
		if (inline) {
			style += "padding: 0.45em;";
		}
		return "<" + element + " class='scope-block scope" + depth + "' style='" + style + "'>" + content + "</" + element + ">";
	};

	HTMLShower.prototype.showStatements = function(statements) {
		let shownStatements = statements.map(x => this.show(x));
		// TODO: insert semicolons as needed
		return "<DIV class='scope'>" + shownStatements.join("\n") + "</DIV>";
	};

	// Shows a (comma separate) tuple of expressions
	HTMLShower.prototype.showExpressions = function(expressions) {
		let shownExpressions = expressions.map(x => this.show(x, ""));
		for (var i = 1; i < shownExpressions.length; i++) {
			if (stripTags(shownExpressions[i])[0] === "(") {
				shownExpressions[i-1] += ";" // XXX: this needs to go inside the </div>
			}
		}
		return shownExpressions.join(", ");
	};

	HTMLShower.prototype.showClauses = function(clauses) {
		let shownClauses = clauses.map(x => this.showClause(x));
		return shownClauses.join("\n") + end;
	};

	HTMLShower.prototype.showClause = function(clause) {
		if (clause.type === "IfClause") {
			var open = "<div class=line>" + span.keyword("if") +
				" " + this.show(clause.condition, "") +
				" " + span.keyword("then") + "</div>";
		} else if (clause.type === "ElseifClause") {
			var open = "<div class=line>" + span.keyword("elseif") +
				" " + this.show(clause.condition, "") +
				" " + span.keyword("then") + "</div>";
		} else {
			// ElseClause
			var open = "<div class=line>" + span.keyword("else") + "</div>";
		}
		return open + this.scopeBlock(clause, this.showStatements(clause.body));
	}

	HTMLShower.prototype.show = function(parse, parent) {
		let out = this.showRaw(parse, parent);
		parse.problems = parse.problems || [];
		let isError = parse.problems.filter(x => x.type === "error").length;
		let isWarning = parse.problems.filter(x => x.type === "warning").length;
		let isInfo = parse.problems.filter(x => x.type === "info").length;

		let desc = parse.problems.map(x => x.title + "\n" + x.message).join("\n\n");
		if (isError) {
			return span.error(out, desc);
		} else if (isWarning) {
			return span.warning(out, desc);
		} else if (isInfo) {
			return span.info(out, desc);
		}
		return out;
	};

	// Parent is a string representing the operator
	HTMLShower.prototype.showRaw = function(parse, parent) {
		let parened = function(op) {
			if (parent === undefined) {
				throw new Error("no parent");
			}
			if (childNeedsParenthesis(op, parent)) {
				return x => "(" + x + ")";
			} else {
				return x => x;
			}
		};
		// Compound statements
		if (parse.type === "Chunk") {
			return this.scopeBlock(parse, this.showStatements(parse.body));
		} else if (parse.type === "FunctionDeclaration") {
			let r = "";
			if (parse.identifier) {
				r = "<div class=line></div>";
			}
			if (parse.isLocal) {
				r += span.keyword("local") + " ";
			}
			r += span.keyword("function");
			if (parse.identifier) {
				r += " " + this.show(parse.identifier, "");
			}
			r += "(" + this.scopeBlock(parse, this.showExpressions(parse.parameters), true) + ")";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			if (parse.identifier) {
				r += end;
			} else {
				r += "<div class=line></div>" + span.keyword("end");
			}
			return r;
		} else if (parse.type === "IfStatement") {
			return this.showClauses(parse.clauses);
		} else if (parse.type === "WhileStatement") {
			let r = "<div class=line>" +
				span.keyword("while") + " " +
				this.show(parse.condition, "") + " " +
				span.keyword("do") + "</div>";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			r += end;
			return r;
		} else if (parse.type === "RepeatStatement") {
			let r = "<div class=line>" + span.keyword("repeat") + "</div>";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			r += "<div class=line>" + span.keyword("until") + " " + this.scopeBlock(parse, this.show(parse.condition, ""), true) + "</div>";
			return r;
		} else if (parse.type === "ForGenericStatement") {
			let r = "<div class=line>" + span.keyword("for") +
				" " + this.scopeBlock(parse, this.showExpressions(parse.variables), true) +
				" " + span.keyword("in") +
				" " + this.showExpressions(parse.iterators) +
				" " + span.keyword("do") + "</div>";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			r += end;
			return r;
		} else if (parse.type === "DoStatement") {
			let r = "<div class='line'>" + span.keyword("do") + "</div>";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			r += end;
			return r;
		} else if (parse.type === "ForNumericStatement") {
			let r = "<div class=line>" +
				span.keyword("for") + this.scopeBlock(parse, " " + parse.variable.name + " ", true) + " = ";
			r += this.show(parse.start, "") + ", " + this.show(parse.end, "");
			if (parse.step) {
				r += ", " + this.show(parse.step, "");
			}
			r += " " + span.keyword("do") + "</div>";
			r += this.scopeBlock(parse, this.showStatements(parse.body));
			r += end
			return r;
		// Statements
		} else if (parse.type === "BreakStatement") {
			return "<div class=line>" + span.keyword("break") + "</div>";
		} else if (parse.type === "AssignmentStatement") {
			return "<div class=line>" +
				this.showExpressions(parse.variables) +
				" = " +
				this.showExpressions(parse.init) + "</div>";
		} else if (parse.type === "ReturnStatement") {
			let r = "<div class=line>" + span.keyword("return");
			if (parse.arguments.length > 0) {
				r += " " + this.showExpressions(parse.arguments);
			}
			r += "</div>";
			return r;
		} else if (parse.type === "LocalStatement") {
			let names = parse.variables.map(x => x.name);
			let r = "<div class=line>" + span.keyword("local") +
				" " + names.join(", ");
			if (parse.init.length > 0) {
				return r + " = " + this.showExpressions(parse.init) + "</div>";
			} else {
				return r + "</div>";
			}
		} else if (parse.type === "CallStatement") {
			return "<div class=line>"
				+ this.show(parse.expression, "") + "</div>";
		// Expressions
		} else if (parse.type === "UnaryExpression") {
			if (parse.operator === "not") {
				return parened("u_" + parse.operator)(
					span.logical(parse.operator) +
					" " + this.show(parse.argument, "u_" + parse.operator)
				);
			} else {
				return parened("u_" + parse.operator)(
					parse.operator +
					this.show(parse.argument, "u_" + parse.operator)
				);
			}
		} else if (parse.type === "MemberExpression") {
			return parened(".")(
				this.show(parse.base, parse.indexer) +
				parse.indexer + this.show(parse.identifier)
			);
		} else if (parse.type === "IndexExpression") {
			return this.show(parse.base, "()") + "[" + this.show(parse.index, "") + "]";
		} else if (parse.type === "CallExpression" || parse.type === "StringCallExpression" || parse.type == "TableCallExpression") {
			let pre = "";
			let post = "";
			if (parse.inParens) {
				// parenthesization drops tuples, and so is meaningful
				pre = "(";
				post = ")";
			}

			let args;
			if (parse.type === "CallExpression") {
				args = "(" + this.showExpressions(parse.arguments) + ")";
			} else if (parse.type == "StringCallExpression") {
				args = " " + this.show(parse.argument, ""); // XXX
			} else {
				args = " " + this.show(parse.arguments, ""); // XXX
			}
			return pre + this.show(parse.base, "()") + args + post;
		} else if (parse.type === "BinaryExpression") {
			let op = parse.operator;
			return parened(op)(
				this.show(parse.left, op) +
				" " + op.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
				" " + this.show(parse.right, op)
			);
		} else if (parse.type == "LogicalExpression") {
			let op = parse.operator;
			return parened(op)(
				this.show(parse.left, op) +
				" " + span.logical(op) +
				" " + this.show(parse.right, op)
			);
		// Table literals
		} else if (parse.type === "TableValue") {
			return "<div class=line>" + this.show(parse.value, "") + ",</div>";
		} else if (parse.type === "TableKey") {
			return "<div class=line>[" + this.show(parse.key, "") + "] = " + this.show(parse.value, "") + ",</div>";
		} else if (parse.type === "TableKeyString") {
			return "<div class=line>" + this.show(parse.key, "") + " = " + this.show(parse.value, "") + ",</div>";
		} else if (parse.type === "TableConstructorExpression") {
			if (parse.fields.length === 0) {
				return "{}";
			}
			let fields = parse.fields.map(f => this.show(f, ""));
			return "{<div class=scope>" + fields.join("") + "</div>}";
		// Expression Atoms
		} else if (parse.type === "StringLiteral") {
			let escaped = parse.raw
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/, "&gt;");
			return span.string(escaped);
		} else if (parse.type === "NumericLiteral") {
			return span.number(parse.raw);
		} else if (parse.type === "BooleanLiteral") {
			return span.literalKeyword(parse.raw);
		} else if (parse.type === "VarargLiteral") {
			return span.literalKeyword("...");
		} else if (parse.type === "NilLiteral") {
			return span.literalKeyword(parse.raw);
		} else if (parse.type === "Identifier") {
			let source = parse.variableSource && parse.variableSource.definition;

			if (source) {
				// local variable defined at source
				return this.scopeBlock(source, parse.name, true);
			} else if (parse.definition) {
				// assignment to a new local? variable
				return parse.name;
			} else if (parse.readsFrom || parse.writesTo) {
				// global (or undefined) variable
				return this.scopeBlock(0, parse.name, true);
			} else {
				return parse.name;
			}
		}
		console.log("unknown parse type `" + parse.type + "`");
		console.log(parse);
		throw new Error("fell through on type `" + parse.type + "`");
	};

	module.exports.HTMLShower = HTMLShower;
}
