{
	"use strict";

	function HTMLShower() {
		this.x = 5;
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
		let shownExpressions = expressions.map(x => this.show(x));
		return shownExpressions.join(", ");
	};

	HTMLShower.prototype.showClauses = function(clauses) {
		let shownClauses = clauses.map(x => this.showClause(x));
		return shownClauses.join("\n") + end;
	};

	HTMLShower.prototype.showClause = function(clause) {
		if (clause.type === "IfClause") {
			var open = "<div class=line>" + span.keyword("if") +
				" " + this.show(clause.condition) +
				" " + span.keyword("then") + "</div>";
		} else if (clause.type === "ElseifClause") {
			var open = "<div class=line>" + span.keyword("elseif")
				+ " " + this.show(clause.condition) + " then</div>";
		} else {
			var open = "<div class=line>" + span.keyword("else") + "</div>";
		}
		return open + this.showStatements(clause.body);
	}

	HTMLShower.prototype.show = function(parse) {
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
			r += this.show(parse.start) + ", " + this.show(parse.end);
			if (parse.step) {
				r += ", " + this.show(parse.step);
			}
			r += " do</div>";
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
			let r = "<div class=line>return";
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
			return "<div class=line>" + this.show(parse.expression) + "</div>";
		// Expressions
		} else if (parse.type === "UnaryExpression") {
			// TODO: fix parentheses
			if (parse.operator === "not") {
				return span.logical(parse.operator) +
					" " + this.show(parse.argument);
			} else {
				return parse.operator + this.show(parse.argument);
			}
		} else if (parse.type === "MemberExpression") {
			// TODO: fix parentheses
			return this.show(parse.base) + parse.indexer + this.show(parse.identifier);
		} else if (parse.type === "CallExpression") {
			// TODO: fix parentheses
			return this.show(parse.base) + "(" + this.showExpressions(parse.arguments) + ")";
		} else if (parse.type === "BinaryExpression") {
			// TODO: fix p arentheses
			return this.show(parse.left) +
				" " + parse.operator.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
				" " + this.show(parse.right);
		} else if (parse.type == "LogicalExpression") {
			// TODO: fix parentheses
			return this.show(parse.left) +
				" " + span.logical(parse.operator) +
				" " + this.show(parse.right);
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
