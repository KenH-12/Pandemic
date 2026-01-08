<?php
	try
	{
		session_start();
		
		if (!isset($_SESSION["game"]))
			throw new Exception("game not found.");
		
		require "../../connect.php";
		require "../../utilities.php";

		$data = json_decode(file_get_contents("php://input"), true);

		if (!isset($data["role"]))
			throw new Exception("required values not set.");
				
		$game = $_SESSION["game"];
		$role = $data["role"];
		
		$CURRENT_STEP = "infect cities";
		$NEXT_STEP = "action 1";
		$EVENT_CODE = "ic";
		$CUBES_TO_ADD = 1;
		
		$turnNum = getTurnNumber($pdo, $game);

		// One Quiet Night event card: "Skip the next Infect Cities step (do not flip over any Infection cards)."
		// If the event card was played this turn and Infect Cities is attempted, something went wrong.
		if (oneQuietNightScheduledThisTurn($pdo, $game))
			throw new Exception("Infect Cities step not skipped for One Quiet Night.");

		// Get the infection rate (the number of cities to infect),
		// and confirm the current step.
		$stmt = $pdo->prepare("SELECT infRate
								FROM vw_gamestate
								WHERE game = ?
								AND stepName = ?");
		$stmt->execute([$game, $CURRENT_STEP]);
		
		if ($stmt->rowCount() === 0)
			throw new Exception("Failed to infect city: wrong step.");

		$infRate = $stmt->fetch()["infRate"];
		
		$stmt = $pdo->prepare("SELECT COUNT(*) AS 'numInfected'
								FROM vw_event
								WHERE game = ?
								AND turnNum = ?
								AND eventType = ?");
		$stmt->execute([$game, $turnNum, $EVENT_CODE]);
		$numInfected = $stmt->fetch()["numInfected"];
		
		if ($numInfected == $infRate)
			throw new Exception("Infection step already finished.");
			
		$pdo->beginTransaction();
		
		// Get the top card from the infection deck
		$stmt = $pdo->prepare("SELECT cardKey, color
								FROM vw_infectioncard
								WHERE game = ?
								AND pile = 'deck'
								ORDER BY cardIndex DESC
								LIMIT 1");
		$stmt->execute([$game]);

		if ($stmt->rowCount() === 0)
			throw new Exception("Failed to draw infection card.");

		$card = $stmt->fetch();
		
		$key = $card["cardKey"];
		$diseaseColor = $card["color"];

		discardInfectionCards($pdo, $game, $key);

		$infectionPrevention = checkInfectionPrevention($pdo, $game, $key, $diseaseColor);
		
		$eventDetails = "$key,$infectionPrevention";
		$response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails);

		if ($infectionPrevention == "0")
		{
			$infectionResult = addCubesToCity($pdo, $game, $key, $diseaseColor, $CUBES_TO_ADD);

			if (isset($infectionResult["outbreakEvents"]))
				$response["events"] = array_merge($response["events"], $infectionResult["outbreakEvents"]);
			
			// Adding disease cubes to the board can cause the game to end in defeat.
			if (getGameEndCause($pdo, $game) === "cubes")
				$response["gameEndCause"] = "cubes";
		}
		
		if (!isset($response["gameEndCause"]) && ++$numInfected == $infRate)
			$response["nextStep"] = updateStep($pdo, $game, $CURRENT_STEP, $NEXT_STEP, $role);
	}
	catch(PDOException $e)
	{
		$response["failure"] = "Failed to infect city: PDOException: " . $e->getMessage();
	}
	catch(Exception $e)
	{
		$response["failure"] = "Failed to infect city: " . $e->getMessage();
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