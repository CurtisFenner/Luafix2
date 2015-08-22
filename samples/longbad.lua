guns = {
	Test = {
		Rate = 0.15,
		Damage = 10,
		Spread = 0,
		Range = 300,
		DefArmPos = {Right=CFrame.new(.5,.8,-1.35)*CFrame.Angles(math.rad(-95),math.rad(25),math.rad(5)),Left=CFrame.new(-.8,0.1,-1.35)*CFrame.Angles(math.rad(-90),math.rad(0),math.rad(-1))},
		DefGunPos = CFrame.new(0,0,-.65),
		RotFix = CFrame.new(math.rad(80),math.rad(2),math.rad(185)),
		Clip = 50,
		Max_Ammo = 250
	},
	MSword = {
		Rate = 0.15,
		Damage = 70,
		Spread = 0,
		Range = 300,
		DefArmPos = {Right=CFrame.new(.5,.8,-1.2)*CFrame.Angles(math.rad(-95),math.rad(25),math.rad(5)),Left=CFrame.new(-.8,0.1,-1)*CFrame.Angles(math.rad(-90),math.rad(0),math.rad(-1))},
		DefGunPos = CFrame.new(-1.3,0,.32),
		RotFix = CFrame.new(math.rad(90),math.rad(0),math.rad(90)),
		Clip = 0,
		Max_Ammo = 0
	}
}

--[[Costumes
	
	0=Desert
	1=Green
	2=Snow
	3=Standard
	4=Stealth
	
--]]

fire = Instance.new("RemoteEvent",game.Workspace)
fire.Name = "_TestFireFunction"
weldArms = Instance.new("RemoteEvent",game.Workspace)
weldArms.Name = "ArmWeldFunction"
weldGun = Instance.new("RemoteEvent",game.Workspace)
weldGun.Name = "GunWeldFunction"
ADS = Instance.new("RemoteEvent",game.Workspace)
ADS.Name = "servADSFunc"
ADSu = Instance.new("RemoteEvent",game.Workspace)
ADSu.Name = "servADSUp"
swap = Instance.new("RemoteEvent",game.Workspace)
swap.Name = "swap"
reload = Instance.new("RemoteEvent",game.Workspace)
reload.Name = "Reload"
upd = Instance.new("RemoteEvent",game.Workspace)
upd.Name = "upd"
dead = Instance.new("RemoteEvent",game.Workspace)
dead.Name = "Died"
Melee = Instance.new("RemoteEvent",game.Workspace)
Melee.Name = "Melee"
sd = Instance.new("RemoteEvent",game.Workspace)
sd.Name = "SwapDone"

