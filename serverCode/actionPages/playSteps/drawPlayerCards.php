<?php
	try
	{
		session_start();
		
		if (!isset($_SESSION["game"]))
			throw new Exception("game not found");
		
		require "../../connect.php";
		require "../../utilities.php";

		$data = json_decode(file_get_contents("php://input"), true);

		if (!isset($data["role"]))
			throw new Exception("role not set");
		
		$game = $_SESSION["game"];
		$role = $data["role"];

		$CURRENT_STEP = "draw";
		$EVENT_TYPE = "cd";
		$NUM_CARDS_TO_DRAW = 2;
		
		$stmt = $pdo->prepare("SELECT cardKey AS `key`, cardIndex
								FROM vw_playerCard
								WHERE game = ?
								AND pile = 'deck'
								ORDER BY cardIndex DESC
								LIMIT $NUM_CARDS_TO_DRAW");
		$stmt->execute([$game]);
		$cards = $stmt->fetchAll();
		
		$pdo->beginTransaction();
		
		if (count($cards) < $NUM_CARDS_TO_DRAW)
		{
			$gameEndCause = "cards";
			recordGameEndCause($pdo, $game, $gameEndCause);
			$response["gameEndCause"] = $gameEndCause;
		}
		
		$cardKeys = array();
		$epidemicKeys = array();
		foreach ($cards as $row)
		{
			$key = $row["key"];
			$cardsLeftInDeck = $row["cardIndex"];
			
			if (substr($key, 0, 3) === "epi")
				array_push($epidemicKeys, $key);
			else
				array_unshift($cardKeys, $key);
		}

		$eventDetails = join(",", array_merge($epidemicKeys, $cardKeys));
		$response["events"] = recordEvent($pdo, $game, $EVENT_TYPE, $eventDetails, $role);
		
		if (!isset($response["gameEndCause"]))
		{
			if (count($cardKeys) > 0)
			{
				$cardType = "player";
				$currentPile = "deck";
				$newPile = $role;
				
				moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKeys);
			}
			
			if (count($epidemicKeys) > 0)
				$nextStep = "epIncrease";
			else if (roleHasTooManyCards($pdo, $game, $role))
				$nextStep = "discard";
			else
				$nextStep = "infect cities";
			
			$response["turnNum"] = getTurnNumber($pdo, $game);
			$response["nextStep"] = updateStep($pdo, $game, $CURRENT_STEP, $nextStep, $role);
			$response["numPlayerCardsRemaining"] = $cardsLeftInDeck;
		}
	}
	catch(PDOException $e)
    {
        $response["failure"] = "Failed to Draw 2 Cards: PDOException: " . $e->getMessage();
    }
	catch(Exception $e)
	{
		$response["failure"] = "Failed to Draw 2 Cards: " . $e->getMessage();
	}
	finally
    {
        if ($pdo->inTransaction())
        {
            if (isset($response["failure"]))
                $pdo->rollback();
            else
                $pdo->commit();
        }
        
        echo json_encode($response);
    }
?>