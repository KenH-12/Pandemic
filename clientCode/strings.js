"use strict";

const warningSymbol = "<span class='warning'>⚠️</span>",
strings = {
    diseaseCubeSupplyInfo: "<p>When a city is infected by a disease, 1 disease cube of the matching color is placed onto the city.</p><p>If the city already has 3 cubes of this color, an <i>outbreak</i> of this disease occurs in the city.</p>",
    insufficientCubesWarning: `${warningSymbol} If the number of cubes <i>actually needed on the board</i> cannot be placed because there are not enough cubes in the supply, the game ends and your team has lost!`,
    tooManyOutbreaksWarning: `${warningSymbol} If the outbreaks marker reaches the last space of the Outbreaks Track, the game ends and your team has lost!`
};

export { strings };