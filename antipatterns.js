"use strict";

let lphelp = require("./lphelp.js");
let htmlshow = require("./htmlshow.js");

let show = x => new htmlshow.HTMLShower().show(x, "");

function antipatternStage(parse, options) {
	// Find `x ~= nil`
	lphelp.recurse(parse, antiTruthyCompare, antiTruthyPre, antiTruthyPost, []);
	if (options.USE_ROBLOX) {
		lphelp.recurse(parse, antiFFCDot);
	}
	lphelp.recurse(parse, searchBadCondition);
	lphelp.recurse(parse, badComparisons);
	lphelp.recurse(parse, badNot);
	lphelp.recurse(parse, badLoop);
	lphelp.recurse(parse, badRepeat);
	lphelp.recurse(parse, badAssignment);
	lphelp.recurse(parse, badIndex);
	lphelp.recurse(parse, endingUnderscore);
	lphelp.recurse(parse, successiveIfComplaints);
	lphelp.recurse(parse, complainReturnNil);
}

////////////////////////////////////////////////////////////////////////////////

// Complain about a redundant `return` or `return nil` at the end of a function:
function checkReturnStatementNil(e) {
	if (e.type === "ReturnStatement") {
		var notNil = false;
		for (var i = 0; i < e.arguments.length; i++) {
			if (e.arguments[i].type !== "NilLiteral") {
				notNil = true;
				break;
			}
		}
		if (!notNil) {
			e.warn("Unnecessary <code>return</code>", "Functions implicitly return <code>nil</code>.");
		}
	}
}

function complainReturnNil(e) {
	if (e.type === "FunctionDeclaration") {
		if (e.body.length) {
			var last = e.body[e.body.length - 1];
			checkReturnStatementNil(last);
			// TODO: generalize for ifs and dos.
		}
	}
}


function booleanClauses(e) {
	if (e.type === "LogicalExpression" && e.Operator == "and") {
		return booleanClauses(e.left).concat(booleanClauses(e.right));
	} else {
		return [show(e)];
	}
}

function intersect(a, b) {
	var c = [];
	for (var i = 0; i < a.length; i++) {
		if (b.indexOf(a[i]) >= 0) {
			c.push(a[i]);
		}
	}
	return c;
}

function expressionFlipped(a, b) {
	console.log(show(a), show(b));
	if (a.type === 'BinaryExpression' && b.type === 'BinaryExpression') {
		var opposites = {
			'==': '~=',
			'~=': '==',
			'<': '>=',
			'>': '<=',
			'>=': '<',
			'<=': '>'
		};
		var flips = {
			'<': '>',
			'>': '<',
			'>=': '<=',
			'<=': '>=',
			'==': '==',
			'~=': '~=',
		};
		if (opposites[a.operator] === b.operator) {
			if (show(a.left) === show(b.left) && show(a.right) === show(b.right)) {
				return true;
			}
		}
		if (opposites[a.operator] === flips[b.operator]) {
			if (show(a.left) === show(b.right) && show(a.right) === show(b.left)) {
				return true;
			}
		}
	}
	if (a.type === 'UnaryExpression' && a.operator === 'not') {
		return show(a.argument) === show(b);
	}
	if (b.type === 'UnaryExpression' && b.operator === 'not') {
		return show(b.argument) === show(a);
	}
}

function checkBadConditionFlip(a, b) {
	if (expressionFlipped(a.condition, b.condition)) {
		b.condition.warn("Condition flipped instead of using <code>else</code>",
			"Instead of inverting <code>" + show(a.condition) + "</code>, consider using <code>else</code> here.");
	}
}

// Warn if the same clause appears in two successive if statements
function successiveIfs(a, b) {
	// Warn about negated consecutive ifs
	checkBadConditionFlip(a.clauses[0], b.clauses[0]);
	//
	var ca = booleanClauses(a.clauses[0].condition);
	for (var i = 1; i < a.clauses.length; i++) {
		if (a.clauses[i].condition) {
			ca = intersect(ca, booleanClauses(a.clauses[i].condition));
		}
	}
	var cb = booleanClauses(b.clauses[0].condition);
	for (var i = 1; i < b.clauses.length; i++) {
		if (b.clauses[i].condition) {
			cb = intersect(cb, booleanClauses(b.clauses[i].condition));
		}
	}
	//
	var u = intersect(ca, cb);
	if (u.length != 0) {
		b.clauses[0].condition.warn("Conditions repeated in consecutive <code>if</code>s",
			"Instead of repeating <code>" + u[0] + "</code>, consider grouping these under a larger <code>if " + u[0] + " then</code> statement.");
	}
}

