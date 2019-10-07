<?php
	try
	{
		session_start();
		
		if (!isset($_SESSION["game"]))
			throw new Exception("game not found");
	
		if (!isset($_POST["role"]))
			throw new Exception("required value(s) not set");
		
		$game = $_SESSION["game"];
		$role = $_POST["role"];

		$CURRENT_STEP = 'draw';
		$HAND_LIMIT = 7;

		require "../connect.php";
		include "../utilities.php";
		
		$cards = $mysqli->query("SELECT cardKey AS `key`, cardIndex
								FROM vw_playerCard
								WHERE game = $game
								AND pile = 'deck'
								ORDER BY cardIndex DESC
								LIMIT 2");
		
		$cardKeys = array();
		$epidemicKeys = array();
		while ($row = mysqli_fetch_assoc($cards))
		{
			$key = $row["key"];
			$cardsLeftInDeck = $row["cardIndex"];
			
			if (substr($key, 0, 3) == "epi")
				array_push($epidemicKeys, $key);
			else
				array_unshift($cardKeys, $key);
		}
		
		$numEpidemics = count($epidemicKeys);
		$numCards = count($cardKeys);

		$actionDetails = join(",", array_merge($epidemicKeys, $cardKeys));

		$epidemicKeys = join(",", $epidemicKeys);
		$cardKeys = join(",", $cardKeys);
		
		$mysqli->autocommit(FALSE);

		if ($numCards > 0)
		{
			$cardType = "player";
			$currentPile = "deck";
			$newPile = $role;
			
			moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeys);
		}
		
		if ($numEpidemics > 0)
			$nextStep = "epIncrease";
		else if (getHandSize($mysqli, $game, $role) > $HAND_LIMIT)
			$nextStep = "discard";
		else
			$nextStep = "infect cities";
		
		$response["turnNum"] = getTurnNumber($mysqli, $game);
		$response["nextStep"] = updateStep($mysqli, $game, $CURRENT_STEP, $nextStep, $role);
		$response["numPlayerCardsRemaining"] = $cardsLeftInDeck;

		$response["events"] = recordEvent($mysqli, $game, "cd", $actionDetails, $role);
	}
	catch(Exception $e)
	{
		$response["failure"] = "Failed to draw Player Cards: " . $e->getMessage();
	}
	finally
	{
		if (isset($response["failure"]))
			$mysqli->rollback();
		else
			$mysqli->commit();
		
		$mysqli->close();
	}
	
	echo json_encode($response);
?>