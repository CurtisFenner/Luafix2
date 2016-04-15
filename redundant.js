function observe(tree, data) {
	if (tree.type == "Chunk") {
		return;
	}
	var key = show(tree);
	data[key] = data[key] || [];
	data[key].push(tree);
}

function findRepetition(tree) {
	var data = {};
	lprecurse(tree, observe, null, null, data);
	for (var statement in data) {
		var usages = data[statement].length;
		var length = statement.length;
		// TODO: define AST based costs
		var inline = usages * length;
		var defined = 40 + 8 * usages + length;
		if (inline / 2 > defined) {
			for (var i = 0; i < data[statement].length; i++) {
				warn("Statement is excessively repeated",
					"The statement <code>" + statement + "</code> is repeated too much. Using a function or variable, you could save around " + (inline - defined) + " characters, and a lot of typing when you make changes.",
					data[statement][i]);
			}
		}
	}
	lprecurse(tree, findUnconditional);
}


function findUnconditional(tree) {
	// If tree is an IfStatement...
	// see if all of the clauses have the same ending statement.
	if (tree.type === "ElseClause") {
		if (tree.body.length == 0) {
			error("Empty body in <code>else</code>",
				"If nothing will happen when the conditions aren't meant, " +
				"there is no purpose in including an <code>else</code> clause " +
				"at all.", tree);
				tree.suggestion = {type:"Chunk", body:[{type:"Comment", text:"Removed `else`"}]};
		} else if (tree.body.length === 1 && tree.body[0].type === "IfStatement") {
			warn("Use of <code>else if .... end end</code> instead of " +
				"<code>elseif end</code>", "You can save levels of indentation "
				+ "and an <code>end</code> by using <code>elseif</code>", tree.body[0].clauses[0].condition);
			var clausy = tree.body[0].clauses;
			var suggestion = {type: "IfStatement"};
			var c = [];
			for (var i = 0; i < tree.parent.clauses.length - 1; i++) {
				// Don't include "else"
				c[i] = tree.parent.clauses[i];
			}
			var first = {
				type:"ElseifClause",
				body:clausy[0].body,
				condition: clausy[0].condition};
			c.push(first);
			for( var i = 1; i < clausy.length; i++) {
				c.push( clausy[i] );
			}
			suggestion.clauses = c;
			tree.parent.suggestion = suggestion;
		}
	}
	if (tree.type === "IfStatement" && tree.clauses.length > 1) {
		var clauses = tree.clauses;
		var ends = [];
		var seen = [];
		for (var i = 0; i < clauses.length; i++) {
			if (clauses[i].body.length) {
				// Non-empty body
				var s = show(clauses[i].body.peek());
				if (!seen.contains(s)) {
					ends.push({key:s, tree:clauses[i].body.peek()});
				}
			}
		}
		for (var j = 0; j < ends.length; j++) {
			var count = 0;
			for (var i = 0; i < clauses.length; i++) {
				if (clauses[i].body.length) {
					// Non-empty body.
					var last = clauses[i].body.peek();
					if (show(last) === ends[j].key) {
						count++;
					}
				}
			}
			if (count === clauses.length) {
				if (clauses.peek().type === "ElseClause") {
					error("Repetition of <code>" + ends[j].key + "</code> in " +
						"every <code>elseif</code> and <code>else</code>",
						"You include this code "
						+ "in every branch&mdash;it will always happen."
						+ "You should move " +
						"this code to be <em>after</em> the final " +
						"<code>end</code> of this <code>if</code>." +
						"<b><a href=example/elseifs.html>Example Code</a></b>",
						ends[j].tree);
					// TODO: "SUGGESTION NEEDED IN REDUNDANT FOR ELSE CLAUSE CERTAINY")
				} else {
					warn("Repetition of <code>" + ends[j].key + "</code> in " +
						"every <code>elseif</code>", "You include this code "
						+ "in every branch, but don't provide an " +
						"<code>else</code>. If these case <em>are</em> meant " +
						"to be exhaustive (i.e., you would never expect " +
						"<code>else</code> "
						+ "to run if you included it) then you should move " +
						"this code to be <em>after</em> the final " +
						"<code>end</code>. If not exhaustive, you can still " +
						"add it after by checking that <em>any</em> " +
						"<code>elseif</code> would happen. " +
						"<b><a href=example/elseifs.html>Example Code</a></b>",
						ends[j].tree);
				}
			} else if (count >= clauses.length * 0.74) {
					warn("Repetition of <code>" + ends[j].key + "</code> in " +
						"most <code>elseif</code> branches", "You include this "
						+ "code many times (but not always). It probably makes "
						+ "sense to break the <code>if</code> based on this " +
						"code repetition. See " +
						"<b><a href=example/elseifs.html>Example Code</a></b>",
						ends[j].tree);
			}
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
/*
function addWeight(tree, to) {
	if (tree.type === "IndexExpression") {
		to.number++;
	}
	to.number++;
}

function weight(tree) {
	var count = {number: 0};
	lprecurse(tree, addWeight, null, null, count);
	return count.number;
}

function repObserve(tree, countsweights) {
	var counts = countsweights[0];
	var weights = countsweights[1];
	var k = show(tree);
	counts[k] = (counts[k] || 0) + 1;
	weights[k] = weight(tree);
}

function findRepetition(tree) {
	var counts = {};
	var weights = {};
	lprecurse(tree, repObserve, null, null, [counts, weights]);
	for (k in counts) {
		if (counts[k] * weights[k] >= 15 && weights[k] > 2 && counts[k] > 2) {
			// Intervention required.
			warn("Excessive repetition in code: <code>" + k + "</code>",
				"You should consider using variables or functions to avoid "
				+ "code that repeats itself. Code that repeats itself becomes "
				+ "harder to change and understand, and is longer than it "
				+ "needs to be.");
		}
	}
}*/
