"use strict";

const warningSymbol = "<span class='warning'>⚠️</span>",
strings = {
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching color is placed onto the city.</p><p>If the city already has 3 cubes of this color, an <i>outbreak</i> of this disease occurs in the city.</p>",
    insufficientCubesWarning: `${warningSymbol} If the number of cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    tooManyOutbreaksWarning: `${warningSymbol} If the outbreaks marker reaches the last space of the Outbreaks Track, the game ends and your team has lost!`,
    playerDeckInfo: "After doing 4 actions, the active role must draw 2 cards from the Player Deck. Any city cards or event cards drawn are added to the role's hand. Any Epidemic cards drawn must be resolved immediately.",
    discardRule: "If a role ever has more than 7 cards in hand (after first resolving any Epidemic cards drawn), they must discard or play event cards until they have 7 cards in hand.",
    outOfCardsWarning: `${warningSymbol} If there are fewer than 2 cards left in the Player Deck when it is time to draw, the game ends and your team has lost!`,
    
    contingencyPlannerCardText: `<li><span>As an action, take any discarded Event card and store it.</span></li><li><span>When you play the stored Event card, remove it from the game.</span></li><li><span>Limit: 1 stored Event card at a time, which is not part of your hand.</span></li>`,
    dispatcherCardText: `<li><span>Move another role''s pawn as if it were yours.</span></li><li><span>As an action, move any pawn to a city with another pawn.</span></li>`,
    medicCardText: `<li><span>Remove all cubes of one color when doing Treat Disease.</span></li><li><span>Automatically remove cubes of cured diseases from the city you are in (and prevent them from being placed there).</span></li>`,
    operationsExpertCardText: `<li><span>As an action, build a research station in the city you are in (no City card needed).</span></li><li><span>Once per turn as an action, move from a research station to any city by discarding any City card.</span></li>`,
    quarantineSpecialistCardText: `<li><span>Prevent disease cube placements (and outbreaks) in the city you are in and all cities connected to it.</span></li>`,
    researcherCardText: `<li><span>You may give any 1 of your City cards when you Share Knowledge. It need not match your city. A player who Shares Knowledge with you on their turn can take any 1 of your City cards.</span></li>`,
    scientistCardText: `<li><span>You need only 4 cards of the same color to do the Discover a Cure action.</span></li>`
};

export { strings };