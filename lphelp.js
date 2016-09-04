"use strict";

var isLoop = {}
isLoop.ForNumericStatement = true;
isLoop.WhileStatement = true;
isLoop.ForGenericStatement = true;
isLoop.RepeatStatement = true;

var doNormal = {};
doNormal.VarargLiteral = [];
doNormal.TableKey = ["key", "value"];
doNormal.TableKeyString = ["value"];
doNormal.DoStatement = ["body"];
doNormal.FunctionDeclaration = ["body"];
doNormal.ReturnStatement = ["arguments"];
doNormal.AssignmentStatement = ["variables", "init"];
doNormal.LocalStatement = doNormal.AssignmentStatement;
doNormal.CallExpression = ["base", "arguments"];
doNormal.StringCallExpression = ["base", "argument"];
doNormal.TableCallExpression = doNormal.CallExpression;
doNormal.MemberExpression = ["base"]; // IGNORE identifier (which is right of .)
doNormal.LogicalExpression = ["left", "right"];
doNormal.RepeatStatement = ["body", "condition"];


doNormal.ForNumericStatement = ["start", "end", "step", "body"];
doNormal.ForGenericStatement = ["iterators", "body"];

doNormal.WhileStatement = ["condition", "body"];

doNormal.IndexExpression = ["base", "index"];

doNormal.TableConstructorExpression = ["fields"];
doNormal.TableValue = ["key", "value"];

doNormal.UnaryExpression =["argument"];
doNormal.BinaryExpression = ["left", "right"];
doNormal.Chunk = ["body"];
doNormal.CallStatement = ["expression"];

doNormal.AssignmentStatement = ["variables", "init"];

doNormal.IfStatement = ["clauses"];
doNormal.IfClause = ["condition", "body"];
doNormal.ElseifClause = doNormal.IfClause;
doNormal.ElseClause = ["body"];

var isBottom = {};
isBottom.Identifier = true;
isBottom.NumericLiteral = true;
isBottom.StringLiteral = true;
isBottom.NilLiteral = true;
isBottom.BooleanLiteral = true;
isBottom.BreakStatement = true;

// Returns whether or not the tree represents an expression
// (May have false negatives, not intentionally)
function isExpression(tree) {
	if (tree instanceof Array) {
		return tree.length > 0 && isExpression(tree[0]);
	}
	if (tree.type === "FunctionDeclaration") {
		return !tree.identifier;
	}
	if (isBottom[tree.type]) {
		return true;
	}
	var exp = [];
	return exp.contains(tree.type) || tree.type.indexOf("Expression") >= 0;
}

// Returns whether or not the tree represents an LValue
function isLValue(tree) {
	if (!isExpression(tree)) {
		return false;
	}
	// is an expression
	var ls = ["Identifier", "MemberExpression", "IndexExpression"];
	return ls.contains(tree.type);
}

// Returns whether or not the tree represents a statement
// (may have false negatives, but not intentionally)
function isStatement(tree) {
	if (tree.type === "FunctionDeclaration") {
		return !!tree.identifier;
	}
	var stats = [
		"LocalStatement", "AssignmentStatement", "CallStatement",
		"ReturnStatement", "BreakStatement" ];
	return stats.contains(tree.type);
}

// Returns whether or not the tree represents a block of statements
// (may have false negatives, but not intentionally)
function isBlock(tree) {
	if (tree instanceof Array) {
		return tree.length === 0 || isBlock(tree[0]);
	}
	var controls = [
		"IfStatement", "IfClause", "ElseClause", "ElseifClause",
		"WhileStatement", "DoStatement", "RepeatStatement",
		"ForNumericStatement",
		"FunctionDeclaration", "ForGenericStatement", "Chunk"];
	return controls.contains(tree.type);
}

var idnum = 0;
// Recursively descends through a tree.
// pre() is called on object (but not arrays)
// fun() is called on object (but on arrays)
// (descends on children)
// post() is called on object
function lprecurse(tree, fun, pre, post, arg) {
	if (!tree.parent) {
		tree.parent = {};
	}
	if (tree instanceof Array) {
		for (var i = 0; i < tree.length; i++) {
			tree[i].parent = tree.parent; // tree is a list.
			tree[i].arrayindex = i;
			tree[i].property = tree.property;
			lprecurse(tree[i], fun, pre, post, arg);
		}
	} else if (tree.type) {
		if (!tree.idnum) {
			idnum++;
			tree.idnum = idnum;
		}
		// Fill in Parent for unsearch properties
		if (tree.type == "FunctionDeclaration") {
			// Set Parent of
			var k = tree;
			while (k.identifier) {
				k.identifier.parent = k;
				if (k.type == "FunctionDeclaration") {
					k.identifier.property = "identifier";
					k = k.identifier;
				} else {
					k.identifier.property = "base";
					k = k.base;
				}
			}
		}
		// Do "before" work
		if (pre) {
			pre(tree, arg);
		}
		// Do "here" work
		fun(tree, arg);
		// Find children
		var exec = doNormal[tree.type];
		if (!exec) {
			if (isBottom[tree.type]) {
			} else {
				implementation("No lprecurse implementation for " + tree.type);
			}
		} else {
			// Get "normal" properties off of this tree
			for (var i = 0; i < exec.length; i++) {
				var op = tree[exec[i]];
				if (op) {
					op.parent = tree;
					op.property = exec[i];
					lprecurse(op, fun, pre, post, arg);
				} else {
					// e.g., step
				}
			}
		}
		// Do "after" work
		if (post) {
			post(tree, arg);
		}
	} else {
		console.log("Unexpected object", tree, "received in lprecurse");
	}
}

// Produces the union of two arrays
function union(a, b) {
	var t = [];
	for (var i = 0; i < a.length; i++) {
		if (t.indexOf(a[i]) < 0) {
			t.push(a[i]);
		}
	}
	for (var i = 0; i < b.length; i++) {
		if (t.indexOf(b[i]) < 0) {
			t.push(b[i]);
		}
	}
	return t;
}

// Produces the set subtraction of two arrays
function difference(a, b) {
	var t = [];
	for (var i = 0; i < a.length; i++) {
		if (b.indexOf(a[i]) < 0) {
			t.push(a[i]);
		}
	}
	return t;
}

module.exports.lprecurse = lprecurse;
