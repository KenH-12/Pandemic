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
            `warning-${warningClass}-smallGlow`,
            500,
            () => $supplyCount.hasClass(warningClass));
    }
}

const warningLevelThresholds = {
    none: 11,
    mild: 6,
    moderate: 4,
    critical: -6 // The theoretical minumum cube count
}

function getWarningLevelFromCubeCount(cubeCount)
{
    for (let warningLevel in warningLevelThresholds)
        if (cubeCount >= warningLevelThresholds[warningLevel])
            return warningLevel;
}

function removeOtherWarningLevelClasses($supplyCount, warningLevel)
{
    for (let lvl in warningLevelThresholds)
        if (lvl !== warningLevel)
            $supplyCount.removeClass(`warning-${warningLevel}`);
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