function successiveIfComplaints(t) {
	if (t.clauses && t.clauses.length >= 2) {
		if (t.clauses[1].condition) {
			checkBadConditionFlip(t.clauses[0], t.clauses[1]);
		}
	}
	if (t.body) {
		for (var i = 0; i < t.body.length - 1; i++) {
			if (t.body[i].type === "IfStatement" && t.body[i+1].type === "IfStatement") {
				successiveIfs(t.body[i], t.body[i+1]);
			}
		}
	}
}


function isUnderscores(n) {
	return n.replace(/_/g, "").length === 0 && n.length > 0;
}

// Warn about an unnecessary _ at the end of a list of variables
function endingUnderscore(t) {
	function check(v, to) {
		for (var i = v.length - 1; i >= (to || 0); i--) {
			if (v[i].type === "Identifier" && isUnderscores(v[i].name)) {
				v[i].error("Unnecessary identifier", "Since <code>" + v[i].name + "</code> won't be used, it should be dropped.");
			} else {
				break;
			}
		}
	}
	if (t.type === "ForGenericStatement") {
		check(t.variables, 1);
	} else if (t.type === "LocalStatement" || t.type === "AssignmentStatement") {
		check(t.variables);
	}
}

function canBeFunctionIdentifier(t) {
	if (t.type === "Identifier") {
		return true;
	}
	if (t.type === "MemberExpression") {
		return canBeFunctionIdentifier(t.base);
	}
	return false;
}

function isIdentifier(text) {
	var reserved = ["if", "then", "else", "elseif", "do", "end", "while", "repeat",
	"until", "and", "or", "nil", "true", "false", "function", "for", "in", "breaK",
	"return", "local"];
	if (reserved.contains(text)) {
		return false;
	}
	return text.replace(/^[a-zA-Z_][a-zA-Z_0-9]+$/, "").length === 0;
}

// Complain about using ["property"] instead of .property when .property is
// legal.
function badIndex(tree) {
	if (tree.type === "IndexExpression") {
		if (tree.index.type === "StringLiteral") {
			if (isIdentifier(tree.index.value)) {
				var r = {type: "MemberExpression", indexer: ".", base: tree.base, identifier: {type: "Identifier", name: tree.index.value}};
				tree.warn("Use <code>" + show(r) + "</code> instead of indexing by a string", "Indexing should be used for variables or names which need it.");
				tree.suggestion = r;
			}
		}
	}
}

// Complain about more values than variables in an assignment.
function badAssignment(tree) {
	if (tree.type === "AssignmentStatement" || tree.type === "LocalStatement") {
		if (tree.variables.length < tree.init.length) {
			tree.error(
				"Some values are lost in the assignment",
				"There are more values than there are variables. Either some values should be saved, or this should be broken into separate statements.");
		}
		if (tree.variables.length === 1 && tree.init.length === 1) {
			if (canBeFunctionIdentifier(tree.variables[0])) {
				var fun = tree.init[0];
				if (fun.type === "FunctionDeclaration") {
					tree.variables[0].warn("Use normal function declaration syntax",
						"Your meaning will be clearer if you use the construct designed for this, a function declaration");
					tree.suggestion = {
						type:"FunctionDeclaration", identifier: tree.variables[0],
						isLocal: tree.type === "LocalStatement", parameters: fun.parameters,
						body: fun.body};
				}
			}
		}
	}
}

