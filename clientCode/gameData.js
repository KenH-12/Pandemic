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
	pendingClusters: new Set()
}

export { gameData };