game.Players.PlayerAdded:connect(function(plr)

table.insert(plrV,plr.Name,{})
table.insert(plrV[plr.Name], "Test")
print(table.concat(plrV[plr.Name]))

plr.CharacterAdded:connect(function(pm)

local plrTV = Instance.new("NumberValue",pm)
plrTV.Name = "Team"
if game.Workspace.Teams["0"]:FindFirstChild(plr.Name) then
	plrTV.Value = 0
elseif game.Workspace.Teams["1"]:FindFirstChild(plr.Name) then
	plrTV.Value = 1
end
	
local animating = false
local ADSd = false
swapping = false
local pgun
local pnam
local snam
local pg
local g
local sg
local og
local gw
local w1
local w2
local eq
local servArms
local barrel
local costume
local isHero

Melee.OnServerEvent:connect(function(player,mhp,pgun,style,sp)

if sp == false then
ray = Ray.new(
player.Character.Head.Position,
player.Character.Head.CFrame.lookVector*8)	
elseif sp == true then
ray = Ray.new(
player.Character.Head.Position,
player.Character.Head.CFrame.lookVector*20)	
end

local hit,position,normal = game.Workspace:FindPartOnRayWithIgnoreList(ray,player.Character:GetChildren())

if hit ~= nil then
			if hit.Parent:FindFirstChild("Humanoid") then
				if game.Workspace[hit.Parent.Name].Team.Value ~= game.Workspace.Teams[player.Name].Team.Value then
				hit.Parent.Humanoid:TakeDamage(guns[pgun].Damage)
				if hit.Name == "Head" then
				hit.Parent.Humanoid:TakeDamage(guns[pgun].Damage)	
				end
				end
			elseif hit.Parent.Parent:FindFirstChild("Humanoid") then
				if game.Workspace[hit.Parent.Parent.Name].Team.Value ~= game.Workspace.Teams[player.Name].Team.Value then
				hit.Parent.Parent.Humanoid:TakeDamage(guns[pgun].Damage)
				if hit.Name == "Head" then
				hit.Parent.Parent.Humanoid:TakeDamage(guns[pgun].Damage)	
				end
				end
			end
		end	

local function DrawDBRay(R)
		local Rp = Instance.new("Part")
		local RayLength = ( (R.Origin + R.Direction) - R.Origin ).magnitude
		Rp.FormFactor = "Custom"	
		Rp.Material = Enum.Material.Neon
		Rp.Size = Vector3.new(0,0,RayLength)
		Rp.CFrame = CFrame.new(R.Origin, R.Origin + R.Direction) * CFrame.new(0,0,RayLength/-2)
		Rp.BrickColor = BrickColor.Gray()
		Rp.Transparency = 0
		Rp.Anchored = true
		Rp.CanCollide = false
		Rp.Name = "Ray"
		Rp.Parent = game.Workspace.bdebris
		Rp.Material = Enum.Material.SmoothPlastic
		for i=0,1, 0.055 do
			Rp.Transparency = i
			wait()
		end					
	Rp:Destroy()
end	

DrawDBRay(ray)

end)

upd.OnServerEvent:connect(function(player,mhp,Neck)
	
if not player.Character:FindFirstChild("Head") then return end
	local angle = CFrame.new(player.Character.Head.Position, mhp).lookVector.Y
	Neck.C1 = CFrame.new()
	Neck.C0 = CFrame.new(0, 1.5, 0) * CFrame.Angles(math.asin(angle), 0, 0)	
end)

reload.OnServerEvent:connect(function(player)
	
	g.Ammo.Value = g.Ammo.Value - g.ClipM.Value + g.Clip.Value
	g.Clip.Value = g.ClipM.Value	
	
end)

sd.OnServerEvent:connect(function(player,en)
	if en == true then
	swapping = false
	end	
end)

swap.OnServerEvent:connect(function(player,eq)
	
	if swapping ~= true then
	if w1 == nil then repeat wait() until w1 ~= nil end
	animating = true	
	swapping = true
	
		w1.C1 = w1.C1:lerp(CFrame.new(0,0.5,0)*CFrame.Angles(math.rad(75),0,0),1)
		w2.C1 = w2.C1:lerp(CFrame.new(0,0.5,0)*CFrame.Angles(math.rad(75),0,0),1)
	
	og.Parent = game.Workspace
	g.Parent = nil
	g = og
	if eq == 1 then
		pgun = snam 
		
		gw.Part1 = nil
		gw:Destroy()
		g.Parent = nil	
		g=nil
		g = sg				
		gw = Instance.new("Weld",g)
		gw.Name = "Gun"
		
		gw.Part0 = g.Handle
		gw.Part1 = servArms["LA"]		
		
		w1.C0 = guns[snam].DefArmPos.Left
		w2.C0 = guns[snam].DefArmPos.Right
				
		gw.C0 = guns[snam].DefGunPos*CFrame.Angles(guns[snam].RotFix.X,guns[snam].RotFix.Y,guns[snam].RotFix.Z)
		
		g.Parent = player.Character
	else pgun = pnam 
		
		gw.Part1 = nil
		gw:Destroy()
		g.Parent = nil
		g=nil
		g = pg				
		gw = Instance.new("Weld",g)
		gw.Name = "Gun"
		
		gw.Part0 = g.Handle
		gw.Part1 = servArms["LA"]		
		
		w1.C0 = guns[pnam].DefArmPos.Left
		w2.C0 = guns[pnam].DefArmPos.Right
				
		gw.C0 = guns[pnam].DefGunPos*CFrame.Angles(guns[pnam].RotFix.X,guns[pnam].RotFix.Y,guns[pnam].RotFix.Z)
		
		g.Parent = player.Character
	end
		w1.C1 = w1.C1:lerp(CFrame.new(0,0,0)*CFrame.Angles(math.rad(0),0,0),1)
		w2.C1 = w2.C1:lerp(CFrame.new(0,0,0)*CFrame.Angles(math.rad(0),0,0),1)
	animating = false
	end

end)


ADS.OnServerEvent:connect(function(player,w1p,w2p,gp)
		if ADSd == false then
		ADSd = true
		animating = true
		for i=0,1,0.1 do
			if ADSd == false then break end
			w2.C1 = w2.C1:lerp(w1p,i)
			w1.C1 = w1.C1:lerp(w2p,i)
			gw.C1 = gw.C1:lerp(gp,i)
			wait()
		end
		animating = false
		repeat wait() until ADSd == false
	end	
	
end)

ADSu.OnServerEvent:connect(function(player)
	if ADSd == true then
		ADSd = false
		animating = true
		for i=0,1,0.1 do
			w1.C1 = w1.C1:lerp(CFrame.new(0,0,0),i)
			w2.C1 = w2.C1:lerp(CFrame.new(0,0,0),i)
			gw.C1 = gw.C1:lerp(CFrame.new(0,0,0),i)
			wait()
		end
		animating = false
	end	
end)

weldGun.OnServerEvent:connect(function(player,prim,sec,Hero)
	
		isHero = Hero
		
		pgun = prim --use the gun in other functions
		pnam = prim
		snam = sec
		
		pg = game.ReplicatedStorage.Engine.Models.Guns[prim][player.Character.Team.Value][game.Workspace.stageType.Value]:Clone()	
		if Hero == false then
		pg.Ammo.Value = guns[prim].Max_Ammo
		pg.Clip.Value = guns[prim].Clip
		pg.ClipM.Value = guns[prim].Clip				
		else pg.Clip.Value = 1		
		end
		og = sg		
		
		g = pg				
		gw = Instance.new("Weld",g)
		gw.Name = "Gun"
		
		w1.C0 = guns[pnam].DefArmPos.Left
		w2.C0 = guns[pnam].DefArmPos.Right
		
		gw.Part0 = g.Handle
		gw.Part1 =servArms["LA"]
				
		gw.C0 = guns[pnam].DefGunPos*CFrame.Angles(guns[pnam].RotFix.X,guns[pnam].RotFix.Y,guns[pnam].RotFix.Z)
		
		g.Parent = player.Character
		
		snam = sec
		
		sg = game.ReplicatedStorage.Engine.Models.Guns[sec][player.Character.Team.Value][game.Workspace.stageType.Value]:Clone()		
		if Hero == false then
		sg.Ammo.Value = guns[sec].Max_Ammo
		sg.Clip.Value = guns[sec].Clip
		sg.ClipM.Value = guns[sec].Clip	
		else sg.Clip.Value = 1	
		end
		og = sg	
		
		pg.Name = "Gun"
		sg.Name = "Gun"	
	
end)

weldArms.OnServerEvent:connect(function(player,Arms,Faction)
	
	servArms = game.ReplicatedStorage.Engine.Models.Player.Character.Costumes[Faction][game.Workspace.stageType.Value].Arms:Clone()
	
	w1 = Instance.new("Weld",servArms["LA"])
	w1.Name = "Left"
	w1.Part0=servArms["LA"]
	w1.Part1 = player.Character.Head
	w2 = Instance.new("Weld",servArms["RA"])
	w2.Name = "Right"
	w2.Part0=servArms["RA"]
	w2.Part1 = player.Character.Head	
	servArms.Parent = player.Character
	servArms.Name = ("Arms")	
		
		for i,c in pairs(player.Character:GetChildren()) do
			if c:IsA("Part") then c.Transparency = 1 end
			if c:IsA("CharacterMesh") then c:Destroy() end
			if c:IsA("Hat") then c:Destroy() end
			if c:IsA("ShirtGraphic") then c:Destroy() end
			if c:IsA("TShirt") then c:Destroy() end
			if c:IsA("Pants") then c:Destroy() end
			if player.Character.Torso:FindFirstChild("roblox") then player.Character.Torso.roblox:Destroy() end
		end		
		costume = game.ReplicatedStorage.Engine.Models.Player.Character.Costumes[Faction][game.Workspace.stageType.Value]:Clone()
		costume.Name = "Costume"		
		local hw = Instance.new("Weld",costume)
		local llw = Instance.new("Weld",costume)
		local rlw = Instance.new("Weld",costume)
		local tw = Instance.new("Weld",costume)
		hw.Part0 = costume.Head.Head
		hw.Part1 = player.Character.Head
		llw.Part0 = costume["L Leg"].LL
		llw.Part1 = player.Character["Left Leg"]
		rlw.Part0 = costume["R Leg"].RL
		rlw.Part1 = player.Character["Right Leg"]
		tw.Part0 = costume.Torso.T
		tw.Part1 = player.Character.Torso
		hw.C0 = CFrame.Angles(0,math.rad(0),0)
		llw.C0 = CFrame.Angles(0,math.rad(180),0)
		rlw.C0 = CFrame.Angles(0,math.rad(180),0)
		tw.C0 = CFrame.Angles(0,math.rad(180),0)
		costume.Parent = player.Character
end)



fire.OnServerEvent:connect(function(player,mhp,pgun,style)
repeat wait() until g ~= nil
if not pm:FindFirstChild("Gun") then pm:WaitForChild("Gun") end
if  isHero == true or pm.Gun.Clip.Value > 0 and isHero == false then
if isHero == false then pm.Gun.Clip.Value = pm.Gun.Clip.Value - 1 end
pm:WaitForChild("Gun")
if style ~= "Melee" then barrel = pm.Gun.Barrel end

local function DrawDBRay(R)
		local Rp = Instance.new("Part")
		local RayLength = ( (R.Origin + R.Direction) - R.Origin ).magnitude
		Rp.FormFactor = "Custom"	
		Rp.Material = Enum.Material.Neon
		Rp.Size = Vector3.new(0,0,RayLength)
		Rp.CFrame = CFrame.new(R.Origin, R.Origin + R.Direction) * CFrame.new(0,0,RayLength/-2)
		Rp.BrickColor = BrickColor.Gray()
		Rp.Transparency = 0
		Rp.Anchored = true
		Rp.CanCollide = false
		Rp.Name = "Ray"
		Rp.Parent = game.Workspace.bdebris
		Rp.Material = Enum.Material.SmoothPlastic
		for i=0,1, 0.055 do
			Rp.Transparency = i
			wait()
		end					
	Rp:Destroy()
end		

if style == "Blaster Rifle" then	
		local f = game.ReplicatedStorage.Engine.Models.Guns[pgun].Effects.Laser:Clone()
		f.CFrame = barrel.CFrame
		local bf = Instance.new("BodyForce",f)
		
		local ray = Ray.new(
		barrel.CFrame.p,
		 (mhp - barrel.Position + Vector3.new(math.random(guns[pgun].Spread*-1,guns[pgun].Spread)/(mhp - barrel.CFrame.p).magnitude,math.random(guns[pgun].Spread*-1,guns[pgun].Spread/(mhp- barrel.CFrame.p).magnitude),0)).unit*guns[pgun].Range)
		
		local hit,position,normal = game.Workspace:FindPartOnRayWithIgnoreList(ray,player.Character:GetChildren())
		
		if hit ~= nil then
			if hit.Parent:FindFirstChild("Humanoid") then
				if game.Workspace[hit.Parent.Name].Team.Value ~= game.Workspace.Teams[player.Name].Team.Value then
				hit.Parent.Humanoid:TakeDamage(guns[pgun].Damage)
				if hit.Name == "Head" then
				hit.Parent.Humanoid:TakeDamage(guns[pgun].Damage)	
				end
				end
			elseif hit.Parent.Parent:FindFirstChild("Humanoid") then
				if game.Workspace[hit.Parent.Parent.Name].Team.Value ~= game.Workspace.Teams[player.Name].Team.Value then
				hit.Parent.Parent.Humanoid:TakeDamage(guns[pgun].Damage)
				end
			end
		end		
		
		f.CFrame = CFrame.new(barrel.CFrame.p,ray.Direction)*CFrame.Angles(math.rad(90),0,0)
		f.Parent = game.Workspace
		f.Anchored = false
		local dir = (mhp - barrel.CFrame.p).Unit*50
		bf.force = Vector3.new(0,196.2,0)*f:GetMass()
		f.Velocity = dir*5

		--DrawDBRay(ray)	
		wait()	
		
		f.Touched:connect(function()
			f:Destroy()
		end)
		wait(6)
		f:Destroy()
end
end
end)

dead.OnServerEvent:connect(function(player)
player.Character.Gun:Destroy()
player.Character.Arms:Destroy()
player.Character.Costume:Destroy()

animating = false
ADSd = false
swapping = false
pgun = nil
pnam = nil
snam = nil
pg:Destroy()
pg = nil
sg:Destroy()
sg = nil 
og = nil
gw:Destroy()
gw = nil
w1:Destroy()
w1 = nil
w2:Destroy()
w2 = nil
eq = nil
servArms = nil
barrel = nil
costume = nil

end)

end)

end)