----------------
--DJwaffle2005--
----------------

materials = {"Plastic","Ice","Grass","Metal","Cobblestone"}--Table of materials

while true do
    print("A new planet has been born!")
    local table1 = {"Sci","Me","Eh","Reh","Sod","Elr","Ken"} --Name table1
    local table2 = {"ion","ios","eio","aji","aran","iodi"} --Name table2
    local table3 = {"ia","ji","i","ani","ej","si"} --Name table3
    local materialNumber = math.random(1,#materials) --Generates a number between 1 through how many materials there are in the table.
    local n1 = math.random(1,#table1) --Picks a number 1 through how many things are in table 1
    local n2 = math.random(1,#table2) --Same thing but table 2
    local n3 = math.random(1,#table3) --Same thing again but table 3
    local planet = Instance.new("Model")
    planet.Parent = game.Workspace
    planet.Name = "Planet_"..table1[n1]..table2[n2]..table3[n3] --Generates a name for planet.
    local ground = Instance.new("Part")
    ground.Material = materials[materialNumber]
    ground.Parent = planet
    ground.Size = Vector3.new(330, 1, 330)
    local rY = math.random(-500,5000)
    local rX = math.random(-300,3000)
    local rZ = math.random(-300,3000)
    ground.Position = Vector3.new(rX,rY,rZ)
    ground.Anchored = true
    ground.BrickColor = BrickColor.Random()
    ground.Name = "GroundOf"..table1[n1]..table2[n2]..table3[n3]
    local sphere = Instance.new("Part")
    local mesh = Instance.new("SpecialMesh",sphere)
    mesh.MeshType = "Sphere"
    mesh.Scale = Vector3.new(300, 300, 300)
    sphere.Parent = planet
    sphere.Size = Vector3.new(2,2,2)
    sphere.BrickColor = ground.BrickColor
    local x = ground.Position.X
    local y = ground.Position.Y
    local z = ground.Position.Z
    sphere.Position = Vector3.new(x,y+1.5,z)
    sphere.Anchored = true
    sphere.CanCollide = false
    local atmosphere = Instance.new("Part")
    atmosphere.Parent = planet
    atmosphere.BrickColor = ground.BrickColor
    atmosphere.Position = Vector3.new(x,y+3.5,z)
    atmosphere.Anchored = true
    atmosphere.CanCollide = false
    atmosphere.Transparency = 0.5
    atmosphere.Size = Vector3.new(2,2,2)
    local mesh1 = Instance.new("SpecialMesh",atmosphere)
    mesh1.Scale = Vector3.new(330, 330, 330)
    mesh1.MeshType = "Sphere"
    local hasRings = {true,false}
    local yes = math.random(1,#hasRings)
    for i = 1,30 do --Generates food
        local foodTypes = {"http://www.roblox.com/asset/?id=16940906","http://www.roblox.com/asset/?id=16190555"}
        local randomX = math.random(-x+164,x+164) --Problem
        local randomZ = math.random(-z+164,z+164)--Problem
        local food = Instance.new("Part",planet)
        local meshNumber = math.random(1,#foodTypes)
        food.Anchored = true
        food.Size = Vector3.new(2, 3, 2)
        food.Position = Vector3.new(randomX,y-1,randomZ)
        food.BrickColor = BrickColor.Random()
        local mesh = Instance.new("SpecialMesh",food)
        mesh.MeshId = foodTypes[meshNumber]
        mesh.Scale = Vector3.new(2, 2, 2)
        food.Touched:connect(function(hit)
            local player = game.Players:GetPlayerFromCharacter(hit.Parent)
            if player then
                local findHunger = player.PlayerGui:FindFirstChild("Hunger")
                if findHunger then
                    findHunger.Frame.HungerBar.Hunger.Value = findHunger.Frame.HungerBar.Hunger.Value + 50
                end
            end
        end)
    end
    if yes == 1 then
        local ring = Instance.new("Part",planet)
        ring.Size = Vector3.new(2,2,2)
        ring.Position = Vector3.new(x,y+6.5,z)
        ring.BrickColor = ground.BrickColor
        ring.Transparency = 0.5
        ring.Anchored = true
        ring.CanCollide = false
        local mesh2 = Instance.new("SpecialMesh",ring)
        mesh2.MeshId = "http://www.roblox.com/asset/?id=3270017"
        mesh2.Scale = Vector3.new(1000, 1000, 400)
    end
    wait(20)
end