// Complain about empty loops.
function badLoop(tree) {
	if (tree.type === "ForNumericStatement" || tree.type === "ForGenericStatement") {
		if (tree.body.length === 0) {
			tree.error("Empty loop", "This loop will not do anything.");
		}
	}
	if (tree.type === "RepeatStatement" || tree.type === "WhileStatement") {
		if (tree.body.length === 0) {
			if ((isFalsey(tree.condition) && tree.type === "RepeatStatement") || (isTruthy(tree.condition) && tree.type === "WhileStatement")) {
				tree.error("Infinite loop will crash", "This infinite loop will crash. Add a body to it or change the condition.");
			} else {
				tree.warn(
					"Empty loop",
					"This <code>" + (tree.type === "RepeatStatement" ? "repeat" : "while") + "</code> will likely crash if it runs.");
			}
		}
	}
	if (tree.type === "RepeatStatement" || tree.type === "ForNumericStatement" || tree.type === "ForGenericStatement" || tree.type === "WhileStatement") {
		if (tree.body.length === 1) {
			if (tree.body[0].type === "IfStatement") {
				var last = tree.body[0].clauses[tree.body[0].clauses.length - 1];
				if (last.type === "ElseClause") {
					tree.body[0].clauses[tree.body[0].clauses.length - 1].warn(
						"Exhausted <code>if</code> in loop",
						"You should be careful that no action is taken based solely on the first or last iteration of the loop.");
				}
			}
		}
	}
}

function isNil(tree) {
	return tree.type === "NilLiteral";
}

function isTrue(tree) {
	return tree.type === "BooleanLiteral" && tree.value === true;
}

function isFalse(tree) {
	return tree.type === "BooleanLiteral" && tree.value === false;
}

function antiTruthyPre(tree, context) {
	if (tree.type === "IfClause" || tree.type === "ElseifClause") {
		context.push("condition"); // Must be popped after processing something
		// that is the child of tree.
		context.push(tree);
	}
}

function antiTruthyPost(tree, context) {
	if (tree.parent === context.peek()) {
		context.pop();
		context.pop();
	}
}

// Warn about `not` applied to an operand of `==`.
// Warn about `not` being applied to a literal.
function badNot(tree) {
	if (tree.type == "BinaryExpression" && tree.operator == "==") {
		if (tree.left.type == "UnaryExpression" && tree.left.operator == "not") {
			tree.warn("Comparing <code>not</code> of value",
				"<code>not</code> has higher precedence than <code>==</code>. If you want to check if two values are different, you should use <code>~=</code>.");
		}
	}
	if (tree.type == "UnaryExpression" && tree.operator == "not") {
		if (isTruthy(tree.argument)) {
			tree.error("A <code>not</code> of a literal is always <code>false</code>",
				"Since <code>" + show(tree.argument) +
				"</code> is truthy, this expression is always <code>false</code>. Did you forget parenthesis?");
		}
	}
}

// Complain about comparing to a table literal.
function badComparisons(tree) {
	if (tree.type == "BinaryExpression") {
		var relation = ["==", "<", "~=", ">", "<=", ">="];
		var operator = tree.operator;
		if (relation.indexOf(operator) >= 0) {
			if (tree.left.type == "TableConstructorExpression" || tree.right.type == "TableConstructorExpression") {
				tree.error("Expression is always <code>" + (operator == "~=") +"</code>",
					"Tables are compared by reference. This comparison creates a <em>new</em> table, different from all others.");
			}
			if (isTruthy(tree.left) && isTruthy(tree.right)) {
				tree.error("Redundant comparison",
					"The result of <code>" + show(tree) +
					"</code> is clear without running the script. Write <code>true</code> or <code>false</code> when that is what you mean.");
			}
		}
	}
}

function isTruthy(tree) {
	if (tree.type == "NumericLiteral" || tree.type == "StringLiteral"
		|| tree.type == "FunctionDeclaration" || tree.type == "TableConstructorExpression") {
		return true;
	}
	if (tree.type == "BooleanLiteral") {
		return tree.value;
	}
	if (tree.type == "LogicalExpression") {
		if (tree.operator == "and") {
			return isTruthy(tree.left) && isTruthy(tree.right);
		} else if (tree.operator == "or") {
			return isTruthy(tree.left) || isTruthy(tree.right);
		}
	}
	if (tree.type === "TableConstructorExpression") {
		return true;
	}
	return false;
}

function isFalsey(tree) {
	if (tree.type == "BooleanLiteral") {
		return !tree.value;
	}
	if (tree.type == "NilLiteral") {
		return true;
	}
	if (tree.type == "LogicalExpression") {
		if (tree.operator == "and") {
			return isFalsey(tree.left) || isFalsey(tree.right);
		} else if (tree.operator == "or") {
			return isFalsey(tree.left) && isFalsey(tree.right);
		}
	}
	return false;
}


