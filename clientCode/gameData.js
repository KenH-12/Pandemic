"use strict";

const gameData = {
    players: {},
    turn: -1,
    steps: {},
    currentStep: -1,
    promptingEventType: false,
    events: [],
    eventHistoryQueue: [],
	cures: {
		remaining: 4,
		y: false,
		r: false,
		u: false,
		b: false
	},
	epidemicCount: 0,
	outbreakCount: 0,
	diseaseCubeSupplies: {
		y: 24,
		r: 24,
		u: 24,
		b: 24
	},
	pendingClusters: new Set(),
	fastForwarding: false,
	HAND_LIMIT: 7,
	playerCardAnimationInterval: 0.4
}

// Given the name of a role, returns the corresponding Player object.
// Also accepts the camelcase form of the role name.
function getPlayer(roleNameOrId)
{
	const { players } = gameData;
	let player;
	
	if (players.hasOwnProperty(roleNameOrId))
		return players[roleNameOrId];
	
	for (let rID in players)
	{
		player = players[rID];
		if (player.role === roleNameOrId || player.camelCaseRole === roleNameOrId)
			return player;
	}

	return false;
}

function getActivePlayer()
{
	return gameData.players[gameData.turn];
}

function replaceRoleNamesWithRoleTags(string)
{
	const { players } = gameData;
	let player;

	for (let rID in players)
	{
		player = players[rID];
		string = string.replace(player.role, player.newRoleTag());
	}
	return string;
}

function eventTypeIsBeingPrompted(eventType)
{
	const { promptingEventType } = gameData;

	return promptingEventType && promptingEventType.code === eventType.code;
}

export {
	gameData,
	getPlayer,
	getActivePlayer,
	replaceRoleNamesWithRoleTags,
	eventTypeIsBeingPrompted
};