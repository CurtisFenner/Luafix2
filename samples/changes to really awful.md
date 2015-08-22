This code is really awful to understand, because it's really messy.

* ***Tab and space your code correctly*** -- it's impossible to see how it's grouped
* ***Use good variable names*** -- it's impossible to guess what most of the functions and variables are supposed to do.

There are some serious mistakes easily visible:

* `plrv` isn't defined
* `swapping` is a global variable
* `DrawDBRay` is defined twice
* The entire program is inside the PlayerAdded event

You have ~a dozen local variables for each player... but that much state is complicated and likely unnecessary (they're essentially unnamed, so it's hard to tell). This makes it hard to separate a lot of the functions. However, it's still possible. `DrawDBRay`, `upd.OnServerEvent` can be pulled out.

You can use `workspace` instead of `game.Workspace`.

Use `while not x do wait() end` instead of `if not x then repeat wait() until x end`.

Don't repeat yourself! If the only thing that's different is one number... then only change that number, with a variable!

Don't use `if a then elseif not a then`. Just use `if a then else`.

You can use `FindPartOnRay`'s ignore for the Character instead of just GetChildren()ing a model and using FindPartOnRayWithIgnoreList.

You use `player.Character` repeatedly despite having a `pm` variable -- maybe name that `character` instead??

**Define functions to do things** -- you repeat a block of code to damage a part that you hit 4 times instead of just defining a function. Something like this:

~~~~~~~~~~~~~~~~~
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
	return dealDamage(part.Parent, attackerTeam, damage)
end
~~~~~~~~~~~~~~~~~

**Define variables in the narrowest scope possible**. Your variable `barrel` is **only** meaningfully used in `fire.OnServerEvent`, yet it's defined 200 lines earlier. `costume`, the same.

No point to check for something to exist and then wait for it -- just WaitForChild -- it does that check for you.

There is no "TShirt" class. You didn't name "Shirt". There is a "Clothing" class which covers "Pants" and "Shirts". Use `or` instead of repeating yourself...

Why are you doing this?

~~~~~~~~~~~~~~~~~
w2.C1:lerp(CFrame.new(0, 0, 0) * CFrame.Angles(math.rad(0), 0, 0), 1)
~~~~~~~~~~~~~~~~~

That's the same thing as

~~~~~~~~~~~~~~~~~
CFrame.new()
~~~~~~~~~~~~~~~~~

There's no point in setting all the values to `nil` when they die, since all of this is redone for each new character anyway.

# Big Bug

The behavior you have is caused by reconnecting every one of these events each time the player dies. That's the reason you should avoid these stateful designs.

You *only* want to act for the currently spawned player. First you should clean up this mess, though.

At this point, `Melee.OnServerEvent` can be lifted out to an outer scope.


------

**[This is the most sense I could make of this](http://hastebin.com/urocuvogid.luax)**, but there is considerable improvement to be made.