// TODO: adjust lprecurse to have an OPTION to find member expression rights, keys in tables
function getContext(name) {
	var from = {};
	from.variables = "variable";
	from.arguments = "variable";
	from.left = "variable";
	from.right = "variable";
	from.base = "variable";
	from.argument = "variable";
	from.value = "variable";
	//
	if (from[name.property]) {
		return from[name.property];
	}
	return "variable";
}

function camelCase(name) {
	return !!name.match(/^_*[a-z0-9]+([A-Z][0-9]*[a-z]*[0-9]*)*$/);
}
function PascalCase(name) {
	return !!name.match(/^([A-Z][0-9]*[a-z]*[0-9]*)*$/) || !!name.match(/^_+[a-z]*([A-Z][0-9]*[a-z]*[0-9]*)*$/) ;
}
function snake_case(name) {
	return !!name.match(/^_*[a-z0-9]+(_[a-z0-9]+)*$/);
}

var nameCheck = {}
nameCheck.variable = function(name) {
	return camelCase(name);
}

function processIdentifier(iden) {
	var context = getContext(iden);
	var good = nameCheck[context](iden.name);
	if (!good) {
		//warn("Variable name <code>" + iden.name + "</code> doesn't match style", "", iden);
	}
}

function nameStage(parse) {
	lprecurse(parse, function(tree) {
		if (tree.type === "Identifier") {
			processIdentifier(tree);
		}
	})
}
