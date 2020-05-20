<?php
	try
	{
		session_start();
	
		if (!isset($_SESSION["game"]))
			throw new Exception("game not found");
		
		$rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
		require "$rootDir/Pandemic/serverCode/connect.php";
		require "$rootDir/Pandemic/serverCode/utilities.php";

		$details = json_decode(file_get_contents("php://input"), true);

		if (!isset($details["role"]))
			throw new Exception("game not found");
		
		if (!isset($details["currentStep"]))
			throw new Exception("game not found");
		
		if (!isset($details["actionCode"]))
			throw new Exception("game not found");
		
		if (!isset($details["originKey"]))
			throw new Exception("game not found");
		
		if (!isset($details["destinationKey"]))
			throw new Exception("game not found");
		
		$game = $_SESSION["game"];
		$role = $details["role"];
		$currentStep = $details["currentStep"];
		$actionCode = $details["actionCode"];
		$originKey = $details["originKey"];
		$destinationKey = $details["destinationKey"];
		
		// The Dispatcher can move another player's pawn as if it were his own.
		// In such cases, $activeRole will be the Dispatcher, and $role will be the dispatched role.
		$activeRole = getActiveRole($pdo, $game);
		$isDispatchEvent = false;
		if ($role != $activeRole)
		{
			if (getRoleName($pdo, $activeRole) === "Dispatcher")
				$isDispatchEvent = true;
			else
				throw new Exception("Dispatch failed: invalid role");
		}
		
		// Drive/Ferry allows the player to move to a city that's
		// connected to their current city by a white line.
		if ($actionCode === "dr" && !citiesAreConnected($pdo, $originKey, $destinationKey))
			throw new Exception("Invalid Drive/Ferry: the current city is not connected by a white line to the destination");
		
		// Shuttle Flights require there to be a research station at both the current location and the destination.
		// Operations Flights require a research station at the current location.
		if ($actionCode === "sf" || $actionCode === "of")
		{
			if (!cityHasResearchStation($pdo, $game, $originKey))
				throw new Exception("Invalid movement: the movement type requires the origin city to have a research station.");
			
			if ($actionCode === "sf" && !cityHasResearchStation($pdo, $game, $destinationKey))
				throw new Exception("Invalid Shuttle Flight: the destination city must have a research station.");
		}

		$pdo->beginTransaction();
		
		// A few movement types require the player to discard a city card:
		$typesRequiringDiscard = array("df", "cf", "of");
		if (in_array($actionCode, $typesRequiringDiscard))
		{
			if ($actionCode === "df") // Direct Flights require the player to discard the card that matches the destination
				$cardKey = $destinationKey;
			else if ($actionCode === "cf") // Charter Flights require the player to discard the card that matches their current location
				$cardKey = $originKey;
			else if ($actionCode === "of") // Operations Flights have a number of requirements...
			{
				// The player must specify and discard any city card.
				if (!isset($details["discardKey"]))
					throw new Exception("Invalid Operations Flight: discard not specified.");
				
				$cardKey = $details["discardKey"];
				validateOperationsFlight($pdo, $game, $role, $cardKey);
			}
			
			// Whether a normal movement action or a dispatch event, the active role is the discarder.
			discardPlayerCards($pdo, $game, $activeRole, $cardKey);
		}

		$eventDetails = "$originKey,$destinationKey";

		// One of the Dispatcher's special abilities, informally referred to as "rendezvous" ("rv"),
		// allows them to move any pawn to a city containing another pawn.
		if ($actionCode === "rv")
		{
			$rolesAtDestination = getRolesAtRendezvousDestination($pdo, $game, $role, $destinationKey);
			$isDispatchEvent = true;

			$eventDetails = "$role,$eventDetails,$actionCode";

			if ($actionCode === "rv")
				$eventDetails .= "," . implode("", $rolesAtDestination);
			
			$actionCode = "dp";
		}
		else if ($actionCode === "of") // Operatons Flight's discard is uninferable
			$eventDetails .= ",$cardKey";
		
		updateRoleLocation($pdo, $game, $role, $originKey, $destinationKey);
		
		$response["nextStep"] = nextStep($pdo, $game, $currentStep, $activeRole);
		
		$response["events"][] = recordEvent($pdo, $game, $actionCode, $eventDetails, $activeRole);

		if (getRoleName($pdo, $role) === "Medic")
		{
			$autoTreatEvents = getAutoTreatDiseaseEvents($pdo, $game, $destinationKey);

			if ($autoTreatEvents)
				$response["events"] = array_merge($response["events"], $autoTreatEvents);
		}
	}
	catch(PDOException $e)
	{
		$response["failure"] = "Movement action failed: PDOException: " . $e->getMessage();
	}
	catch(Exception $e)
	{
		$response["failure"] = "Movement action failed: " . $e->getMessage();
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