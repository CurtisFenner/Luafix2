local TOOL = script.Parent
local NAME = TOOL.Name
local DEEDS = game.Lighting.Buildings
local DEED = DEEDS:findFirstChild(NAME)


if DEED == nil then
    print("DERP!!!")
    TOOL:remove()
end

DEED = DEED:clone()

function get_pc()
    local player = TOOL.Parent.Parent
    local char = player.Character

    return player, char
end

function get_all_parts(list, model)
    local children = model:GetChildren()

    for index, child in pairs(children) do
        if child:IsA("BasePart") then
            table.insert(list, child)
        end

        get_all_parts(list, child)
    end
end

function get_center(model)
    local list = {}
    get_all_parts(list, model)

    local num = 0
    local pos = Vector3.new(0, 0, 0)

    for index, child in pairs(list) do
        pos = pos + child.Position
    end

    return pos / num
end

function get_example_from_model(model)
    model = model:clone()

    do_trans(model)

    model.Name = "EXAMPLE"

    return model
end

function doRefToPlayer(deed)
    local player, char = get_pc()
    local deeds = player.Buildings

    local ref = Instance.new("ObjectValue")
    ref.Name = deed.Name
    ref.Value = deed
    ref.Parent = deeds
end

function do_trans(object)
    local children = object:GetChildren()

    for index, child in pairs(children) do
        if child:IsA("BasePart") then
            child.Transparency = 0.5
            child.Anchored = true
        elseif child:IsA("Model") then
            do_trans(child)
        else
            child:remove()
        end
    end
end

function do_rotate(objects, center, new, recurse)
    for _,object in pairs(objects) do
        if object:IsA("BasePart") then
            object.CFrame = new:toWorldSpace(center:toObjectSpace(object.CFrame))
        end

        if recurse then
            do_rotate(object:GetChildren(), center, new, true)
        end
    end
end

function do_remove_old_example()
    local player, char = get_pc()
    local children = char:GetChildren()

    for index, child in pairs(children) do
        if child.Name == "EXAMPLE" then
            child:remove()
        end
    end
end

function do_remove_tool()
    TOOL:remove()
end

function on_mouse_move(mouse)
    local pos = mouse.hit.p
    local player, char = get_pc()

    do_remove_old_example()

    if pos ~= nil then
        local example = get_example_from_model(DEED)
        example.Parent = char
        example:MoveTo(pos)
    end
end

function on_mouse_down(mouse)
    do_remove_old_example()

    local pos = mouse.hit.p

    if pos ~= nil then
        DEED.Parent = game.Workspace
        DEED:MoveTo(pos)
        DEED:MakeJoints()

        doRefToPlayer(DEED)
        do_remove_tool()-- This seems to be the problem, where I move this determines 
        --what is wrong with the script. in this place, it removes the tool at the correct time, but it 
        --messes up the rest of the script and it doesn't remove the horse from the workspace like it
        --is supposed to. when i had it in the place that says --here, it would correctly remove
        --the horse, but it wouldn't remove the tool unless there was a horse in range, which is wrong.
        local htool = game.Lighting.Tools.Horse

        local function in_Range(part1,part2,range)

    if (part1.Position - part2.Position).magnitude <= range then

        return true



    end

    return false



end


debounce = false



while wait(0.5) do


    if in_Range(game.Workspace.Corral.gate,game.Workspace.Horse.Torso,30) == true then

        if debounce == false then debounce = true

            game.Workspace.Horse:Destroy()
            htool:Clone() .Parent = TOOL.Parent

            wait(3)


        debounce = false end
 --Here
    end

end


    end
end

function on_key_down(key, mouse)
    if key == "r" then
        local list = {}
        get_all_parts(list, DEED)
        local center = DEED:GetModelCFrame()
        local rotated = center * CFrame.Angles(0, math.pi / 2, 0)

        do_rotate(list, center, rotated, false)
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
    do_remove_old_example()
end

TOOL.Selected:connect(on_selected)
TOOL.Deselected:connect(on_deselected)