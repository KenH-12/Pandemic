"use strict";

export default class WarningLevelManager
{
    constructor({ lowerThresholds, upperThresholds, $elementsToAnimate, getElementsToAnimate })
    {
        this.warningLevels = {
            none: {},
            mild: { animationInterval: 1000 },
            moderate: { animationInterval: 500 },
            critical: { animationInterval: 250 }
        };
        this.warningLevel = "none";
        
        this.usesUpperThresholds = Array.isArray(upperThresholds);
        this.setThresholds(lowerThresholds || upperThresholds);

        if (typeof getElementsToAnimate === "function")
            this.getElementsToAnimate = getElementsToAnimate;
        else
            this.getElementsToAnimate = () => $elementsToAnimate;
        
        this.$elementsToAnimate = "";
    }

    setThresholds(thresholds)
    {
        let i = 0;
        for (let lvl in this.warningLevels)
            this.warningLevels[lvl].threshold = thresholds[i++];
    }
    
    setWarningLevelBasedOn(decidingValue)
    {
        const { warningLevels } = this;

        for (let lvlName in warningLevels)
        {
            if (this.isWithinThreshold(decidingValue, warningLevels[lvlName].threshold))
            {
                if (lvlName !== this.warningLevel || this.willAnimateDifferentElements())
                {
                    this.warningLevel = lvlName;
                    return this.playWarningAnimation();
                }
                
                return false;
            }
        }
    }

    isWithinThreshold(decidingValue, threshold)
    {
        if (this.usesUpperThresholds)
            return decidingValue <= threshold;

        return decidingValue >= threshold;
    }

    willAnimateDifferentElements()
    {
        if (this.warningLevel === "none")
            return false;
        
        const { $elementsToAnimate } = this,
            $elementsWhichWillBeAnimated = this.getElementsToAnimate();
        
        if (!$elementsToAnimate.length || $elementsToAnimate.length !== $elementsWhichWillBeAnimated.length)
            return $elementsWhichWillBeAnimated.length > 0;
        
        for (let i = 0; i < $elementsToAnimate.length; i++)
            if (!$elementsToAnimate.eq(i).is($elementsWhichWillBeAnimated.eq(i)))
                return true;
        
        return false;
    }

    playWarningAnimation()
    {
        const currentLvl = this.warningLevel;
        
        if (currentLvl === "none")
        {
            this.$elementsToAnimate = "";
            return false;
        }

        this.$elementsToAnimate = this.getElementsToAnimate();

        oscillateBetweenCssTransitions(this.$elementsToAnimate,
            `warning-${currentLvl}-bigGlow`,
            `warning-${currentLvl}-smallGlow`,
            this.warningLevels[currentLvl].animationInterval,
            () => this.warningLevel === currentLvl);
    }
}