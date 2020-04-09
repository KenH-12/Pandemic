"use strict";

class Deck
{
    constructor($deck, imageUrlWithoutNumber, numImages, totalCards, numCardsRemaining)
    {
        this.$deck = $deck;
        this.imageUrlWithoutNumber = imageUrlWithoutNumber;
        this.numImages = numImages;
        this.totalCards = totalCards;
        this.numCardsRemaining = numCardsRemaining || totalCards;
    }

    addCards(numToAdd)
    {
        this.setNumCardsRemaining(this.numCardsRemaining + parseInt(numToAdd));
    }
    
    removeCards(numToRemove)
    {
        this.setNumCardsRemaining(this.numCardsRemaining - numToRemove);
    }

    setNumCardsRemaining(numCardsRemaining)
    {
        this.numCardsRemaining = numCardsRemaining;
        this.setImage();
    }

    setImage()
    {
        const imgNumber = this.getImageNumber(),
            { $deck, getImageUrl } = this;

        if (imgNumber === false)
        {
            $deck.addClass("hidden");
            return false;
        }
        
        $deck.attr("src", getImageUrl(imgNumber));
    }

    getImageNumber()
    {
        const { numCardsRemaining, totalCards } = this;

        if (numCardsRemaining === 0)
            return false;
        
        return Math.ceil(numCardsRemaining/totalCards * this.numImages);
    }

    getImageUrl(imgNumber)
    {
        const { imageUrlWithoutNumber } = this,
            fileExtensionIdx = imageUrlWithoutNumber.lastIndexOf("."),
            fileExtension = imageUrlWithoutNumber.substring(fileExtensionIdx);

        return imageUrlWithoutNumber.substring(0, fileExtensionIdx) + imgNumber + fileExtension;
    }
}