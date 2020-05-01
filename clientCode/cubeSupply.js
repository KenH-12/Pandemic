"use strict";

class CubeSupply
{
    constructor(diseaseColor, cubeCount = 24)
    {
        this.diseaseColor = diseaseColor;
        this.cubeCount = cubeCount;

        this.$supplyCount = $(`#${diseaseColor}Supply`);
        this.$supplyCube = $(`#${diseaseColor}SupplyCube`);

        this.warningLevel = "none";
    }

    setCubeCount(newCount)
    {
        this.cubeCount = newCount;
        this.$supplyCount.html(newCount);

        if (newCount < 0) // defeat!
        {
            this.warningLevel = "none";
            this.$supplyCount.css("color", "red");
            return false;
        }

        this.playWarningAnimation();
    }

    decrementCubeCount(numToRemove = 1)
    {
        this.setCubeCount(this.cubeCount - numToRemove);
    }

    incrementCubeCount(numToAdd = 1)
    {
        this.setCubeCount(this.cubeCount + parseInt(numToAdd));
    }

    playWarningAnimation()
    {
        const warningLevel = getWarningLevelFromCubeCount(this.cubeCount);

        if (warningLevel === this.warningLevel)
            return false;
        
        const { $supplyCount, $supplyCube } = this;
        
        this.warningLevel = warningLevel;

        if (warningLevel === "none")
            return false;

        warningGlowAnimation($supplyCount.add($supplyCube), warningLevel, warningLevels[warningLevel].animationInterval,
            () => this.warningLevel === warningLevel);
    }
}

const warningLevels = {
    none: { lowerThreshold: 10 },
    mild: { lowerThreshold: 7, animationInterval: 1000 },
    moderate: { lowerThreshold: 4, animationInterval: 500 },
    critical: { lowerThreshold: 0, animationInterval: 250 }
}

function getWarningLevelFromCubeCount(cubeCount)
{
    for (let warningLevel in warningLevels)
        if (cubeCount >= warningLevels[warningLevel].lowerThreshold)
            return warningLevel;
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