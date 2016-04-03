var precedence = {};
var ambiguous = {};
precedence["^"] = 0;
precedence["unot"] = 1;
precedence["u-"] = 1;
precedence["*"] = 2;
precedence["/"] = 2;
precedence["+"] = 3;
precedence["-"] = 3;
ambiguous[4] = true;
precedence[".."] = 4;
ambiguous[5] = true;
precedence["<"] = 5;
precedence[">"] = 5;
precedence["<="] = 5;
precedence[">="] = 5;
precedence["~="] = 5;
precedence["=="] = 5;
ambiguous[6] = true;
precedence["and"] = 6;
ambiguous[7] = true;
precedence["or"] = 7; // cheat?

function arrowHead(t, x, y, dx, dy) {
	var C = [x, y];
	var A = [x - dx * 10 - dy * 5, y - dy * 10 + dx * 5];
	var B = [x - dx * 10 + dy * 5, y - dy * 10 - dx * 5];
	t.moveTo(C[0], C[1]);
	t.lineTo(A[0], A[1]);
	t.lineTo(B[0], B[1]);
	t.fillStyle = "black";
	t.fill();
}

function showArrow(from, to) {
	var c = document.createElement("canvas");
	post.appendChild(c);
	var x = Math.min(from.x, to.x);
	var y = Math.min(from.y, to.y);
	var dx = to.x - from.x;
	var dy = to.y - from.y;
	var w = Math.abs(dx);
	var h = Math.abs(dy);
	var dm = Math.sqrt(dx * dx + dy * dy);
	c.width = w;
	c.height = h;
	c.style.position = "absolute";
	c.style.left = x + "px";
	c.style.top = y + "px";
	c.style.opacity = "0.5";
	var t = c.getContext('2d');
	if ((from.x == x && from.y == y) || (to.x == x && to.y == y)) {
		t.moveTo(0, 0);
		t.lineTo(w, h);
	} else {
		t.moveTo(w, 0);
		t.lineTo(0, h);
	}
	t.stroke();
	arrowHead(t, to.x - x, to.y - y, dx / dm, dy / dm);
}

function showArrows(arrows) {
	function center(x) {
		var e = document.getElementById("tree" + x);
		return {
			x: e.offsetLeft + e.offsetWidth / 2,
			y: e.offsetTop + e.offsetHeight / 2,
		};
	}
	for (var i = 0; i < arrows.length; i++) {
		showArrow(center(arrows[i].from), center(arrows[i].to));
	}
}

function tab(s) {
	return "\t" + s.replace(/\n/g, "\n\t");
}

function body(list) {
	if (!list.length) {
		return "\n";
	}
	return "\n" + tab(showTree(list).join("\n")) + "\n";
}

function sKey(s) {
	return s;
}

function sKeyLiteral(s) {
	return s;
}

function sKeyLogical(s) {
	return s;
}

function sNumber(s) {
	return s;
}

function sString(s) {
	return s;
}

