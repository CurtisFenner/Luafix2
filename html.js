// for condensing repeated errors
var messageCache = {};

function clear() {
	messageCache = {};
	document.getElementById("report").innerHTML = "";
	document.getElementById("post").innerHTML = "";
}

function showInput(parse) {
	document.getElementById("post").innerHTML = show(parse);
}

function writeLine(strong, message, type) {
	var serial = strong + ">>" + message + ">>" + type;
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

////////////////////////////////////////////////////////////////////////////////
document.getElementById("checkbutton").onclick = function() {
	luafix2(document.getElementById("source").value);
}
