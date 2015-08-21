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


function assert(b, m) {
	if (!b) {
		throw m;
	}
}

// Compute the edit distance between the two given strings
// (Source: https://gist.github.com/andrei-m/982927 under MIT license)
function getEditDistance(a, b) {
	if(a.length === 0) return b.length; 
	if(b.length === 0) return a.length; 
	var matrix = [];
	// increment along the first column of each row
	var i;
	for(i = 0; i <= b.length; i++){
		matrix[i] = [i];
	}
	// increment each column in the first row
	var j;
	for(j = 0; j <= a.length; j++){
		matrix[0][j] = j;
	}
	// Fill in the rest of the matrix
	for(i = 1; i <= b.length; i++){
		for(j = 1; j <= a.length; j++){
			if(b.charAt(i-1) == a.charAt(j-1)){
				matrix[i][j] = matrix[i-1][j-1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i-1][j-1] + 1, // substitution
					Math.min(matrix[i][j-1] + 1, // insertion
					matrix[i-1][j] + 1)); // deletion
			}
		}
	}
	return matrix[b.length][a.length];
};

String.prototype.distance = function(other) {
	return getEditDistance(this, other);
}

String.prototype.closest = function(others) {
	var g = this;
	return others.sort(function(a, b) {
		return g.distance(a) - g.distance(b);
	});
}

function wrappedList(list, pre, post, conj) {
	if (list.length === 0) {
		return "(no options)";
	}
	if (list.length === 1) {
		return pre + list[0] + post;
	} else {
		var initial = list.slice(0, list.length - 1);
		var last = list.peek();
		return pre + initial.join(post + ", " + pre) + post + ", " +
			conj + " " + pre + last + post;
	}
}

