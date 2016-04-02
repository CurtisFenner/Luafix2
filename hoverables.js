document.onmousemove = function(e){
	var cursorX = e.pageX;
	var cursorY = e.pageY;
	var list = document.getElementById("hoverables");
	list.style.left = (cursorX - 20) + "px";
	list.style.top = (cursorY + 20) + "px";
}

window.onmouseover=function(e) {
	var problems = [];
	var e = e.target;
	while (e && e.getAttribute) {
		if (e.getAttribute("data-problem-key")) {
			problems = problems.concat(HoverProblems[e.getAttribute("data-problem-key") << 0]);
		}
		e = e.parentNode;
	}
	var list = document.getElementById("hoverables");
	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}
	for (var i = 0; i < problems.length; i++) {
		var line = document.createElement("div");
		line.innerHTML = problems[i].title;
		var map = {
			info: "pblue",
			warning: "pyellow",
			error: "pred",
			implementation: "ppurple",
		};
		line.className = map[problems[i].type];
		list.appendChild(line);
		list.appendChild(document.createElement("br"));
	}

};