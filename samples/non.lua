function non(f, ...)
	local c; c = coroutine.wrap(function(...)
		coroutine.yield(c)
		local now, target = {}, {}
		local function fork()
			now[#now+1] = target[#now+1] or false
			return now[#now]
		end
		repeat
			coroutine.yield(f(fork, ...))
			now, target =  {}, now
			for i = #target, 0, -1 do
				target[i] = not target[i]
				if target[i] then
					break
				end
			end
		until target[0]
	end)
	return c(...)
end

--------------------------------------------------------------------------------

function four(fork)
	return {fork(), fork(), fork(), fork()}
end

for n in non(four) do
	print(unpack(n))
end
