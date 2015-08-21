if game.Workspace.AllShot.Value == true then
    print("got to the allshot value")
    hdd.Text = "All the Escapers were shot!"
    wait(3)
    hdd.Text = ""
for i,v in pairs(game.Players:GetPlayers()) do
if v:findFirstChild("leaderstats") and v.TeamColor == BrickColor.new("Bright blue") then
v.leaderstats["Coins"].Value = v.leaderstats["Coins"].Value + 100
end
end
elseif game.Workspace.AllEscaped.Value == true then
    hdd.Text = "All the Escapers escaped!"
    wait(3)
    hdd.Text = ""
    for i,v in pairs(game.Players:GetPlayers()) do
if v:findFirstChild("leaderstats") and v.TeamColor == BrickColor.new("Bright green") then
v.leaderstats["Coins"].Value = v.leaderstats["Coins"].Value + 40
end
end
elseif game.Workspace.SomeEscapedSomeDied.Value == true then
    hdd.Text = "Some Escapers got shot, while others Escaped!"
    wait(3)
    hdd.Text = ""
    for i,v in pairs(game.Players:GetPlayers()) do
if v:findFirstChild("leaderstats") and v.TeamColor == BrickColor.new("Bright green") then
v.leaderstats["Coins"].Value = v.leaderstats["Coins"].Value + 40
if v:findFirstChild("leaderstats") and v.TeamColor == BrickColor.new("Bright green") then
v.leaderstats["Coins"].Value = v.leaderstats["Coins"].Value + 80

elseif game.Workspace.NothingHappened.Value == true then
print("Got to the elseif statement of nothing happened")
    hdd.Text = "No one Escaped..and no one was shot! What did you guys do? :D"
wait(3)
hdd.Text = ""
end
end
end
end
