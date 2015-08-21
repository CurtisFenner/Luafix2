local m = {
	__add = function(a, b)
		print(a, "+", b);
	end
};

local u = {};
local v = {};
local x = {};

setmetatable(u, m);
setmetatable(x, m);

print("u", u);
print("v", v);
print("x", x);

function e()
end

e(u + v);
e(v + u);
e(u + 1);
e(1 + u);
e(u + u);
e(x + u);