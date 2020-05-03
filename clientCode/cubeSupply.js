"use strict";

import WarningLevelManager from "./warningLevelManager.js";

class CubeSupply
{
    constructor(diseaseColor, cubeCount = 24)
    {
        this.diseaseColor = diseaseColor;
        this.cubeCount = cubeCount;

        this.$supplyCount = $(`#${diseaseColor}Supply`);
        this.$supplyCube = $(`#${diseaseColor}SupplyCube`);

        this.warningLevelManager = new WarningLevelManager({
            lowerThresholds: [10, 7, 4, 0],
            $elementsToAnimate: this.$supplyCount.add(this.$supplyCube)
        });
    }

    setCubeCount(newCount)
    {
        this.cubeCount = newCount;
        this.$supplyCount.html(newCount);

        if (newCount < 0) // defeat!
        {
            this.removeWarningTooltip();
            return false;
        }

        this.warningLevelManager.setWarningLevelBasedOn(newCount);

        if (this.warningLevelManager.warningLevel === "none")
            this.removeWarningTooltip();
    }

    decrementCubeCount(numToRemove = 1)
    {
        this.setCubeCount(this.cubeCount - numToRemove);
    }

    incrementCubeCount(numToAdd = 1)
    {
        this.setCubeCount(this.cubeCount + parseInt(numToAdd));
    }

    removeWarningTooltip()
    {
        const $warningTooltip = $(".cubeWarningTooltip");

        if ($warningTooltip.length)
            $warningTooltip.remove();
    }
}

function instantiateCubeSupplies()
{
    const diseaseColors = ["y", "r", "u", "b"],
        cubeSupplies = {};

    for (let color of diseaseColors)
        cubeSupplies[color] = new CubeSupply(color, 24);
    
    return cubeSupplies;
}

export const cubeSupplies = instantiateCubeSupplies();