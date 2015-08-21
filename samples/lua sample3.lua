local fuelFull = true
local started = false

function fuel()
        if fuelFull == true and started == false then
            deplete()
            print 'STARTING DEPLETING'
        elseif fuelFull == false then
            print 'EMPTY'
        end
end


function deplete()
    started = true
    print 'DEPLETING'
    while true do
    script.Parent.FuelValue.Value = script.Parent.FuelValue.Value -1
    wait (.1)
    if script.Parent.FuelValue.Value <15 and script.Parent.FuelValue.Value >0 then
        print 'LOW FUEL'
    elseif script.Parent.FuelValue.Value >15 and script.Parent.FuelValue.Value >0 then
        print 'SAFE'
    elseif script.Parent.FuelValue.Value <15 and script.Parent.FuelValue.Value >-1 then
        print 'EMPTY'
        fuelFull = false
        started = false
    end
    end
end

script.Parent.Touched:connect(fuel) 


