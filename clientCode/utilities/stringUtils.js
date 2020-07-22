"use strict";

// Useful for extracting numbers from the beginning of css property values such as border or padding.
function getLeadingNumber(string)
{
	let numberString = "";
	
	for (let char of string)
	{
		if (isNaN(char))
			break;
		
		numberString += char;
	}
	
	return Number(numberString);
}

function beginsWithLetter(string)
{
	return /^[a-zA-Z]/.test(string);
}

function isAlphanumeric(string)
{
	return /^\w*$/.test(string);
}

function containsCapitalLetter(string)
{
	return /[A-Z]/.test(string);
}

function containsNumber(string)
{
	return /\d/.test(string);
}

function containsWhitespace(string)
{
	return /\s/.test(string);
}

function removeWhitespace(string)
{
	return string.replace(/ /g,"");
}

// Capitalizes the first character of every word in the string, and returns the new string.
function capitalizeWords(string)
{
	let capitalizedString = string[0].toUpperCase(),
		c;
	for (let i = 1; i < string.length; i++)
	{
		c = string[i];
		
		capitalizedString += c;
		
		if (c === " ")
			capitalizedString += string[++i].toUpperCase();
	}
	return capitalizedString;
}

function toCamelCase(string)
{
	const pascalCaseString = toPascalCase(string);

	return pascalCaseString[0].toLowerCase() + pascalCaseString.substring(1);
}

function toPascalCase(string)
{
	return removeWhitespace(capitalizeWords(string));
}

function typeOutString($element, string, { trailingEllipsis })
{
	return new Promise(async resolve =>
	{
		if (trailingEllipsis)
			string += "    .    .    .";
		
		$element.html("");
		
		for (let char of string)
		{
			$element.html($element.html() + char);
			await sleep(25);
		}
		resolve();
	});
}

function numberWithCommas(x)
{
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getOuterHtml($element)
{
	return $("<div>").append($element.clone()).html();
}

function stripTagsThatMatchSelector(html, selector)
{
	const $elements = $(`<div>`).append(html);

	let $elementsToStrip = $elements.find(selector),
		$eToStrip,
		$parent;

	while ($elementsToStrip.length)
	{
		$eToStrip = $elementsToStrip.first();
		$parent = $eToStrip.parent();
		$parent.html($parent.html().replace(getOuterHtml($eToStrip), $eToStrip.text()));

		$elementsToStrip = $elements.find(selector);
	}

	return $elements.html();
}