// tree: tree to show
// pp: parent precedence (number | undefined -> Infinity)
function showTree(tree, pp) {
	if (pp === undefined) {
		pp = Infinity;
	}
	if (tree instanceof Array) {
		var r = [];
		for (var i = 0; i < tree.length; i++) {
			r[i] = show(tree[i], pp);
		}
		return r;
	}
	if (tree.operator) {
		var p = tree.argument ? precedence["u" + tree.operator] : precedence[tree.operator];
		if (tree.type != "UnaryExpression") {
			var o = tree.operator;
			if (o == "and" || o == "or") {
				o = sKeyLogical(o);
			}
			var s = show(tree.left, p) + " " + o + " " + show(tree.right, p);
		} else {
			if (tree.operator == "not") {
				var s = sKeyLogical(tree.operator) + " " + show(tree.argument, p);
			} else {
				var s = tree.operator + show(tree.argument, p);
			}
		}
		if (p > pp || ambiguous[pp]) {
			// require parens
			return "(" + s + ")";
		} else {
			return s
		}
	} else if (tree.type === "Chunk") {
		return showTree(tree.body).join("\n");
	} else if (tree.type === "AssignmentStatement") {
		return showTree(tree.variables).join(", ") + " = " + showTree(tree.init).join(", ") + ";";
	} else if (tree.type === "Identifier") {
		return tree.name;
	} else if (tree.type === "StringLiteral") {
		return sString(encode(tree.raw));
	} else if (tree.type === "NumericLiteral") {
		return sNumber(tree.raw);
	} else if (tree.type === "BooleanLiteral" || tree.type === "NilLiteral") {
		return sKeyLiteral(tree.raw);
	} else if (tree.type === "VarargLiteral") {
		return sKeyLiteral("...");
	} else if (tree.type === "ForNumericStatement") {
		var s = sKey("for") + " " + show(tree.variable) + " = " + show(tree.start) + ", " + show(tree.end);
		if (tree.step) {
			s += ", " + show(tree.step);
		}
		s += " " + sKey("do") + body(tree.body) + sKey("end");
		return s;
	} else if (tree.type === "CallStatement") {
		return show(tree.expression) + ";";
	} else if (tree.type === "CallExpression") {
		return show(tree.base) + "(" + showTree(tree.arguments).join(", ") + ")";
	} else if (tree.type === "TableCallExpression") {
		return show(tree.base) + " " + show(tree.arguments); // luaparse has a bug :(
	} else if (tree.type === "StringCallExpression") {
		return show(tree.base) + " " + show(tree.argument);
	} else if (tree.type === "FunctionDeclaration") {
		var s = sKey("function");
		if (tree.isLocal) {
			s = sKey("local") + " " + s;
		}
		if (tree.identifier) {
			s += " " + show(tree.identifier);
		}
		s += "(" + showTree(tree.parameters).join(", ") + ")" + body(tree.body) + sKey("end");
		return s;
	} else if (tree.type === "ReturnStatement") {
		var s = sKey("return");
		if (tree.arguments.length === 0) {
			return s + ";";
		}
		return s + " " + showTree(tree.arguments).join(", ") + ";"
	} else if (tree.type === "LocalStatement") {
		var s = sKey("local") + " " + showTree(tree.variables).join(", ")
		if (tree.init.length > 0) {
			s += " = " + showTree(tree.init).join(", ");
		}
		return s + ";"
	} else if (tree.type === "IfStatement") {
		return showTree(tree.clauses).join("") + sKey("end");
	} else if (tree.type === "IfClause") {
		return sKey("if") + " " + show(tree.condition) + " " + sKey("then") + body(tree.body);
	} else if (tree.type === "ElseifClause") {
		return sKey("elseif") + " " + show(tree.condition) + " " + sKey("then") + body(tree.body);
	} else if (tree.type === "ElseClause") {
		return sKey("else") + body(tree.body);
	} else if (tree.type === "MemberExpression") {
		return show(tree.base, -1/0) + tree.indexer + show(tree.identifier);
	} else if (tree.type === "IndexExpression") {
		return show(tree.base, -1/0) + "[" + show(tree.index) + "]";
	} else if (tree.type === "TableConstructorExpression") {
		if (tree.fields.length) {
			var s = tab( showTree(tree.fields).join(",\n") );
			return "{\n" + s + ",\n}";
		} else {
			return "{}"
		}
	} else if (tree.type === "TableValue") {
		return show(tree.value);
	} else if (tree.type === "TableKey") {
		return "[" + show(tree.key) + "] = " + show(tree.value);
	} else if (tree.type === "TableKeyString") {
		return show(tree.key) + " = " + show(tree.value);
	} else if (tree.type === "StringCallExpression") {
		return show(tree.base) + " " + show(tree.argument);
	} else if (tree.type === "WhileStatement") {
		return sKey("while") + " " + show(tree.condition) + " " + sKey("do") + body(tree.body) + sKey("end");
	} else if (tree.type === "ForGenericStatement") {
		var s = sKey("for") + " ";
		s += show(tree.variables).join(", ") + " " + sKey("in") + " ";
		s += show(tree.iterators).join(", ");
		s += " " + sKey("do");
		return s + body(tree.body) + sKey("end");
	} else if (tree.type === "RepeatStatement") {
		return sKey("repeat") + body(tree.body) + sKey("until") + " " + show(tree.condition) + ";"
	} else if (tree.type === "DoStatement") {
		return sKey("do") + body(tree.body) + sKey("end");
	} else if (tree.type === "BreakStatement") {
		return sKey("break") + ";";
	} else if (tree.type === "Comment") {
		return sNumber("--" + tree.text) + "\n";
	}
	implementation("Showing " + tree.type,"_", tree);
	return "[$" + tree.type + "$]";
}

function identity(x) {
	return x;
}

function encode(s) {
	return s;
}

function htmlEncode(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

var showAnnotate = identity;
function show(tree, n) {
	var a = showTree(tree, n);
	return showAnnotate(a, tree);
}

function wrapper(before, after) {
	return function(s) {
		return before + s + after;
	};
}

function spanner(c) {
	return wrapper("<span class='" + c +"'>", "</span>");
}


function showMode(mode) {
	if (mode === "html") {
		encode = htmlEncode;
		sKey = spanner("key");
		sLogical = spanner("logical");
		sKeyLiteral = spanner("keyliteral");
		sKeyLogical = spanner("keyliteral");
		sNumber = spanner("number");
		sString = spanner("string");
	} else if (mode === "escape") {
		encode = htmlEncode;
		// Identities:
		sKey = identity;
		sLogical = identity;
		sKeyLiteral = identity;
		sKeyLogical = identity;
		sNumber = identity;
		sString = identity;
	} else if (mode === "bare") {
		encode = identity;
		sKey = identity;
		sLogical = identity;
		sKeyLiteral = identity;
		sKeyLogical = identity;
		sNumber = identity;
		sString = identity;
	} else {
		throw "Invalid show mode.";
	}
}

var HoverProblems = [];
var hoverProblemKey = 0;

function highlightProblems(text, tree) {
	var problems = tree.problems;
	if (problems) {
		var red = 0;
		var yellow = 0;
		var blue = 0;
		for (var i = 0; i < problems.length; i++) {
			if (problems[i].type === "warning") {
				yellow++;
			} else if (problems[i].type === "error") {
				red++;
			} else if (problems[i].type === "info") {
				blue++;
			}
		}
		problems.sort(function(a, b) {
			var num = {"info": 1, "warning": 2, "error": 3}
			return num[a] < num[b];
		})
		var colorMap = {
			warning: "yellow",
			error: "red",
			info: "blue"
		}
		for (var i = 0; i < problems.length; i++) {
			text = "<span class=p" + colorMap[problems[i].type] + ">" + text + "</span>";
		}
		hoverProblemKey = HoverProblems.length;
		HoverProblems.push(problems);
		text = "<span data-problem-key=" + hoverProblemKey + ">" + text + "</span>"
		//return "<span id=p" + tree.idnum + ">" + text + "</span>";
	}
	return "<span id='tree" + tree.idnum + "'>" + text + "</span>";
}


function suggestSolutions(text, tree) {
	if (tree.suggestion) {
		return "<span class=pgray>" + show(tree.suggestion) + "</span>";
	} else {
		return text;
	}
}
