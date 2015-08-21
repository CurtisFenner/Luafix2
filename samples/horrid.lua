pos = Vector3.new(0,1000,0)
shop = Vector3.new(0,0,0)
gui = script.Parent.ScreenGui:Clone()

function onTouch(hit)
    if hit.Parent["VehicleSeat"]["SeatWeld"] then
        for i,v in pairs (hit.Parent:GetChildren()) do
            if v.Name == "paint" then
                gui = script.Parent.ScreenGui:Clone()
                plr = (hit.Parent.VehicleSeat.SeatWeld.Part1.Parent)
                playa = game.Players:FindFirstChild(plr.Name)
                gui.Parent = playa.PlayerGui
                hit.Parent.VehicleSeat.Disabled = true
                hit.Anchored = true
                plr.Torso.Anchored = true
                plr:MoveTo(pos)
                local cam = workspace.CurrentCamera
                cam.FieldOfView = 100
                cam.CameraSubject = hit.Parent
            end

            while wait() do
                thingy = gui.Color.ToolTip
                print (thingy)
                print (v)
                v.BrickColor = BrickColor.new(Color3.new(thingy))
            end
        end
    end
end

script.Parent.Touched:connect(onTouch)
