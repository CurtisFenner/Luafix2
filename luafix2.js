

String.prototype.count = function(reg) {
	return (this.match(reg) || []).length;
}

function stackTrace() {
	var err = new Error();
	return err.stack;
}

var messageCache = {};
function clear() {
	messageCache = {};
	document.getElementById("report").innerHTML = "";
	document.getElementById("post").innerHTML = "";
	document.getElementById("suggested").innerHTML = "";
}

function message(strong, message, type, tree) {
	var serial = strong + ">>" + message + ">>" + type;
	if (!tree) {
		//if (tree !== false)
		//	console.log("No tree given to message\n", stackTrace());
	} else {
		tree.problems = tree.problems || [];
		var add = true;
		for (var i = 0; i < tree.problems.length; i++) {
			if (tree.problems[i].message == message &&
				tree.problems[i].title == strong) {
				add = false;
			}
		}
		if (add) {
			tree.problems.push({type: type, message: message, title: strong});
		}
	}
	if (messageCache[serial]) {
		var qty = messageCache[serial];
		qty.innerHTML = qty.innerHTML * 1 + 1;
		qty.style.color = "initial";
	} else {
		var w = document.createElement("div");
		w.className = type;
		var qty = document.createElement("div");
		qty.className = "quantity";
		qty.innerHTML = "1";
		messageCache[serial] = qty;
		w.appendChild(qty);
		var m = document.createElement("span");
		m.innerHTML = "<strong>" + strong + "</strong> " + message;
		w.appendChild(m);
		document.getElementById("report").appendChild(w);
	}
}

var warnCount = 0;
var errorCount = 0;
function warn(strong, msg, tree) {
	warnCount++;
	message(strong, msg || "", "warning", tree);
}

function error(strong, msg, tree) {
	errorCount++;
	message(strong, msg || "", "error", tree);
}

function info(strong, msg, tree) {
	message(strong, msg || "", "info", tree);
}

function implementation(strong, msg, tree) {
	message(strong, msg || "", "implementation", tree);
}

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



function styleStage(parse, source) {
	message("LuaFix started", source.length + " bytes processed", "info", false);
	// Count different elements:
	var spacedBefore = source.count(/\s[-+*\/=.^~<>]/g)
	var spacedAfter = source.count(/[-+*\/=.^~<>]\s/g)
	var operators = source.count(/[-+*\/=.^~<>]/g);
	var doubles = source.count(/[><=~]=/g) + source.count(/\.\./g);
	var unspaced = operators - doubles - (spacedBefore + spacedAfter) / 2
	if (unspaced == 0) {
		//info("Good spacing around operators", "");
	} else {
		//warn("Place spaces around operators",
		//	Math.ceil(unspaced) + " operators without spaces");
	}
	// Find table calls / string calls.
	lprecurse(parse, literalCallComplain);
}



function codeReuseStage(parse) {
	findRepetition(parse);
}


function magicStage(parse) {
	lprecurse(parse, magicFinder, false, false, {});
}

function luafix2() {
	warnCount = 0;
	errorCount = 0;
	var source = document.getElementById("source").value;
	clear();
	showMode("escape");
	try {
		var parse = luaparse.parse(source);
	} catch (e) {
		info("LuaFix could not run because the input was not syntactically valid.");
		error(e);
		return;
	}
	// Descend through parse 
	styleStage(parse, source);
	// variableStage(parse, source);
	clobberStage(parse);
	codeReuseStage(parse, source);
	antipatternStage(parse, source);
	usesStage(parse);
	magicStage(parse, source);
	info("LuaFix finished.", "<strong>" + errorCount +
		"</strong> errors and <strong>" +
		warnCount + "</strong> warnings.", false);
	// Stages:
	// 1) Style (without full parse)
	// 2) Style warnings requiring parse
	// 3) Variable type checking / side effects / use
	// 4) Code reuse check
	// 5) Specific anti-pattern search
	showMode("html");
	showAnnotate = highlightProblems;
	document.getElementById("post").innerHTML = show( parse );
	//
	showAnnotate = suggestSolutions;
	var sug = show(parse);
	//if (sug.indexOf("<span class=pgray") >= 0) {
		document.getElementById("suggested").innerHTML = sug;
	/*} else {
		document.getElementById("suggested").innerHTML =
			"(Cannot offer any automated suggestions)";
	}*/
	//
	showMode("bare");
	showAnnotate = identity;
}

document.getElementById("checkbutton").onclick = luafix2;