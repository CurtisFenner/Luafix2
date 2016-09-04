{
	"use strict";

	let lphelp = require("./lphelp.js");

	function magicStage(parse, options) {
		lphelp.recurse(parse, magicFinder, false, false, {});
	}

	function magicFinder(tree, sofar) {
		var okay = ["1", "2", "0", "3", "4", "-1", "-2", "0.5", "10", "", ".5"];
		var care;
		if (tree.type === "NumericLiteral" || tree.type === "StringLiteral") {
			care = tree.raw;
		}
		if (care) {
			sofar[care] = (sofar[care] || 0) + 1;
			if (sofar[care] === 2) {
				// Appears twice
				var good = false;
				for (var i = 0; i < okay.length; i++) {
					if (okay[i] == care) {
						good = true;
					}
				}
				if (!good) {
					var saves = "";
					var savings = (care.length - 10);
					savings = (savings / 5) + 0.5 << 0;
					savings *= 5;
					if (savings > 0) {
						saves = " <strong>This also saves around " + savings +
							" characters!</strong>";
					}
					if (saves) {
						warn("Use of magic value <code>" + care + "</code> more than once.",
							"Consider defining a variable <code>CONSTANT = " + care
							+ "</code> and using it instead, in case the value changes, and to explain where the value comes from."
							+ saves,
							tree);
					}
				}
			}
		}
	}

	module.exports.lint = magicStage;
}