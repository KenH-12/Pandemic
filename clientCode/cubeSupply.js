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
            removeOtherWarningLevelClasses(this.$supplyCount);
            this.$supplyCount.css("color", "red");
            return false;
        }

        this.animateCubeSupplyWarning();
    }

    decrementCubeCount(numToRemove = 1)
    {
        this.setCubeCount(this.cubeCount - numToRemove);
    }

    incrementCubeCount(numToAdd = 1)
    {
        this.setCubeCount(this.cubeCount + parseInt(numToAdd));
    }

    animateCubeSupplyWarning()
    {
        const warningLevel = getWarningLevelFromCubeCount(this.cubeCount);

        if (warningLevel === this.warningLevel)
            return false;
        
        const warningClass = `warning-${warningLevel}`,
            {
                $supplyCount,
                $supplyCube
            } = this;
        
        this.warningLevel = warningLevel;
        removeOtherWarningLevelClasses($supplyCount, warningLevel);

        if (warningLevel === "none")
            return false;
        
        $supplyCount.addClass(warningClass);

        oscillateBetweenCssTransitions($supplyCount.add($supplyCube),
            `warning-${warningLevel}-bigGlow`,
            `warning-${warningLevel}-smallGlow`,
            warningLevels[warningLevel].animationInterval,
            () => $supplyCount.hasClass(warningClass));
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

function removeOtherWarningLevelClasses($supplyCount, warningLevel)
{
    for (let lvl in warningLevels)
        if (lvl !== warningLevel)
            $supplyCount.removeClass(`warning-${lvl}`);
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