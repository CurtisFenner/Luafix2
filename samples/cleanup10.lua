AddCommand(0,"Print","Print","P",":Print I like tacos --> [M.A.C.] I like tacos",function(Speaker,Msg)
	_G.Print(Speaker..' : '..Msg)
end) -- ^^^^ This will insert into _G.Commands.


function CheckChat(plr,msg)
	for _, v in pairs(_G.Commands) do
		local Cmd = v.Cmd:lower()
		local Cmd2 = v.Cmd2:lower()
		local start = 1
		if msg:sub(1, 2) == "/e" then 
			start = 3
		else 
			start = 1 
		end

		local mid, front = Settings.MiddlePrefix, Settings.FrontPrefix;
		Cmd = front .. Cmd
		Cmd2 = front .. Cmd2

		-- This doesn't make sense:
		local partOfMsg = msg:sub(start, #( (Cmd .. mid or Cmd ) or (Cmd2 .. mid or Cmd2) ))
		-- Neither does this:
		local commandCheck = (Cmd .. mid or Cmd) or (Cmd2 .. mid or Cmd2)

		if partOfMsg == commandCheck then
			print('got bypass msg:sub')
			if _G.GetRank(plr) <= v.Rank then
				print('got by getrank')

				-- This doesn't make sense:
				local before = (Cmd .. mid or Cmd) 
					or (Cmd2 .. mid or Cmd2) 
					or ((Cmd .. mid or Cmd) 
					or (Cmd2 .. mid or Cmd2))

				msg = msg:sub(#before + 1)
				local r, e = ypcall(function()
					v.Func(plr, msg)
				end)
				if not r then _G.Error(e) end
			else
				--You cant acess this command!
			end
		else
			--Sorry command was not found!
		end
	end
end
