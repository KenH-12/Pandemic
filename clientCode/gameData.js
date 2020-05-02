"use strict";

import WarningLevelManager from "./warningLevelManager.js";

const gameData = {
    players: {},
    turn: -1,
    steps: {},
    currentStep: -1,
    promptingEventType: false,
    eventHistoryQueue: [],
	cures: {
		remaining: 4,
		y: false,
		r: false,
		u: false,
		b: false
	},
	maxInfectionDeckSize: 48, // 1 card for each city
	infectionDeckSize: 48,
	epidemicCount: 0,
	outbreakCount: 0,
	outbreakWarningLevelManager: new WarningLevelManager({
		upperThresholds: [4, 5, 6, 7],
		$elementsToAnimate: $("#outbreaksMarker")
	}),
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

function locatePawnOnRoleTagClick($containingElement)
{
	$containingElement.find(".roleTag").not(".playerOption")
		.off("click")
		.click(function() { getPlayer($(this).data("role")).pinpointLocation() });
}

function eventTypeIsBeingPrompted(eventType)
{
	const { promptingEventType } = gameData;

	return promptingEventType && promptingEventType.code === eventType.code;
}

function getDifficultyName()
{
	const { numEpidemics } = gameData;

	if (numEpidemics == 4)
		return "Introductory";
	
	if (numEpidemics == 5)
		return "Standard";
	
	return "Heroic";
}

export {
	gameData,
	getPlayer,
	getActivePlayer,
	replaceRoleNamesWithRoleTags,
	locatePawnOnRoleTagClick,
	eventTypeIsBeingPrompted,
	getDifficultyName
}