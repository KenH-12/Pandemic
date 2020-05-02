"use strict";

import { gameData } from "./gameData.js";

// As the number of cards in the deck changes, so should the apparent stack size.
// This class manages an image depicting a deck of cards, dynamically modifying the apparent number of cards in the stack 
// by selecting the appropriate image from a collection of numbered images, each depicting a different stack size.
// The collection of image files should be in the same directory, have the same file extension,
// and have the same file name except for a unique number at the end of each.
// The numbers at the end of file names must be consecutive, positive integers beginning at 1,
// with greater numbers denoting a larger stack size.
// For the condition in which the deck contains 0 cards, the image is hidden.
export default class DeckImageManager
{
    constructor({ $deck, imageUrlWithoutNumber, numImages, maxCardCount })
    {
        this.$deck = $deck;
        
        this.imageUrlWithoutNumber = imageUrlWithoutNumber;
        this.numImages = numImages;
        this.currentImageNumber = numImages;

        this.maxCardCount = maxCardCount;
    }

    incrementCardCount(numToAdd = 1)
    {
        this.setCardCount(parseInt(this.cardCount) + parseInt(numToAdd));
        return this;
    }
    
    decrementCardCount(numToRemove = 1)
    {
        this.setCardCount(this.cardCount - numToRemove);
        this.playWarningAnimation();
        return this;
    }

    setMaxCardCount(maxCardCount)
    {
        this.maxCardCount = maxCardCount;

        if (typeof this.cardCount === "undefined")
            this.setCardCount(maxCardCount);
    }

    setCardCount(cardCount)
    {
        const { maxCardCount } = this;

        if (cardCount < 0)
            cardCount = 0;
        else if (cardCount > maxCardCount)
            cardCount = maxCardCount;
        
        this.cardCount = cardCount;
        this.setImage();

        if (gameData.currentStep.name !== "setup")
            this.playWarningAnimation();
    }

    // Set the image to a specific imageNumber,
    // or omit the imageNumber to let the imageNumber be calculated based on the percentage of cards that remain in the deck.
    // You can also pass false to hide the image.
    setImage(imageNumber)
    {
        if (imageNumber === false)
            return this.hideImage();
        
        imageNumber = imageNumber || this.calculateImageNumber();
        
        if (imageNumber == 0)
            return this.hideImage();
        
        this.currentImageNumber = imageNumber;
        
        this.$deck.attr("src", this.getUrlForImageNumber(imageNumber))
            .removeClass("hidden");
    }

    hideImage()
    {
        this.$deck.addClass("hidden");
    }

    // Returns an imageNumber that's calculated based on the percentage of cards that remain in the deck.
    calculateImageNumber()
    {
        const { cardCount, maxCardCount, numImages } = this;

        if (cardCount === 0)
            return false;
        
        return Math.ceil(cardCount/maxCardCount * numImages);
    }

    getUrlForImageNumber(imgNumber)
    {
        const { imageUrlWithoutNumber } = this,
            fileExtensionIdx = imageUrlWithoutNumber.lastIndexOf("."),
            fileExtension = imageUrlWithoutNumber.substring(fileExtensionIdx);

        return imageUrlWithoutNumber.substring(0, fileExtensionIdx) + imgNumber + fileExtension;
    }

    // Increases the apparent stack size of the deck by incrementing the imageNumber by 1.
    // Unhides the image if it's hidden.
    increasePileSize()
    {
        const { imageNumber, numImages } = this;
        
        let imgNumber = imageNumber;

        if (imgNumber === false)
            return this.setImage(1);
            
        if (imgNumber !== numImages)
            imgNumber++;
        
        this.setImage(imgNumber);
    }

    getProperties()
    {
        const { $deck } = this,
            deckIsHidden = $deck.hasClass("hidden");
        
        if (deckIsHidden)
            $deck.removeClass("hidden").removeAttr("style");
        
        const deckProperties = $deck.offset();
        deckProperties.width = $deck.width() * 0.94;
        
        if (deckIsHidden)
            this.hideImage();

        return deckProperties;
    }

    playWarningAnimation()
    {
        const { cardCount, $deck } = this,
            warningLevel = getWarningLevelFromCardCount(cardCount);

        if (warningLevel === this.warningLevel)
            return false;
        
        const $elementToAnimate = cardCount > 0 ? $deck : $deck.prev().add($deck.parent());
        
        this.warningLevel = warningLevel;

        if (warningLevel === "none")
            return false;

        warningGlowAnimation($elementToAnimate, warningLevel, warningLevels[warningLevel].animationInterval,
            () => this.warningLevel === warningLevel);
    }
}

const warningLevels = {
    none: { lowerThreshold: 10 },
    mild: { lowerThreshold: 7, animationInterval: 1000 },
    moderate: { lowerThreshold: 3, animationInterval: 500 },
    critical: { lowerThreshold: 0, animationInterval: 250 }
}

function getWarningLevelFromCardCount(cardCount)
{
    for (let warningLevel in warningLevels)
        if (cardCount >= warningLevels[warningLevel].lowerThreshold)
            return warningLevel;
}