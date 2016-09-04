Array.prototype.contains = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] === obj) {
			return true;
		}
	}
	return false;
}

Array.prototype.peek = function() {
	return this[this.length - 1];
}

String.prototype.count = function(reg) {
	return (this.match(reg) || []).length;
}

String.prototype.distance = function(other) {
	return getEditDistance(this, other);
}

String.prototype.closest = function(others) {
	var g = this;
	return others.sort(function(a, b) {
		return g.distance(a) - g.distance(b);
	});
}

