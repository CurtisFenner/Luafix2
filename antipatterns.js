function antipatternStage(parse) {
	// Find `x ~= nil`
	lprecurse(parse, antiTruthyCompare, antiTruthyPre, antiTruthyPost, []);
	lprecurse(parse, antiFFCDot);
	lprecurse(parse, searchBadCondition);
	lprecurse(parse, badComparisons);
	lprecurse(parse, badNot);
	lprecurse(parse, badLoop);
	lprecurse(parse, badRepeat);
	lprecurse(parse, badAssignment);
	lprecurse(parse, badIndex);
	lprecurse(parse, endingUnderscore);
}

////////////////////////////////////////////////////////////////////////////////

// TODO: Complain about successive `if`s having the same condition, or `and` the same condition.
// if (a & b) {
// }
// if (c & b) {
// }


function isUnderscores(n) {
	return n.replace(/_/g, "").length === 0 && n.length > 0;
}

function endingUnderscore(t) {
	function check(v, to) {
		for (var i = v.length - 1; i >= (to || 0); i--) {
			if (v[i].type === "Identifier" && isUnderscores(v[i].name)) {
				error("Unnecessary identifier", "Since <code>" + v[i].name + "</code> won't be used, it should be dropped.", v[i]);
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

function badIndex(tree) {
	if (tree.type === "IndexExpression") {
		if (tree.index.type === "StringLiteral") {
			if (isIdentifier(tree.index.value)) {
				var r = {type: "MemberExpression", indexer: ".", base: tree.base, identifier: {type: "Identifier", name: tree.index.value}};
				warn("Use <code>" + show(r) + "</code> instead of indexing by a string", "Indexing should be used for variables or names which need it.", tree);
				tree.suggestion = r;
			}
		}
	}
}

function badAssignment(tree) {
	if (tree.type === "AssignmentStatement" || tree.type === "LocalStatement") {
		if (tree.variables.length < tree.init.length) {
			error(
				"Some values are lost in the assignment",
				"There are more values than there are variables. Either some values should be saved, or this should be broken into separate statements.",
				tree);
		}
		if (tree.variables.length === 1 && tree.init.length === 1) {
			if (canBeFunctionIdentifier(tree.variables[0])) {
				var fun = tree.init[0];
				if (fun.type === "FunctionDeclaration") {
					warn("Use normal function declaration syntax",
						"Your meaning will be clearer if you use the construct designed for this, a function declaration",
						tree.variables[0]);
					tree.suggestion = {
						type:"FunctionDeclaration", identifier: tree.variables[0],
						isLocal: tree.type === "LocalStatement", parameters: fun.parameters,
						body: fun.body};
				}
			}
		}
	}
}

function badLoop(tree) {
	if (tree.type === "ForNumericStatement" || tree.type === "ForGenericStatement") {
		if (tree.body.length === 0) {
			error("Empty loop", "This loop will not do anything.", tree);
		}
	}
	if (tree.type === "RepeatStatement" || tree.type === "WhileStatement") {
		if (tree.body.length === 0) {
			if ((isFalsey(tree.condition) && tree.type === "RepeatStatement") || (isTruthy(tree.condition) && tree.type === "WhileStatement")) {
				error("Infinite loop will crash", "This infinite loop will crash. Add a body to it or change the condition.", tree);
			} else {
				warn(
					"Empty loop",
					"This <code>" + (tree.type === "RepeatStatement" ? "repeat" : "while") + "</code> will likely crash if it runs.",
					tree
				);
			}
		}
	}
	if (tree.type === "RepeatStatement" || tree.type === "ForNumericStatement" || tree.type === "ForGenericStatement" || tree.type === "WhileStatement") {
		if (tree.body.length === 1) {
			if (tree.body[0].type === "IfStatement") {
				var last = tree.body[0].clauses[tree.body[0].clauses.length - 1];
				if (last.type === "ElseClause") {
					warn(
						"Exhausted <code>if</code> in loop",
						"You should be careful that no action is taken based solely on the first or last iteration of the loop.",
						tree.body[0].clauses[tree.body[0].clauses.length - 1]
					);
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

function badNot(tree) {
	if (tree.type == "BinaryExpression" && tree.operator == "==") {
		if (tree.left.type == "UnaryExpression" && tree.left.operator == "not") {
			warn("Comparing <code>not</code> of value",
				"<code>not</code> has higher precedence than <code>==</code>. If you want to check if two values are different, you should use <code>~=</code>.", tree);
		}
	}
	if (tree.type == "UnaryExpression" && tree.operator == "not") {
		if (isTruthy(tree.argument)) {
			error("A <code>not</code> of a literal is always <code>false</code>",
				"Since <code>" + show(tree.argument) +
				"</code> is truthy, this expression is always <code>false</code>. Did you forget parenthesis?", tree);
		}
	}
}

function badComparisons(tree) {
	if (tree.type == "BinaryExpression") {
		var relation = ["==", "<", "~=", ">", "<=", ">="];
		var operator = tree.operator;
		if (relation.indexOf(operator) >= 0) {
			if (tree.left.type == "TableConstructorExpression" || tree.right.type == "TableConstructorExpression") {
				error("Expression is always <code>" + (operator == "~=") +"</code>",
					"Tables are compared by reference. This comparison creates a <em>new</em> table, different from all others.", tree);
			}
			if (isTruthy(tree.left) && isTruthy(tree.right)) {
				error("Redundant comparison",
					"The result of <code>" + show(tree) +
					"</code> is clear without running the script. Write <code>true</code> or <code>false</code> when that is what you mean.", tree);
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

function badRepeat(tree) {
	if (tree.type == "IfStatement") {
		if (tree.clauses.length != 1) {
			return;
		}
		var then = tree.clauses[0];
		if (then.body.length == 1) {
			if (then.body[0].type === "RepeatStatement") {
				warn("Consider using a <code>while</code> instead [DRY]",
					"Instead of using <code>if a then repeat until not a</code>, just use <code>while a do end</code>",
					then);
			}
		}
	}
}

function checkBadCondition(tree) {
	// Always true or always false conditions are bad.
	if (tree.type == "LogicalExpression") {
		if (tree.operator == "and") {
			if (isFalsey(tree.left)) {
				error("Condition is always <code>false</code>",
					"The left expression <code>" + show(tree.left) + "</code> is always falsy.", tree);
			}
			if (isFalsey(tree.right)) {
				error("Condition is always <code>false</code>",
					"The right expression <code>" + show(tree.right) + "</code> is always falsy", tree);
			}
			if (isTruthy(tree.left)) {
				error("Right side of <code>and</code> is redundant",
					"The left side <code>" + show(tree.left) + "</code> is always truthy", tree);
			}
			if (isTruthy(tree.right)) {
				error("Left side of <code>and</code> is redundant",
					"The right side <code>" + show(tree.right) + "</code> is always truthy", tree);
			}
		} else if (tree.operator == "or") {
			if (isTruthy(tree.left)) {
				error("Condition is always <code>true</code>",
					"The left expression <code>" + show(tree.left) + "</code> is always truthy.", tree);
			}
			if (isTruthy(tree.right)) {
				error("Condition is always <code>true</code>",
					"The right expression <code>" + show(tree.right) + "</code> is always truthy", tree);
			}
			if (isFalsey(tree.left)) {
				error("Right side of <code>or</code> is redundant",
					"The left side <code>" + show(tree.left) + "</code> is always falsey", tree);
			}
			if (isFalsey(tree.right)) {
				error("Left side of <code>or</code> is redundant",
					"The right side <code>" + show(tree.right) + "</code> is always falsey", tree);
			}
		}
	}
}

function searchBadCondition(tree) {
	if (tree["condition"]) {
		checkBadCondition(tree.condition);
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
			warn("Unnecessary comparison in condition",
				"Consider using simply <code>" + pre + show(sub) + "</code> instead of <code>" + show(tree) + "</code>.",
				tree);
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
	if (!USE_ROBLOX) {
		return;
	}
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
				error("You index a result of <code>:FindFirstChild</code>",
					"Your code uses <code>" + show( tree ) + "</code>. Using "
					+ "<code>.</code> or <code>:</code> on the result of " 
					+ "<code>:FindFirstChild</code> will result in an error if "
					+ "it returns <code>nil</code>. You should either do proper "
					+ "handling of <code>nil</code> or simply use <code>" + soln
					+ "</code>", tree);
				tree.base.suggestion = {type: "IndexExpression", base: left, index: name};
			}
		}
	}
}
