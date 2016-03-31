local Defplayers = {}
local Raidplayers = {}
local numDefplayers
local numRaidplayers

local function FixGuiSize()
    for i, v in pairs(script.Parent["Capture GUI"]:GetChildren()) do
        if v.Name:find'Capture' then
            v.Size = UDim2.new(0, 0, 1, 0)
        end
    end
end

coroutine.resume(coroutine.create(function()
    while wait() do
        Defplayers = {}
        Raidplayers = {}
        for i = 1, #game.Players:GetChildren() do
            if (game.Players:GetChildren()[i].Character.Torso.Position - script.Parent.Position).magnitude <= 10 then
                if game.Players:GetChildren()[i].TeamColor == BrickColor.new('Teal') then
                    table.insert(Defplayers, game.Players:GetChildren()[i].Name)
                elseif game.Players:GetChildren()[i].TeamColor == BrickColor.new('Bright red') then
                    table.insert(Raidplayers, game.Players:GetChildren()[i].Name)
                end
            end
        end
    end
end))

coroutine.resume(coroutine.create(function()
    while wait() do
        numDefplayers = #Defplayers
        numRaidplayers = #Raidplayers
        coroutine.resume(coroutine.create(function()
            if numDefplayers > 0 then
                local i = 1
                while i <= numDefplayers do
                    wait()
                    if (game.Players[Defplayers[i]].Character.Torso.CFrame.p - script.Parent.CFrame.p).magnitude > 10 then
                        table.remove(Defplayers[i])
                    end
                    i = i + 1
                end
            end
        end))
        coroutine.resume(coroutine.create(function()
            if numRaidplayers > 0 then
                local i = 1
                while i <= numRaidplayers do
                    wait()
                    if (game.Players[Raidplayers[i]].Character.Torso.Position - script.Parent.Position).magnitude > 10 then
                        table.remove(Raidplayers[i])
                    end
                    i = i + 1
                end
            end
        end))
    end
end))

coroutine.resume(coroutine.create(function()
    while wait() do
        if #Defplayers > 0 and #Raidplayers == 0 then
            while #Defplayers > 0 and #Raidplayers == 0 do wait()
                FixGuiSize()
                script.Parent["Capture GUI"].DefendersCapture.Size = script.Parent["Capture GUI"].DefendersCapture.Size + UDim2.new(0.1, 0, 0 ,0)
            end
        elseif #Defplayers == 0 and #Raidplayers > 0 then
            while #Defplayers == 0 and #Raidplayers > 0 do wait()
                FixGuiSize()
                script.Parent["Capture GUI"].RaidersCapture.Size = script.Parent["Capture GUI"].DefendersCapture.Size + UDim2.new(0.1, 0, 0 ,0)
            end
        end
    end
end))
