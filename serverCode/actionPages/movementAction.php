<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
		if (isset($_POST["role"])
			&& isset($_POST["currentStep"])
			&& isset($_POST["actionCode"])
			&& isset($_POST["originKey"])
			&& isset($_POST["destinationKey"]))
		{
			$game = $_SESSION["game"];
			$role = $_POST["role"];
			$currentStep = $_POST["currentStep"];
			$actionCode = $_POST["actionCode"];
			$originKey = $_POST["originKey"];
			$destinationKey = $_POST["destinationKey"];
			
			$response = array();
			
			try
			{
				require "../connect.php";
				include "../utilities.php";
				
				$mysqli->autocommit(FALSE);
				
				// The Dispatcher can move another player's pawn as if it were his own.
				// In such cases, $activeRole will be the Dispatcher, and $role will be the dispatched role.
				$activeRole = getActiveRole($mysqli, $game);
				$isDispatchEvent = false;
				if ($role != $activeRole)
				{
					if (getRoleName($mysqli, $activeRole) === "Dispatcher")
						$isDispatchEvent = true;
					else
						throw new Exception("Dispatch failed: invalid role");
				}
				
				// Drive/Ferry allows the player to move to a city that's
				// connected to their current city by a white line.
				if ($actionCode === "dr" && !citiesAreConnected($mysqli, $originKey, $destinationKey))
					throw new Exception("Invalid Drive/Ferry: the current city is not connected by a white line to the destination");
				
				// Shuttle Flights require there to be a research station at both the current location and the destination.
				// Operations Flights require a research station at the current location.
				if ($actionCode === "sf" || $actionCode === "of")
				{
					if (!cityHasResearchStation($mysqli, $game, $originKey))
						throw new Exception("Invalid movement: the movement type requires the origin city to have a research station.");
					
					if ($actionCode === "sf" && !cityHasResearchStation($mysqli, $game, $destinationKey))
						throw new Exception("Invalid Shuttle Flight: the destination city must have a research station.");
				}
				
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
						if (!isset($_POST["discardKey"]))
							throw new Exception("Invalid Operations Flight: discard not specified.");
						
						$cardKey = $_POST["discardKey"];
						validateOperationsFlight($mysqli, $game, $role, $cardKey);
					}
					
					// Whether a normal movement action or a dispatch event, the active role is the discarder.
					discardPlayerCards($mysqli, $game, $activeRole, $cardKey);
				}

				// One of the Dispatcher's special abilities, informally referred to as "rendezvous" ("rv"),
				// allows them to move any pawn to a city containing another pawn.
				if ($actionCode === "rv")
				{
					validateDispatcherRendezvous($mysqli, $game, $role, $destinationKey);
					$isDispatchEvent = true;
				}

				updateRoleLocation($mysqli, $game, $role, $originKey, $destinationKey);
				
				if (getRoleName($mysqli, $role) === "Medic")
				{
					$autoTreatEvents = getAutoTreatDiseaseEvents($mysqli, $game, $destinationKey);

					if ($autoTreatEvents)
						$response["events"] = $autoTreatEvents;
				}
				
				$response["nextStep"] = nextStep($mysqli, $game, $currentStep, $activeRole);
				
				$eventDetails = "$originKey,$destinationKey";

				if ($isDispatchEvent) // Dispatch event details include the dispatched $role and the $actionCode as the movement type.
				{
					$eventDetails = "$role,$eventDetails,$actionCode";
					$actionCode = "dp";
				}
				else if ($actionCode === "of") // Operatons Flight's discard is uninferable
					$eventDetails .= ",$cardKey";
				
				$response["events"][] = recordEvent($mysqli, $game, $actionCode, $eventDetails, $activeRole);
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
		}
		else
			$response["failure"] = "required value(s) not set";
	}
	else
		$response["failure"] = "game not found";
	
	echo json_encode($response);
?>