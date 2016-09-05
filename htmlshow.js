{
	"use strict";

	function HTMLShower() {
		this.x = 5;
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
			console.log(precedenceTable[i]);
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

	let spanner = c => x => "<span class=" + c + ">" + x + "</span>";
	let span = {
		keyword: spanner("keyword"),
		literalKeyword: spanner("literalKeyword"),
		number: spanner("number"),
		string: spanner("string"),
		logical: spanner("logical"),
	};

	let end = "<div class=line>" + span.keyword("end") + "</div>\n";

	HTMLShower.prototype.showStatements = function(statements) {
		let shownStatements = statements.map(x => this.show(x));
		// TODO: insert semicolons as needed
		return "<DIV class=scope>" + shownStatements.join("\n") + "</DIV>";
	};

	// Shows a (comma separate) tuple of expressions
	HTMLShower.prototype.showExpressions = function(expressions) {
		let shownExpressions = expressions.map(x => this.show(x, ""));
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
			var open = "<div class=line>" + span.keyword("elseif")
				+ " " + this.show(clause.condition, "") + " then</div>";
		} else {
			var open = "<div class=line>" + span.keyword("else") + "</div>";
		}
		return open + this.showStatements(clause.body);
	}

	// Parent is a string representing the operator
	HTMLShower.prototype.show = function(parse, parent) {
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
			return this.showStatements(parse.body);
		} else if (parse.type === "FunctionDeclaration") {
			let r = "<div class=line>";
			if (parse.isLocal) {
				r += span.keyword("local") + " ";
			}
			r += span.keyword("function");
			if (parse.identifier) {
				r += " " + this.show(parse.identifier);
			}
			r += "(" + this.showExpressions(parse.parameters) + ")</div>\n";
			r += this.showStatements(parse.body);
			r += end;
			return r;
		} else if (parse.type === "IfStatement") {
			return this.showClauses(parse.clauses);
		} else if (parse.type === "ForNumericStatement") {
			let r = "<div class=line>" +
				span.keyword("for") + " " + parse.variable.name + " = ";
			r += this.show(parse.start, "") + ", " + this.show(parse.end, "");
			if (parse.step) {
				r += ", " + this.show(parse.step, "");
			}
			r += " " + span.keyword("do") + "</div>";
			r += this.showStatements(parse.body);
			r += end
			return r;
		// Statements
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
		} else if (parse.type === "CallExpression") {
			// XXX: Does this need `parened` ever? I don't think so
			return this.show(parse.base, "()") +
				"(" + this.showExpressions(parse.arguments) + ")";
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
		// Expression Atoms
		} else if (parse.type === "StringLiteral") {
			return span.string(parse.raw);
		} else if (parse.type === "NumericLiteral") {
			return span.number(parse.raw);
		} else if (parse.type === "BooleanLiteral") {
			return span.literalKeyword(parse.raw);
		} else if (parse.type === "NilLiteral") {
			return span.literalKeyword(parse.raw);
		} else if (parse.type === "Identifier") {
			return parse.name;
		} else {
			console.log("unknown parse type `" + parse.type + "`");
			console.log(parse);
			return "<p class=unknown>" + parse.type + "</p>";
		}
		throw new Error("fell through on type `" + parse.type + "`");
	};

	module.exports.HTMLShower = HTMLShower;
}
