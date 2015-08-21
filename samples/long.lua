local TOOL = script.Parent
local NAME = TOOL.Name
-- Use ReplicatedStorage
local DEEDS = game.Lighting.Buildings
local DEED = DEEDS:findFirstChild(NAME)

assert(DEED, "DEED did not exist)")

DEED = DEED:clone()

local player = TOOL.Parent.Parent
-- or game.Players.LocalPlayer from a LocalScript
local character = player.Character or player.CharacterAdded:wait()

function get_all_parts(model, list)
	list = list or {}
	for _, child in pairs(model:GetChildren()) do
		if child:IsA("BasePart") then
			table.insert(list, child)
		end
		get_all_parts(child, list)
	end
	return list
end

function get_example_from_model(model)
	model = model:clone()
	setTransparency(model, 0.5)
	model.Name = "EXAMPLE"
	return model
end

function doRefToPlayer(deed)
	local deeds = player.Buildings

	local ref = Instance.new("ObjectValue")
	ref.Name = deed.Name
	ref.Value = deed
	ref.Parent = deeds
end

function setTransparency(model, transparency)
	for _, part in pairs( get_all_parts(model) ) do
		part.Transparency = transparency
	end
end

function rotate(objects, center, new, recurse)
	for _, object in pairs(objects) do
		if object:IsA("BasePart") then
			object.CFrame = new:toWorldSpace(center:toObjectSpace(object.CFrame))
		end

		if recurse then
			rotate(object:GetChildren(), center, new, true)
		end
	end
end

function remove_old_example()
	if char:FindFirstChild("EXAMPLE") then
		char.EXAMPLE:Destroy()
	end
end

function remove_tool()
	TOOL:remove()
end

function on_mouse_move(mouse)
	local pos = mouse.Hit.p

	remove_old_example()

	local example = get_example_from_model(DEED)
	example.Parent = char
	example:MoveTo(pos)
end

function inRange(part1, part2, range)
	return (part1.Position - part2.Position).magnitude <= range
end

function on_mouse_down(mouse)
	remove_old_example()

	local pos = mouse.Hit.p

	DEED.Parent = workspace
	DEED:MoveTo(pos)
	DEED:MakeJoints()

	doRefToPlayer(DEED)
end

function on_key_down(key, mouse)
	if key == "r" then
		local list = get_all_parts(DEED)
		local center = DEED:GetModelCFrame()
		local rotated = center * CFrame.Angles(0, math.pi / 2, 0)

		rotate(list, center, rotated, false)
		on_mouse_move(mouse)
	end
end

function on_selected(mouse)
	mouse.Move:connect(function()
		on_mouse_move(mouse)
	end)

	mouse.Button1Down:connect(function()
		on_mouse_down(mouse)
	end)

	mouse.KeyDown:connect(function(key)
		on_key_down(key, mouse)
	end)
end

function on_deselected()
	dremove_old_example()
end

TOOL.Selected:connect(on_selected)
TOOL.Deselected:connect(on_deselected)

-- Use ReplicatedStorage
local htool = game.Lighting.Tools.Horse

while wait(0.5) do
	if DEED.Parent and inRange(workspace.Corral.gate, workspace.Horse.Torso, 30) then
		workspace.Horse:Destroy()
		htool:Clone().Parent = TOOL.Parent
		remove_tool()
	end
end