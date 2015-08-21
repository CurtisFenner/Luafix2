while wait() do
	if game.Workspace.Text1Ready.Value == true then
		script.Parent.Text1.Visible = true
		for i = 1, string.len("Commander: Hello Soldier, are you ready?") do
			wait(0.1)
			script.Parent.Text1.Text = string.sub("Commander: Hello Soldier, are you ready?", 1, i)
		end
		game.Workspace.Talking.Value = false
		script.Parent.Text2.Visible = true
		script.Parent.Text2.Text = "CLICK ANYWHERE TO CONTINUE"     
		script.Parent.DarkScreen.Visible = true
		game.Workspace.Typewrite:Stop()
		game.Workspace.Text1Ready.Value = false
		script.Parent.DarkScreen.MouseButton1Down:connect(function()
			game.Workspace.Text2Ready.Value = true
			script.Parent.Text2.Visible = false
			end)
	end
	if game.Workspace.Text2Ready.Value == true then
		game.Workspace.Typewrite:Play()
		script.Parent.DarkScreen.Visible = false
		for i= 1, string.len("Commander: Because if not, we can take you back to where you came from.") do
			wait(0.1)
			script.Parent.Text1.Text = string.sub("Commander: Because if not, we can take you back to where you came from.", 1, i)
		end
		wait(4) 
		for i= 1, string.len("Commander: If you want to go weewee in your big boy slacks, now's the time.") do
			wait(0.1)
		script.Parent.Text1.Text = string.sub("Commander: If you want to go weewee in your big boy slacks, now's the time.", 1, i) -- Stops at 'C' in commander.
		wait(4)
		game.Workspace.Text1Ready.Value = false
		game.Workspace.Loading1.Value = true
		game.Workspace.Talking.Value = false
		for i,v in pairs(game.Workspace:GetChildren()) do
			if v:IsA("Sound") then
				v:Stop()
			end
		end
	end
	script.Parent.Text1.Visible = false
	script.Parent.Text2.Visible = false 
end
end
