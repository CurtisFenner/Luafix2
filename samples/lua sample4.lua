oExists = function(thing)
local success,msg = pcall(function() return thing ~= nil end)
if success then
    return true
end
return false
end
print(oExists(workspace["Baseplate"]) and "yes" or "no")