// TODO: test me
function opposite(a, b) {
	var ops = {};
	ops["=="] = "~=";
	ops["~="] = "==";
	ops["<"] = ">=";
	ops["<="] = ">";
	ops[">"] = "<=";
	ops[">="] = "<";
	var flip = {};
	flip["=="] = "==";
	flip["~="] = "~=";
	ops["<"] = "<=";
	ops["<="] = "<";
	ops[">"] = ">=";
	ops[">="] = ">";

	if (a.type === "UnaryExpression" && a.operator === "not") {
		return equiv(a.argument, b);
	}
	if (b.type === "UnaryExpression" && b.operator === "not") {
		return equiv(a, b.argument);
	}
	// no nots!
	if (a.type === "BinaryExpression" && b.type === "BinaryExpression") {
		if (equiv(a.left, b.left) && equiv(a.right, b.right)) {
			return a.operator === ops[b.operator];
		} else if (equiv(a.left, b.right) && equiv(a.right, b.left)) {
			return a.operator === flip[ops[b.operator]];
		}
	}
}

// Returns whether ASTs a and b are (up to side effects) equivalent
function equiv(a, b) {
	if (a.type === "UnaryExpression" && a.operator === "not") {
		return opposite(a.argument, b);
	} else if (b.type === "UnaryExpression" && b.operator === "not") {
		return opposite(a, b.argument);
	}
	if (a.type === "BinaryExpression" && b.type === "BinaryExpression") {
		if (a.operator == b.operator) {
			var same = (equiv(a.left, b.left) && equiv(a.right, b.right));
			if (a.operator == "==" || a.operator == "~=") {
				return same || (equiv(a.left , b.right) && equiv(a.right , b.left));
			}
			return same;
		} else {
			// TODO: write more
		}
	} else if (a.type === "LogicalExpression" && b.type === "LogicalExpression") {
		if (a.operator == b.operator) {
			return (equiv(a.left, b.left) && equiv(a.right, b.right)) ||
				(equiv(a.left, b.right) && equiv(a.right, b.left));
		}
	}
}

// Warn about an `if` guarding a `repeat` statement.
function badRepeat(tree) {
	if (tree.type == "IfStatement") {
		if (tree.clauses.length != 1) {
			return;
		}
		var then = tree.clauses[0];
		if (then.body.length == 1) {
			if (then.body[0].type === "RepeatStatement") {
				then.warn("Consider using a <code>while</code> instead [DRY]",
					"Instead of using <code>if a then repeat until not a</code>, just use <code>while a do end</code>");
			}
		}
	}
}

// Warn about boolean expressions involving constants (which are identities or
// annihilators)
function checkBadCondition(tree, complainRight) {
	// Always true or always false conditions are bad.
	if (tree.type == "LogicalExpression") {
		if (show(tree.left) == show(tree.right)) {
			tree.error("Logical operator is unnecessary", "The left and right expressions are the same");
		}
		if (tree.operator == "and") {
			if (isFalsey(tree.left)) {
				tree.error("Condition is always <code>false</code>",
					"The left expression <code>" + show(tree.left) + "</code> is always falsy.");
			}
			if (isFalsey(tree.right) && complainRight) {
				tree.error("Condition is always <code>false</code>",
					"The right expression <code>" + show(tree.right) + "</code> is always falsy");
			}
			if (isTruthy(tree.left)) {
				tree.error("Right side of <code>and</code> is redundant",
					"The left side <code>" + show(tree.left) + "</code> is always truthy");
			}
			if (isTruthy(tree.right) && complainRight) {
				tree.error("Left side of <code>and</code> is redundant",
					"The right side <code>" + show(tree.right) + "</code> is always truthy");
			}
		} else if (tree.operator == "or") {
			if (isTruthy(tree.left)) {
				tree.error("Condition is always <code>true</code>",
					"The left expression <code>" + show(tree.left) + "</code> is always truthy.");
			}
			if (isTruthy(tree.right) && complainRight) {
				tree.error("Condition is always <code>true</code>",
					"The right expression <code>" + show(tree.right) + "</code> is always truthy");
			}
			if (isFalsey(tree.left)) {
				tree.error("Left side of <code>or</code> is redundant",
					"The left side <code>" + show(tree.left) + "</code> is always falsey");
			}
			if (isFalsey(tree.right) && complainRight) {
				tree.error("Right side of <code>or</code> is redundant",
					"The right side <code>" + show(tree.right) + "</code> is always falsey");
			}
		}
	}
}

