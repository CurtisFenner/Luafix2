{
	"use strict";

	function HTMLShower() {
		this.x = 5;
	}
	HTMLShower.prototype.show = function(parse) {
		return parse + "";
	}

	module.exports.HTMLShower = HTMLShower;
}
