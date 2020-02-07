<?php
	try
	{
		session_start();
		require "../connect.php";
		include "../utilities.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("game not found");
	
		if (!isset($_POST["role"]))
			throw new Exception("required value(s) not set");
		
		$game = $_SESSION["game"];
		$role = $_POST["role"];

		$CURRENT_STEP = "draw";
		$EVENT_TYPE = "cd";
		$NUM_CARDS_TO_DRAW = 2;
		
		$cards = $mysqli->query("SELECT cardKey AS `key`, cardIndex
								FROM vw_playerCard
								WHERE game = $game
								AND pile = 'deck'
								ORDER BY cardIndex DESC
								LIMIT $NUM_CARDS_TO_DRAW");
		
		$mysqli->autocommit(FALSE);
		
		if ($cards->num_rows < $NUM_CARDS_TO_DRAW)
		{
			$gameEndCause = "cards";
			recordGameEndCause($mysqli, $game, $gameEndCause);
			$response["gameEndCause"] = $gameEndCause;
		}
		
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

		$actionDetails = join(",", array_merge($epidemicKeys, $cardKeys));
		$response["events"] = recordEvent($mysqli, $game, $EVENT_TYPE, $actionDetails, $role);

		if (!isset($response["gameEndCause"]))
		{
			$numEpidemics = count($epidemicKeys);
			$numCards = count($cardKeys);
	
			if ($numCards > 0)
			{
				$cardType = "player";
				$currentPile = "deck";
				$newPile = $role;
				
				moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeys);
			}
			
			if ($numEpidemics > 0)
				$nextStep = "epIncrease";
			else if (roleHasTooManyCards($mysqli, $game, $role))
				$nextStep = "discard";
			else
				$nextStep = "infect cities";
			
			$response["turnNum"] = getTurnNumber($mysqli, $game);
			$response["nextStep"] = updateStep($mysqli, $game, $CURRENT_STEP, $nextStep, $role);
			$response["numPlayerCardsRemaining"] = $cardsLeftInDeck;
		}
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

		echo json_encode($response);
	}
?>