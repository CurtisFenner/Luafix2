Permission = {"PLAYER","PLAYER","PLAYER"} -- Players who can run/stop the maps.
RunText = "r2/" -- Text the Players have to say to run the maps. (MAP NAME AFTER)
StopText = "cl2/" -- Text the Players have to say to stop the maps. (MAP NAME AFTER)

game.Players.ChildAdded:connect(function(Player)
    Player.Chatted:connect(function(Chat)
        for i = 1, #Permission do
            if Player.Name == Permission[i] then
                if Chat:lower():sub(1,RunText:len()) == RunText then
                    Map = game.ServerStorage:FindFirstChild(Chat.sub(Chat,1+RunText:len()))
                    if Map ~= nil then
                        for i,v in pairs(game.ServerStorage:GetChildren()) do
                            if v:IsA("Model") then
                                if game.Workspace:FindFirstChild(v.Name) then
                                    game.Workspace:FindFirstChild(v.Name):remove()
                                end
                            end
                        end
                        Map:Clone().Parent = game.Workspace
                    end
                end
                if Chat:lower():sub(1,StopText:len()) == StopText then
                    Map = game.ServerStorage:FindFirstChild(Chat.sub(Chat,1+StopText:len()))
                    if Map ~= nil then
                        Clone = game.Workspace:FindFirstChild(Chat.sub(Chat,1+StopText:len()))
                        if Clone ~= nil then
                            Clone:remove()
                        end
                    end
                end
            end
        end
    end)
end)