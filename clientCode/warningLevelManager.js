"use strict";

export default class WarningLevelManager
{
    constructor({ lowerThresholds, $elementsToAnimate, getElementsToAnimate })
    {
        this.warningLevels = {
            none: {},
            mild: { animationInterval: 1000 },
            moderate: { animationInterval: 500 },
            critical: { animationInterval: 250 }
        };
        this.warningLevel = "none";
        
        this.setThresholds(lowerThresholds);

        if (typeof getElementsToAnimate === "function")
            this.getElementsToAnimate = getElementsToAnimate;
        else
            this.getElementsToAnimate = () => $elementsToAnimate;
        
        this.$elementsToAnimate = "";
    }

    setThresholds(lowerThresholds)
    {
        let i = 0;
        for (let lvl in this.warningLevels)
            this.warningLevels[lvl].lowerThreshold = lowerThresholds[i++];
    }
    
    setWarningLevelBasedOn(decidingValue)
    {
        const { warningLevels } = this;

        for (let lvlName in warningLevels)
        {
            if (decidingValue >= warningLevels[lvlName].lowerThreshold)
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
        
        const { animationInterval } = this.warningLevels[currentLvl];

        warningGlowAnimation(this.$elementsToAnimate, currentLvl, animationInterval,
            () => this.warningLevel === currentLvl);
    }
}

function warningGlowAnimation($elements, warningLevel, interval, conditionFn)
{
	oscillateBetweenCssTransitions($elements,
		`warning-${warningLevel}-bigGlow`,
		`warning-${warningLevel}-smallGlow`,
		interval,
		conditionFn);
}