guns = {
	Test = {
		Rate = 0.15,
		Damage = 10,
		Spread = 0,
		Range = 300,
		DefArmPos = {
			Right = CFrame.new(.5, .8, - 1.35) * CFrame.Angles(math.rad(- 95), math.rad(25), math.rad(5)),
			Left = CFrame.new(- .8, 0.1, - 1.35) * CFrame.Angles(math.rad(- 90), math.rad(0), math.rad(- 1)),
		},
		DefGunPos = CFrame.new(0, 0, - .65),
		RotFix = CFrame.new(math.rad(80), math.rad(2), math.rad(185)),
		Clip = 50,
		Max_Ammo = 250,
	},
	MSword = {
		Rate = 0.15,
		Damage = 70,
		Spread = 0,
		Range = 300,
		DefArmPos = {
			Right = CFrame.new(.5, .8, - 1.2) * CFrame.Angles(math.rad(- 95), math.rad(25), math.rad(5)),
			Left = CFrame.new(- .8, 0.1, - 1) * CFrame.Angles(math.rad(- 90), math.rad(0), math.rad(- 1)),
		},
		DefGunPos = CFrame.new(- 1.3, 0, .32),
		RotFix = CFrame.new(math.rad(90), math.rad(0), math.rad(90)),
		Clip = 0,
		Max_Ammo = 0,
	},
}

function DrawDBRay(R)
	local Rp = Instance.new("Part")
	local RayLength = R.Origin + R.Direction - R.Origin.magnitude
	Rp.FormFactor = "Custom"
	Rp.Material = Enum.Material.Neon
	Rp.Size = Vector3.new(0, 0, RayLength)
	Rp.CFrame = CFrame.new(R.Origin, R.Origin + R.Direction) * CFrame.new(0, 0, RayLength / - 2)
	Rp.BrickColor = BrickColor.Gray()
	Rp.Transparency = 0
	Rp.Anchored = true
	Rp.CanCollide = false
	Rp.Name = "Ray"
	Rp.Parent = workspace.bdebris
	Rp.Material = Enum.Material.SmoothPlastic
	for i = 0, 1, 0.055 do
		Rp.Transparency = i
		wait()
	end
	Rp:Destroy()
end


fire = Instance.new("RemoteEvent", workspace)
fire.Name = "_TestFireFunction"
weldArms = Instance.new("RemoteEvent", workspace)
weldArms.Name = "ArmWeldFunction"
weldGun = Instance.new("RemoteEvent", workspace)
weldGun.Name = "GunWeldFunction"
ADS = Instance.new("RemoteEvent", workspace)
ADS.Name = "servADSFunc"
ADSu = Instance.new("RemoteEvent", workspace)
ADSu.Name = "servADSUp"
swap = Instance.new("RemoteEvent", workspace)
swap.Name = "swap"
reload = Instance.new("RemoteEvent", workspace)
reload.Name = "Reload"
upd = Instance.new("RemoteEvent", workspace)
upd.Name = "upd"
dead = Instance.new("RemoteEvent", workspace)
dead.Name = "Died"
Melee = Instance.new("RemoteEvent", workspace)
Melee.Name = "Melee"
sd = Instance.new("RemoteEvent", workspace)
sd.Name = "SwapDone"

upd.OnServerEvent:connect(function(player, mhp, Neck)
	if not player.Character:FindFirstChild("Head") then
		return
	end
	local angle = CFrame.new(player.Character.Head.Position, mhp).lookVector.Y
	Neck.C1 = CFrame.new()
	Neck.C0 = CFrame.new(0, 1.5, 0) * CFrame.Angles(math.asin(angle), 0, 0)
end)

-- Deals damage to a descendant of a character.
-- A character has a Humanoid and a Team IntValue.
-- Dealing damage to something named "Head" doubles "damage"
function dealDamage(model, attackerTeam, damage)
	if not model then
		return -- Didn't hit anything
	end
	if model:FindFirstChild("Humanoid") then
		local team = workspace[model.Name].Team.Value
		if team ~= attackerTeam then
			model.Humanoid:TakeDamage(damage)
		end
		return
	end
	-- Double damage for headshots
	if model.Name == "Head" then
		damage = damage * 2
	end
	-- Try the parent, since there wasn't a humanoid to hit.
	return dealDamage(model.Parent, attackerTeam, damage)
end

function makeGun(name, team, hero)
	local weapon = game.ReplicatedStorage.Engine.Models.Guns[name][team][workspace.stageType.Value]:Clone()
	if not hero then
		weapon.Ammo.Value = guns[name].Max_Ammo
		weapon.Clip.Value = guns[name].Clip
		weapon.ClipM.Value = guns[name].Clip
	else
		weapon.Clip.Value = 1
	end
	weapon.Name = "Gun"
	return weapon
