<?php
try
{
	session_start();
	
	if (!isset($_SESSION["game"]))
		throw new Exception("game not found.");

	if (!isset($_POST["role"]))
		throw new Exception("required values not set.");
			
	$game = $_SESSION["game"];
	$role = $_POST["role"];
	
	$CURRENT_STEP = "infect cities";
	$NEXT_STEP = "action 1";
	$EVENT_CODE = "ic";
	$CUBES_TO_ADD = 1;

	require "../connect.php";
	include "../utilities.php";
	
	$turnNum = getTurnNumber($mysqli, $game);

	// One Quiet Night event card: "Skip the next Infect Cities step (do not flip over any Infection cards)."
	// If the event card was played this turn and Infect Cities is attempted, something went wrong.
	if (oneQuietNightScheduledThisTurn($mysqli, $game))
		throw new Exception("Infect Cities step not skipped for One Quiet Night.");

	// Get the infection rate (the number of cities to infect),
	// and confirm the current step.
	$infRate = $mysqli->query("SELECT infRate
								FROM vw_gamestate
								WHERE game = $game
								AND stepName = '$CURRENT_STEP'")->fetch_assoc()["infRate"];
	
	if (!$infRate)
		throw new Exception("Failed to infect city: wrong step.");
	
	$numInfected = $mysqli->query("SELECT COUNT(*) AS 'numInfected'
									FROM vw_event
									WHERE game = $game
									AND turnNum = $turnNum
									AND eventType = '$EVENT_CODE'")->fetch_assoc()["numInfected"];
	
	if ($numInfected == $infRate)
		throw new Exception("Infection step already finished.");
		
	$mysqli->autocommit(FALSE);
	
	// Get the top card from the infection deck	
	$card = $mysqli->query("SELECT cardKey, color
							FROM vw_infectioncard
							WHERE game = $game
							AND pile = 'deck'
							AND cardIndex =	(SELECT MAX(cardIndex)
											FROM vw_infectioncard
											WHERE game = $game
											AND pile = 'deck')")->fetch_assoc();
	
	$key = $card["cardKey"];
	$diseaseColor = $card["color"];
	
	if (is_null($key))
		throw new Exception("Failed to draw infection card.");

	discardInfectionCards($mysqli, $game, $key);

	$infectionPrevention = checkInfectionPrevention($mysqli, $game, $key, $diseaseColor);
	
	$eventDetails = "$key,$infectionPrevention";
	$response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $eventDetails);

	if ($infectionPrevention == "0")
	{
		$infectionResult = addCubesToCity($mysqli, $game, $key, $diseaseColor, $CUBES_TO_ADD);

		if (isset($infectionResult["outbreakEvents"]))
			$response["events"] = array_merge($response["events"], $infectionResult["outbreakEvents"]);
		
		// Adding disease cubes to the board can cause the game to end in defeat.
		if (getGameEndCause($mysqli, $game) === "cubes")
			$response["gameEndCause"] = "cubes";
	}
	
	if (!isset($response["gameEndCause"]) && ++$numInfected == $infRate)
		$response["nextStep"] = updateStep($mysqli, $game, $CURRENT_STEP, $NEXT_STEP, $role);
}
catch(Exception $e)
{
	$response["failure"] = $e->getMessage();
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