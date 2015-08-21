function GetDescendants(ancestor)
local descendants = {}

local function recursiveGetChildren(object)
pcall(function()
if #object:GetChildren() == 0 then return end
for i,v in pairs(object:GetChildren()) do
descendants[#descendants+1] = v
recursiveGetChildren(v)
end
end)
end

recursiveGetChildren(ancestor)

return descendants
end


for i,v in pairs(GetDescendants(game)) do


function findInteract(part)
    if (part ~= nil) then
        if (part:IsA("BasePart")) then
            if (part:findFirstChild("Interaction")) then
                local Interaction = part.Interaction
                if (Interaction:IsA("StringValue")) then
                    return Interaction;
                end
            elseif (part.Parent:findFirstChild("Interaction")) then
                local Interaction = part.Parent.Interaction
                if (Interaction:IsA("StringValue")) then
                    return Interaction;
                end
            end
        else
            return nil;
        end
    end
end

end

--Run Interaction


function RunInteraction()

function GetGui()
    local InteractGui = game.ReplicatedStorage.InteractionGui
end

local Gui = GetGui() -- incase the name changed
local InteractPart = GetDescendants(ancestor) --Get the part that is a parent of the StringValue
Gui.Name = script.Parent.Parent.Name .. "InteractGui"
script.Parent.Parent.Changed:connect(function() GetGui().Name = script.Parent.Parent.Name .. "InteractGui" end)
while true do wait(.1)
    for i, v in pairs(game.Players:GetChildren()) do
        if v.Character ~= nil then
            if v.Character:FindFirstChild("Torso") ~= nil and (InteractPart - v.Character.Torso.Position).magnitude <= 3 and v.PlayerGui:FindFirstChild(Gui.Name) == nil then
                Gui:Clone().Parent = v.PlayerGui
            elseif v.Character:FindFirstChild("Torso") ~= nil and (InteractPart - v.Character.Torso.Position).magnitude > 3 then
                if v.PlayerGui:FindFirstChild(Gui.Name) then v.PlayerGui[Gui.Name]:Remove() end
            end
        end
    end
end 
end
