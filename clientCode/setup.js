function retrieveGameData()
{
	log("retrieveGameData()");
	return new Promise((resolve, reject) => $.post("serverCode/selectPages/retrieveGameData.php",
	function(response)
	{
		log(response);
		const result = JSON.parse(response);
		
		if (result.failure)
			reject(result.failure);
		else
			resolve(result);
	}));
}

function retrievePlayerCards()
{
	log("retrievePlayerCards()");
	return new Promise((resolve, reject) =>
		$.post("serverCode/selectPages/retrievePlayerCards.php",
		function(response)
		{
			const cards = JSON.parse(response);
			
			if (cards.length)
				resolve(cards);
			else
				reject("failed to retrieve player cards");
		})
	);
}

function retrieveEventHistory()
{
	log("retrieveEventHistory()");
	return new Promise((resolve, reject) => 
		$.post("serverCode/selectPages/retrieveEventHistory.php",
		(response) =>
		{
			const events = JSON.parse(response);

			if (Array.isArray(events))
				resolve(events);
			else
				reject("Failed to retrieve event history.");
		})
	);
}