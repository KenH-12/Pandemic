"use strict";

import { newPlayerCard, getCityOrEventCardObject } from "./utilities/pandemicUtils.js";
import { bindCityLocatorClickEvents } from "./city.js";
import { bindEventCardHoverEvents } from "./eventCard.js";
import { eventTypes } from "./event.js";
import { gameData } from "./gameData.js";

export default class DiscardPrompt
{
	constructor({ eventTypeCode, buttonText, cardKeys, numDiscardsRequired, onConfirm })
	{
		this.eventTypeCode = eventTypeCode;
		this.cardKeys = cardKeys;
		this.numDiscardsRequired = numDiscardsRequired;
		this.onConfirm = onConfirm;

		this.$container = $(`<div class='discardPrompt'>
								<div class='cardsToKeep'>
									<p class='instructions'>Click a card to move it from "Keep" to "Discard" or vice versa.</p>
									<p>Keep:<span></span></p>
								</div>
								<div class='discardSelections'>
									<p>Discard:<span></span></p>
								</div>
								<div class='btnConfirm button btnDisabled'>${buttonText}</div>
							</div>`);
		
		this.$keepersContainer = this.$container.children(".cardsToKeep");
		this.$discardsContainer = this.$container.children(".discardSelections");
		this.$btnConfirm = this.$container.children(".btnConfirm");

		if (cardKeys.length === numDiscardsRequired)
		{
			for (let key of cardKeys)
                this.$discardsContainer.append(newPlayerCard(getCityOrEventCardObject(key), { noTooltip: true }));
            
            bindCityLocatorClickEvents({ $containingElement: this.$discardsContainer });

			this.keeperCount = 0;
			this.discardSelectionCount = cardKeys.length;
			
			this.$keepersContainer.addClass("hidden");

			this.bindConfirmClick();
		}
		else
		{
			for (let key of cardKeys)
				this.$keepersContainer.append(newPlayerCard(getCityOrEventCardObject(key), { noTooltip: true }));

			this.discardSelectionCount = 0;
			this.keeperCount = cardKeys.length;

			const self = this;
			this.getKeeperCardElements().click(function() { self.toggleDiscardSelection($(this)) });
		}

		this.updateCountIndicators();
		bindEventCardHoverEvents(this.$container);

		return this.$container;
	}

	requirementsMet()
	{
		return this.discardSelectionCount === this.numDiscardsRequired;
	}

	getKeeperCardElements()
	{
		return this.$keepersContainer.children(".playerCard");
	}

	getDiscardSelectionElements()
	{
		return this.$discardsContainer.children(".playerCard");
	}

	getDiscardSelectionKeys()
	{
		const discardKeys = [];

		this.getDiscardSelectionElements()
			.each(function() { discardKeys.push($(this).data("key")) });

		return discardKeys;
	}
	
	toggleDiscardSelection($card)
	{
		if ($card.parent().is(this.$keepersContainer))
			this.moveToDiscardSelections($card)
		else
			this.moveToKeepers($card);
	
		if (this.requirementsMet())
			this.bindConfirmClick();
		else
			this.$btnConfirm.off("click").addClass("btnDisabled");
	}

	moveToDiscardSelections($card)
	{
		$card.appendTo(this.$discardsContainer);

		this.keeperCount--;
		this.discardSelectionCount++;

		this.updateCountIndicators();
	}

	moveToKeepers($card)
	{
		$card.appendTo(this.$keepersContainer);

		this.discardSelectionCount--;
		this.keeperCount++;

		this.updateCountIndicators();
	}
	
	updateCountIndicators()
	{
		const textColor = this.requirementsMet() ? "#0bad0b" : "red";
		
		// Show the keeper count for a plain old discard event to emphasize the hand limit.
		if (this.eventTypeCode === eventTypes.discard.code)
		{
			this.$keepersContainer.find("span")
				.html(`${this.keeperCount} / ${gameData.HAND_LIMIT} `)
				.css("color", textColor);
		}
			
		this.$discardsContainer.find("span")
			.html(`${this.discardSelectionCount} / ${this.numDiscardsRequired}`)
			.css("color", textColor);
	}

	bindConfirmClick()
	{
		const $btn = this.$btnConfirm,
			self = this;
		
		$btn.off("click")
			.click(function()
			{
				$btn.addClass("btnDisabled")
					.html("CONFIRMING...")
					.add(self.getDiscardSelectionElements())
					.add(self.getKeeperCardElements())
					.off("click");

				self.onConfirm(self.getDiscardSelectionKeys(), $btn);
			})
			.removeClass("btnDisabled");
		
		oscillateButtonBackgroundColor($btn);
	}
}

export function removeDiscardPrompt()
{
	const $discardStepContainer = $("#discardStepContainer");
	
	$discardStepContainer.find(".btnConfirm").off("click")
		.siblings(".loadingGif").remove();

	$discardStepContainer.slideUp(function()
	{
		$discardStepContainer.children(".discardPrompt").remove();
	});
}