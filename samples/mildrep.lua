local box = script.Parent.Parent.CodeBox
local plr = script.Parent.Parent.Parent.Parent
local redeemed = false

box.FocusLost:connect(function()
    if box.Text == "Points" and redeemed == false then
        redeemed = true
        box.Text = "Code Accepted!"
        plr.leaderstats.Points.Value = plr.leaderstats.Points.Value + 50
        wait(1)
        box.Text = "Redeem Code"
    elseif redeemed == true then
        box.Text = "Already Redeemed!"
        wait(1)
        box.Text = "Redeem Code"
    else
        box.Text = "Code Declined!"
        wait(1) 
        box.Text = "Redeem Code"
    end
end)
