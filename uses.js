// Track the location of any variable.
function usesStage(parse) {
	var sources = [];
	// Returns a ++ b with duplicates between a and b removed.
	function union(a, b) {
		var o = [];
		for (var i = 0; i < a.length; i++) {
			var use = !b.contains(a[i]);
			if (use) {
				o.push(a[i]);
			}
		}
		for (var i = 0; i < b.length; i++) {
			var use = !o.contains(b[i]);
			if (use) {
				o.push(b[i]);
			}
		}
		return o;
	}

	// merges into the second one.
	function merge(bf, af) {
		var out = [];
		assert(bf.length === af.length);
		for (var scope = 0; scope < af.length; scope++) {
			var level = {};
			out[scope] = level;
			var as = af[scope];
			var bs = bf[scope];
			for (var varName in as) {
				level[varName] = union( bs[varName] || [], as[varName] || [] );
			}
			for (var varName in bs) {
				level[varName] = union( bs[varName] || [], as[varName] || [] );
			}
		}
		return out;
	}

	function set(dic, key, val, global) {
		assert(val instanceof Array, "must set to array -- list of defs -- not single def");
		for (var i = 0; i < val.length; i++) {
			if (!sources.contains(val[i])) {
				val[i].reads = [];
				val[i].writes = [];
				val[i].name = key;
				sources.push(val[i]);
			}
		}
		for (var i = dic.length - 1; i >= 0; i--) {
			if (dic[i][key] !== undefined) {
				if (dic[i][key].locked) {
					error(dic[i][key].locked[0], dic[i][key].locked[1], val[0]); // TODO: check me
				}
				dic[i][key] = val;
				return;
			}
		}
		if (global) {
			dic[0][key] = val;
		} else {
			dic[dic.length - 1][key] = val;
		}
	}
	function get(dic, key) {
		for (var i = dic.length - 1; i >= 0; i--) {
			if (dic[i][key] != undefined) {
				return dic[i][key];
			}
		}
	}

	function writeProperty(memex, vs, kill) {
		var b = memex;
		while (b.base) {
			b = b.base;
		}
		if (b.name) {
			var ans = get(vs, b.name) || [];
			for (var i = 0; i < ans.length; i++) {
				ans[i].writes.push(memex);
				if (kill) {
					// TODO: make this more nuanced.
					// I *should* (but currently don't) keep assignnments to method calls, e.g
					// blah:thing().property = 
					// that should stay as a "read", even with "kill" on.
					ans[i].reads.pop();
				}
			}
		}
	}

	function copyVs(vs) {
		assert(vs, "copyVs must not be given undefined");
		var n = [];
		for (var i = 0; i < vs.length; i++) {
			var o = {};
			for (var p in vs[i]) {
				o[p] = vs[i][p];
			}
			n[i] = o;
		}
		return n;
	}

	function functionContext(tree) {
		if (!tree.parent) {
			return tree;
		} else if (tree.type == "FunctionDeclaration") {
			return tree;
		} else {
			if (tree.property == "identifier") {
				// Variables used in definition of function aren't part of
				// the function's scope.
				return functionContext(tree.parent.parent);
			}
			return functionContext(tree.parent);
		}
	}

	// Check any piece of the parse.
	// homes: Dictionary[variable name] -> [tree]
	function search(tree, vs) {
		assert(vs, "search must be given vs");
		// Make copy of vs:
		vs = copyVs(vs);
		assert(vs, "copyVs gave a value");
		// Determine kind of parse and traverse accordingly
		if (tree instanceof Array) {
			for (var i = 0; i < tree.length; i++) {
				vs = search(tree[i], vs);
				assert(vs, tree[i].type + " gave a bad thing");
			}
			return vs;
		} else if (tree.type === "AssignmentStatement" || tree.type === "LocalStatement") {
			vs = search(tree.init, vs);
			for (var i = 0; i < tree.variables.length; i++) {
				var v = tree.variables[i];
				if (v.type === "Identifier") {
					// Set a variable
					set(vs, v.name, [v], tree.type === "AssignmentStatement");
				} else {
					// A write to a property/index of a variable
					vs = search(v, vs);
					writeProperty(v, vs, true);
				}
			}
			return vs;
		} else if (tree.type.indexOf("Literal") >= 0 && tree.type != "VarargLiteral") {
			return vs;
		} else if (tree.type === "WhileStatement") {
			vs = search(tree.condition, vs);
			var was = copyVs(vs);
			vs.push({});
			vs = search(tree.body, vs);
			vs.pop();
			vs = merge(was, vs);
			vs.push({});
			vs = search(tree.body, vs);
			vs.pop();
			return merge(was, vs);
		} else if (tree.type === "ForGenericStatement") {
			vs = search(tree.iterators, vs);
			var was = copyVs(vs);
			vs.push({});
			for (var i = 0; i < tree.variables.length; i++) {
				var variable = tree.variables[i];
				var a = [variable];
				a.locked = ["Don't change <code>for</code> variables", "The result can be very unpredictable."];
				set(vs, variable.name, a);
			}
			vs = search(tree.body, vs);
			vs.pop();
			vs = merge(was, vs);
			vs.push({});
			for (var i = 0; i < tree.variables.length; i++) {
				var variable = tree.variables[i];
				var a = [variable];
				a.locked = ["Don't change <code>for</code> variables", "The result can be very unpredictable."];
				set(vs, variable.name, a);
			}
			vs = search(tree.body, vs);
			vs.pop();
			vs = merge(was, vs);
			return vs;
		} else if (tree.type === "RepeatStatement") {
			vs.push({});
			vs = search(tree.body, vs);
			vs = search(tree.condition, vs);
			var once = copyVs(vs);
			vs = search(tree.body, vs);
			vs = search(tree.condition, vs);
			return merge(once, vs);
		} else if (tree.type === "ForNumericStatement") {
			vs = search(tree.start, vs);
			vs = search(tree.end, vs);
			if (tree.step) {
				vs = search(tree.step, vs);
			}
			var was = copyVs(vs);
			vs.push({});
			var a = [tree.variable];
			a.locked = ["Do not change <code>for</code> control variables.",
				"PIL4.3.4: You should never change the value of the control variable: The effect of such changes is unpredictable."]
			set(vs, tree.variable.name, a);
			vs = search(tree.body, vs);
			vs.pop();
			vs.push({});
			var a = [tree.variable];
			a.locked = ["Do not change <code>for</code> control variables.",
				"PIL4.3.4: You should never change the value of the control variable: The effect of such changes is unpredictable."]
			set(vs, tree.variable.name, a);
			vs = search(tree.body, vs);
			vs.pop();
			var willExecute = false;
			var low = tree.start;
			var high = tree.end;
			if (low.type === "NumericLiteral" && high.type === "NumericLiteral") {
				var step = tree.step;
				if (!step) {
					var good = (high.value - low.value) / (1) > 0;
					willExecute = good;
				} else if (step.type === "NumericLiteral") {
					var good = (high.value - low.value) / (step.value) > 0;
					willExecute = good && step.value != 0;
				}
			}
			if (willExecute) {
				return vs;
			} else {
				vs = merge(was, vs);
				return vs;
			}
		} else if (tree.type === "CallStatement") {
			return search(tree.expression, vs);
		} else if (tree.type === "CallExpression" || tree.type === "TableCallExpression") {
			vs = search(tree.base, vs);
			vs = search(tree.arguments, vs); // careful: for TableCallExpression it's NOT an array
			return vs;
		} else if (tree.type === "StringCallExpression") {
			vs = search(tree.argument, vs);
			return vs;
		} else if (tree.type === "Identifier" || tree.type === "VarargLiteral") {
			var homes = get(vs, tree.name || "...");
			if (!homes) {
				// TODO: move clobber logic into here.
				//info("Unknown variable <code>" + tree.name + "</code>", "", tree);
			} else {
				for (var i = 0; i < homes.length; i++) {
					homes[i].reads = homes[i].reads || [];
					homes[i].reads.push(tree);
				}
			}
			return vs;
		} else if (tree.type === "FunctionDeclaration") {
			if (tree.identifier) {
				if (tree.identifier.type === "Identifier") {
					set(vs, tree.identifier.name, [tree.identifier], !tree.isLocal);
				} else {
					writeProperty(tree.identifier, vs);
					return vs;
				}
			}
			vs.push({});
			for (var i = 0; i < tree.parameters.length; i++) {
				set(vs, tree.parameters[i].name || "...", [tree.parameters[i]]);
			}
			vs = search(tree.body, vs);
			vs.pop();
			return vs;
		} else if (tree.type === "ReturnStatement") {
			return search(tree.arguments, vs);
		} else if (tree.type === "BreakStatement") {
			return vs;
		} else if (tree.type === "BinaryExpression" || tree.type === "LogicalExpression") {
			vs = search(tree.left, vs)
			vs = search(tree.right, vs);
			return vs;
		} else if (tree.type === "UnaryExpression") {
			return search(tree.argument, vs);
		} else if (tree.type === "IfStatement") {
			// Merge the result of all clauses, and before if there is no else.
			var lastClause = tree.clauses.peek();
			var before = copyVs(vs);
			var afters = [];
			for (var i = 0; i < tree.clauses.length; i++) {
				var a = search(tree.clauses[i], before);
				afters.push(a);
			}
			if (lastClause.type === "ElseClause") {
				// Throw out original scope.
				var n = afters[0];
			} else {
				// It's possible for no case to happen.
				var n = before;
			}
			for (var i = 0; i < afters.length; i++) {
				n = merge(afters[i], n);
			}
			return n;
		} else if (tree.type === "IfClause" || tree.type === "ElseifClause") {
			vs = search(tree.condition, vs);
			vs.push({});
			vs = search(tree.body, vs);
			vs.pop();
			return vs;
		} else if (tree.type === "ElseClause") {
			vs.push({});
			vs = search(tree.body, vs);
			vs.pop();
			return vs;
		} else if (tree.type === "MemberExpression") {
			// TODO: mark indirect use
			return search(tree.base, vs);
		} else if (tree.type === "IndexExpression") {
			// TODO: mark indirect use
			vs = search(tree.base, vs);
			vs = search(tree.index, vs);
			var base = tree.base;
			var index = tree.index;
			if (base.type === "Identifier" && index.type === "Identifier") {
				// Check that t[i] isn't being done in a for loop
				var vb = get(base.name);
				var vi = get(index.name);
				if (vb && vi && vb.length > 0 && vi.length > 0) {
					if (vi[0].parent === vb[0].parent.parent && vi[0].parent.type === "ForGenericStatement") {
						if (vb[0].parent.type === "CallExpression" && vb[0].parent.base.name === "pairs" || vb[0].parent.base.name === "ipairs") {
							// COMPLAIN!
							// TODO fix this
							error("bad", "bad", tree);
						}
					}
				}
			}
			return vs;
		} else if (tree.type === "TableConstructorExpression") {
			return search(tree.fields, vs);
		} else if (tree.type === "TableValue") {
			return search(tree.value, vs);
		} else if (tree.type === "TableKeyString") {
			return search(tree.value, vs);
		} else if (tree.type === "TableKey") {
			vs = search(tree.key, vs);
			return search(tree.value, vs);
		} else {
			throw "Unknown search type " + tree.type;
		}
	}
	// Main:
	search(parse.body, [{}, {}]);
	for (var i = 0; i < sources.length; i++) {
		var reads = sources[i].reads.length;
		var writes = sources[i].writes.length;
		if (reads == 0 && sources[i].name != "_") {
			if (writes == 0) {
				error("This assignment to <code>" + sources[i].name + "</code> is not used", "", sources[i]);
			} else {
				var addendum = "";
				if (USE_ROBLOX) {
					addendum = "If this is an object and you set the <code>.Parent</code>, everything is fine!";
				}
				warn("This assignment to <code>" + sources[i].name + "</code> is only written to", "Did you forget to use it fully?" + addendum, sources[i]);
			}
		}
		if (reads > 0 && sources[i].name.replace(/_/g,"").length === 0) {
			error("Variables named <code>_</code> should not be read", "This variable name is reserved to mean the variable is unnecessary.", sources[i]);
		}
	}
}