function last(list) {
	return list[list.length-1];
}

function searchBadCondition(tree) {
	if (tree["condition"]) {
		if (isTruthy(tree.condition) || isFalsey(tree.condition)) {
			var okay = false;
			var warning = false;
			if (tree.type === "WhileStatement" && isTruthy(tree.condition)) {
				okay = true;
				warning = last(tree.parent.body) !== tree;
				// TODO: account for breaks & returns

			}
			if (tree.type === "RepeatStatement" && isFalsey(tree.condition)) {
				okay = true;
				warning = last(tree.parent.body) !== tree;
				// TODO: account for breaks & returns
			}
			if (!okay || warning) {
				var heading = "Constant used as condition";
				var body = "The value <code>" + show(tree.condition) + "</code> is always " + (isTruthy(tree.condition) ? "truthy" : "falsey");
				if (warning) {
					tree.condition.warn(heading, body);
				} else {
					tree.condition.error(heading, body);
				}
			}
		}
		checkBadCondition(tree.condition, true);
	} else {
		checkBadCondition(tree, false);
	}
}

function antiTruthyCompare(tree, context) {
	if (tree.type === "BinaryExpression") {
		var sub;
		var pre = "";
		if (tree.operator === "~=") {
			if (isNil(tree.left) || isFalse(tree.left)) {
				// false ~= x
				sub = tree.right;
			}
			if (isNil(tree.right) || isFalse(tree.right)) {
				// x ~= false
				sub = tree.left;
			}
			if (isTrue(tree.left)) {
				pre = "not ";
				sub = tree.right;
			}
			if (isTrue(tree.right)) {
				pre = "not ";
				sub = tree.left;
			}
		}
		if (tree.operator === "==") {
			if (isNil(tree.left) || isFalse(tree.left)) {
				pre = "not ";
				sub = tree.right;
			}
			if (isNil(tree.right) || isFalse(tree.right)) {
				pre = "not ";
				sub = tree.left;
			}
			if (isTrue(tree.left)) {
				sub = tree.right;
			}
			if (isTrue(tree.right)) {
				sub = tree.left;
			}
		}
		var complain = COMPLAIN_BOOLEAN_COMPARE || context.contains("condition");
		if (sub && complain) {
			tree.warn("Unnecessary comparison in condition",
				"Consider using simply <code>" + pre + show(sub) + "</code> instead of <code>" + show(tree) + "</code>.");
			if (pre) {
				// Suggestion is not(sub) for tree
				tree.suggestion = {
					type:"UnaryExpression", operator: "not", argument: sub}
			} else {
				// Suggestion is sub for tree
				tree.suggestion = sub;
			}
		}
	}
}

// Complain about indexing a FindFirstChild with only one parameter.
function antiFFCDot(tree) {
	if (tree.type === "MemberExpression") {
		if (tree.base.type === "CallExpression"
			&& tree.base.base.type === "MemberExpression"
			&& tree.base.arguments.length === 1) {
			var method = tree.base.base.identifier.name;
			if (method === "findFirstChild" || method === "FindFirstChild") {
				var left = tree.base.base.base;
				var name = tree.base.arguments[0];
				var temp = tree.base;
				tree.base = {type: "IndexExpression", base: left, index: name};
				var soln = show(tree);
				tree.base = temp;
				tree.warn("You index a result of <code>:FindFirstChild</code>",
					"Your code uses <code>" + show( tree ) + "</code>. Using "
					+ "<code>.</code> or <code>:</code> on the result of "
					+ "<code>:FindFirstChild</code> will result in an error if "
					+ "it returns <code>nil</code>. You should either do proper "
					+ "handling of <code>nil</code> or simply use <code>" + soln
					+ "</code>");
				tree.base.suggestion = {type: "IndexExpression", base: left, index: name};
			}
		}
	}
}

module.exports.lint = antipatternStage;
