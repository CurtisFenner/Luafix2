workspace.Joe.Head.Dialog.DialogChoiceSelected:connect(function(player,choice)
       if choice.Name == "Silencer" then
        for _,Player in pairs(game.Players.player.Name) do
        if Player:FindFirstChild("leaderstats") then
            if Player.leaderstats.Money.Value >= 130 and player.Backpack:FindFirstChild("M4A4") then
            player.Backpack.M4A4:Destroy()  
            Player.leaderstats.Money.Value = Player.leaderstats.Money.Value -130
            game.Lighting.SilencedM4A4:Clone().Parent = player.Backpack
            else
                if player.Backpack:FindFirstChild("M4A4") == nil then
                    choice.ResponseDialog = "Sorry, you don't have a glock"
                    end
                end 
        else
            if Player.leaderstats.Money.Value < 130 then
                choice.ResponseDialog = "Sorry, you don't have enough money!"
end
        end
    end
    end
end)

