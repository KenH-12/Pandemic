"use strict";

const warningSymbol = "<span class='warning'>⚠️</span>",
strings = {
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching color is placed onto the city.</p><p>If the city already has 3 cubes of this color, an <i>outbreak</i> of this disease occurs in the city.</p>",
    insufficientCubesWarning: `${warningSymbol} If the number of cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    tooManyOutbreaksWarning: `${warningSymbol} If the outbreaks marker reaches the last space of the Outbreaks Track, the game ends and your team has lost!`,
    playerDeckInfo: "After doing 4 actions, the active role must draw 2 cards from the Player Deck. Any city cards or event cards drawn are added to the role's hand. Any Epidemic cards drawn must be resolved immediately.",
    discardRule: "If a role ever has more than 7 cards in hand (after first resolving any Epidemic cards drawn), they must discard or play event cards until they have 7 cards in hand.",
    outOfCardsWarning: `${warningSymbol} If there are fewer than 2 cards left in the Player Deck when it is time to draw, the game ends and your team has lost!`
};

export { strings };