end

Melee.OnServerEvent:connect(function(player, mhp, pgun, style, sp)
	local len = 8
	if sp then
		len = 20
	end
	local ray = Ray.new(player.Character.Head.Position, player.Character.Head.CFrame.lookVector * len)
	local hit = workspace:FindPartOnRay(ray, player.Character)
	dealDamage(hit, workspace.Teams[player.Name].Team.Value, guns[pgun].Damage)
	DrawDBRay(ray)
end)

dead.OnServerEvent:connect(function(player)
	player.Character.Gun:Destroy()
	player.Character.Arms:Destroy()
	player.Character.Costume:Destroy()
end)

function newCharacter(plr, character)
	local plrTV = Instance.new("NumberValue", character)
	plrTV.Name = "Team"
	if workspace.Teams["0"]:FindFirstChild(plr.Name) then
		plrTV.Value = 0
	elseif workspace.Teams["1"]:FindFirstChild(plr.Name) then
		plrTV.Value = 1
	end
	local animating = false
	local ADSd = false
	local swapping = false
	local primaryName, secondaryName -- Names of primary and secondary weapons
	local sg -- The model of the primary weapon
	local pg -- The model of the secondary weapon
	local weapon, otherWeapon -- The models of the selected and unselected weapon
	local gw
	local w1
	local w2
	local eq
	local servArms
	local isHero
	reload.OnServerEvent:connect(function(player)
		weapon.Ammo.Value = weapon.Ammo.Value - weapon.ClipM.Value + weapon.Clip.Value
		weapon.Clip.Value = weapon.ClipM.Value
	end)
	sd.OnServerEvent:connect(function(player, en)
		if en then
			swapping = false
		end
	end)
	swap.OnServerEvent:connect(function(player, eq)
		if not swapping then
			while not w1 do
				wait()
			end
			animating = true
			swapping = true
			w1.C1 = w1.C1:lerp(CFrame.new(0, 0.5, 0) * CFrame.Angles(math.rad(75), 0, 0), 1)
			w2.C1 = w2.C1:lerp(CFrame.new(0, 0.5, 0) * CFrame.Angles(math.rad(75), 0, 0), 1)
			otherWeapon.Parent = workspace
			weapon.Parent = nil
			weapon = otherWeapon
			gw:Destroy()
			weapon.Parent = nil -- Do not destroy -- needs to be reparented later
			local selectedName -- Name of selected weapon
			if eq == 1 then
				weapon = sg
				selectedName = secondaryName
			else
				weapon = pg
				selectedName = primaryName
			end
			gw = Instance.new("Weld", weapon)
			gw.Name = "Gun"
			gw.Part0 = weapon.Handle
			gw.Part1 = servArms.LA
			w1.C0 = guns[selectedName].DefArmPos.Left
			w2.C0 = guns[selectedName].DefArmPos.Right
			gw.C0 = guns[selectedName].DefGunPos * CFrame.Angles(guns[selectedName].RotFix.X, guns[selectedName].RotFix.Y, guns[selectedName].RotFix.Z)
			weapon.Parent = player.Character
			w1.C1 = CFrame.new()
			w2.C1 = CFrame.new()
			animating = false
		end
	end)
	ADS.OnServerEvent:connect(function(player, w1p, w2p, gp)
		if not ADSd then
			ADSd = true
			animating = true
			for i = 0, 1, 0.1 do
				if not ADSd then
					break
				end
				w2.C1 = w2.C1:lerp(w1p, i)
				w1.C1 = w1.C1:lerp(w2p, i)
				gw.C1 = gw.C1:lerp(gp, i)
				wait()
			end
			animating = false
		end
	end)
	ADSu.OnServerEvent:connect(function(player)
		if ADSd then
			ADSd = false
			animating = true
			for i = 0, 1, 0.1 do
				w1.C1 = w1.C1:lerp(CFrame.new(0, 0, 0), i)
				w2.C1 = w2.C1:lerp(CFrame.new(0, 0, 0), i)
				gw.C1 = gw.C1:lerp(CFrame.new(0, 0, 0), i)
				wait()
			end
			animating = false
		end
	end)
	weldGun.OnServerEvent:connect(function(player, prim, sec, Hero)
		isHero = Hero
		local pg = makeGun(prim, player.Character.Team.Value, Hero)
		local sg = makeGun(sec, player.Character.Team.Value, Hero)
		otherWeapon = sg
		weapon = pg
		gw = Instance.new("Weld", weapon)
		gw.Name = "Gun"
		w1.C0 = guns[prim].DefArmPos.Left
		w2.C0 = guns[prim].DefArmPos.Right
		gw.Part0 = weapon.Handle
		gw.Part1 = servArms.LA
		gw.C0 = guns[prim].DefGunPos * CFrame.Angles(guns[prim].RotFix.X, guns[prim].RotFix.Y, guns[prim].RotFix.Z)
		weapon.Parent = player.Character
		--
		primaryName = prim
		secondaryName = sec
	end)
	weldArms.OnServerEvent:connect(function(player, Arms, Faction)
		servArms = game.ReplicatedStorage.Engine.Models.Player.Character.Costumes[Faction][workspace.stageType.Value].Arms:Clone()
		w1 = Instance.new("Weld", servArms.LA)
		w1.Name = "Left"
		w1.Part0 = servArms.LA
		w1.Part1 = player.Character.Head
		w2 = Instance.new("Weld", servArms.RA)
		w2.Name = "Right"
		w2.Part0 = servArms.RA
		w2.Part1 = player.Character.Head
		servArms.Parent = player.Character
		servArms.Name = "Arms"
		for i, c in pairs(player.Character:GetChildren()) do
			if c:IsA("Part") then
				c.Transparency = 1
			end
			if c:IsA("CharacterMesh") or c:IsA("Hat") or c:IsA("ShirtGraphic") or c:IsA("Clothing") then
				c:Destroy()
			end
		end
		if player.Character.Torso:FindFirstChild("roblox") then
			player.Character.Torso.roblox:Destroy()
		end
		local costume = game.ReplicatedStorage.Engine.Models.Player.Character.Costumes[Faction][workspace.stageType.Value]:Clone()
		costume.Name = "Costume"
		local hw = Instance.new("Weld", costume)
		local llw = Instance.new("Weld", costume)
		local rlw = Instance.new("Weld", costume)
		local tw = Instance.new("Weld", costume)
		hw.Part0 = costume.Head.Head
		hw.Part1 = player.Character.Head
		llw.Part0 = costume["L Leg"].LL
		llw.Part1 = player.Character["Left Leg"]
		rlw.Part0 = costume["R Leg"].RL
		rlw.Part1 = player.Character["Right Leg"]
		tw.Part0 = costume.Torso.T
		tw.Part1 = player.Character.Torso
		hw.C0 = CFrame.Angles(0, math.rad(0), 0)
		llw.C0 = CFrame.Angles(0, math.rad(180), 0)
		rlw.C0 = CFrame.Angles(0, math.rad(180), 0)
		tw.C0 = CFrame.Angles(0, math.rad(180), 0)
		costume.Parent = player.Character
	end)
	fire.OnServerEvent:connect(function(player, mhp, pgun, style)
		local barrel
		repeat
			wait()
		until weapon
		character:WaitForChild("Gun")
		if isHero or ((character.Gun.Clip.Value > 0) and not isHero) then
			if not isHero then
				character.Gun.Clip.Value = character.Gun.Clip.Value - 1
			end
			character:WaitForChild("Gun")
			if style ~= "Melee" then
				barrel = character.Gun.Barrel
			end
			if style == "Blaster Rifle" then
				local f = game.ReplicatedStorage.Engine.Models.Guns[pgun].Effects.Laser:Clone()
				f.CFrame = barrel.CFrame
				local bf = Instance.new("BodyForce", f)
				local ray = Ray.new(barrel.CFrame.p, mhp - barrel.Position + Vector3.new(math.random(guns[pgun].Spread * -1, guns[pgun].Spread) / mhp - barrel.CFrame.p.magnitude, math.random(guns[pgun].Spread * -1, guns[pgun].Spread / mhp - barrel.CFrame.p.magnitude), 0).unit * guns[pgun].Range)
				local hit = workspace:FindPartOnRay(ray, player.Character)
				dealDamage(hit, workspace.Teams[player.Name].Team.Value, guns[pgun].Damage)
				f.CFrame = CFrame.new(barrel.CFrame.p, ray.Direction) * CFrame.Angles(math.rad(90), 0, 0)
				f.Parent = workspace
				f.Anchored = false
				local dir = mhp - barrel.CFrame.p.Unit * 50
				bf.force = Vector3.new(0, 196.2, 0) * f:GetMass()
				f.Velocity = dir * 5
				wait()
				f.Touched:connect(function()
					f:Destroy()
				end)
				wait(6)
				f:Destroy()
			end
		end
	end)
end

game.Players.PlayerAdded:connect(function(plr)
	plr.CharacterAdded:connect(function(character) newCharacter(plr, character) end)
end)