function nums()
	return 1, 2, 3, 4, 5, 6, 7, 8, 9, 10;
end

function nils()
	return 0, -1;--nil, nil, 0, nil;
end

local t = {nums(), nils()};
for i = 1, 10 do
	print(i, t[i]);
end