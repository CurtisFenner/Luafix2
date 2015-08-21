AddCommand(0,"Print","Print","P",":Print I like tacos --> [M.A.C.] I like tacos",function(Speaker,Msg)
    _G.Print(Speaker..' : '..Msg)
end) -- ^^^^ This will insert into _G.Commands.


CheckChat=function(plr,msg)
    table.foreach(_G.Commands,function(i,v)
        local Cmd=v.Cmd:lower()
        local Cmd2=v.Cmd2:lower()
        local SubCount=1
        if msg:sub(1,2):find('/e') then 
            SubCount=3
        else 
            SubCount=1 
        end

        if msg:sub(SubCount,#( (Settings.FrontPrefix..(Cmd)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd)) 
        or (Settings.FrontPrefix..(Cmd2)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd2)) )) 
        ==
        ((Settings.FrontPrefix..(Cmd)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd)) 
        or (Settings.FrontPrefix..(Cmd2)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd2)) ) then
        print'got bypass msg:sub'
            if (_G.GetRank(plr) <= v.Rank) then
                print'got by getrank'
                msg=msg:sub(#((Settings.FrontPrefix..(Cmd)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd)) 
                or (Settings.FrontPrefix..(Cmd2)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd2)) 
                or ((Settings.FrontPrefix..(Cmd)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd)) 
                or (Settings.FrontPrefix..(Cmd2)..Settings.MiddlePrefix or Settings.FrontPrefix..(Cmd2))) )+1)
                local r,e=ypcall(function()
                    v.Func(plr,msg)
                end)
                if not r then _G.Error(e) end
            else
                --You cant acess this command!
            end
        else
            --Sorry command was not found!
        end
    end)
end
