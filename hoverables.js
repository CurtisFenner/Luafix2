function ShowHoverProblems(problems) {
	var list = ClearHovers();
	for (var i = 0; i < problems.length; i++) {
		var line = document.createElement("div");
		line.innerHTML = problems[i].title;
		line.className = informationClassMap[ problems[i].type ];
		list.appendChild(line);
		list.appendChild(document.createElement("br"));
	}
}

function ClearHovers() {
	var list = document.getElementById("hoverables");
	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}
	return list;
}

var LAST_HOVER = null;

function SetupHoverable(element) {
	var n = element.getAttribute('data-id');
	var data = HoverProblems[n];
	if (data && !data.processed) {
		data.processed = true;
		element.addEventListener("mouseover", function() {
			LAST_HOVER = element;
			ShowHoverProblems(data);
		});
		element.addEventListener("mouseout", function() {
			if (LAST_HOVER === element) {
				ClearHovers();
			}
		});
	}
}

function SetupHoverables() {
	ClearHovers();
	for (var type in informationClassMap) {
		var elements = document.getElementsByClassName( informationClassMap[type] );
		for (var i = 0; i < elements.length; i++) {
			SetupHoverable(elements[i]);
		}
	}
}

document.onmousemove = function(e){
	var cursorX = e.pageX;
	var cursorY = e.pageY;
	var list = document.getElementById("hoverables");
	list.style.left = (cursorX - 20) + "px";
	list.style.top = (cursorY + 20) + "px";
};
