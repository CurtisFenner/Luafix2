Admins = {36491121,32441993,37983438}
id = 232590627
debounce = true
script.Parent.touched:connect(function(character)
    if debounce then
        debounce = false
        local Player = game.Players:FindFirstChild(character.Parent.Name)
        local leaderstats = Player:FindFirstChild("leaderstats")
        local Cash = leaderstats:FindFirstChild("Cash")
        if Player and leaderstats and Cash then
            Cash.Value = Cash.Value + 10
            for i,v in pairs (Admins) do
                if Player.userId == Admins[i] or Player.Name:sub(1,6) == "Player" or game:GetService("GamePassService"):PlayerHasPass(Player,id) then
                    Cash.Value = Cash.Value + 10
                    break
                end
            end
        end
    end
    wait(5)
    debounce = true
end)
