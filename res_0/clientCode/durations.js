"use strict";

import { gameData } from "./gameData.js";

const durations = {
    shortInterval: 500,
    mediumInterval: 750,
    longInterval: 1250,
    dealCard: 500,
    revealPlayerCard: 400,
    discardPlayerCard: 600,
    discardPileExpand: 400,
    discardPileCollapse: 200,
    revealInfCard: 800,
    discardInfCard: 125,
    pawnAnimation: 250,
    cubePlacement: 600,
    stationPlacement: 750,
    moveMarker: 700,
    pinpointCity: 300,
    specialEventBannerReveal: 250,
    cureMarkerAnimation: 700
};

function getDuration(durationNameOrMs)
{
	if (gameData.skipping)
		return 0;
	
	if (isNaN(durationNameOrMs))
		return durations[durationNameOrMs];
	
	return durationNameOrMs;
}

function setDuration(durationName, ms)
{
	durations[durationName] = ms;
}

export { getDuration, setDuration };