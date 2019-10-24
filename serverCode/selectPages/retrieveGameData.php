<?php
	session_start();
	try
	{
		if (!isset($_SESSION["game"]))
			throw new Exception("Game does not exist.");
		
		$game = $_SESSION["game"];
		
		require "../connect.php";
		include "../utilities.php";
		
		$gameIsResuming = false;
		$gamestate = $mysqli->query("SELECT turn,
											turnNum,
											stepName,
											infRate AS 'infectionRate',
											numEpidemics,
											epidemicCount,
											outbreakCount
									FROM vw_gameState
									WHERE game = $game");
		
		$response = array();
		if ($gamestate->num_rows == 0)
			throw new Exception("Failed to initiate game.");

		if ($row = mysqli_fetch_assoc($gamestate))
		{
			$response["gamestate"] = $row;
			// If at least one recorded event other than Initial Infections ('ii') and Starting Hands ('sh')
			// the game is being resumed.
			// Otherwise the game will be started from scratch.
			$gameIsResuming = $mysqli->query("SELECT COUNT(*) AS 'numActions'
											FROM vw_event
											WHERE game = $game
											AND eventType NOT IN ('sh', 'ii')")->fetch_assoc()["numActions"] > 0;
			
			$response["gamestate"]["gameIsResuming"] = $gameIsResuming;
		}
		
		if ($gameIsResuming)
		{
			$cities = $mysqli->query("SELECT	locationKey,
												yCubes,
												rCubes,
												uCubes,
												bCubes,
												researchStation
									FROM vw_location
									WHERE game = $game
									AND	(researchStation = 1
										OR yCubes > 0
										OR rCubes > 0
										OR uCubes > 0
										OR bCubes > 0)");
			
			$response["cities"] = array();
			while ($row = mysqli_fetch_assoc($cities))
			{
				$response["cities"][] = $row;
			}

			$infectionDiscards = $mysqli->query("SELECT cardKey as `key`, pile
												FROM vw_infectionCard
												WHERE game = $game
												AND pile IN ('discard', 'removed')
												ORDER BY cardIndex DESC");
			
			$response["infectionDiscards"] = array();
			while ($row = mysqli_fetch_assoc($infectionDiscards))
			{
				$response["infectionDiscards"][] = $row;
			}

			$response["diseaseStatuses"]
				= $mysqli->query("SELECT yStatus AS 'y',
										rStatus AS 'r',
										uStatus AS 'u',
										bStatus AS 'b'
									FROM vw_disease
									WHERE game = $game")->fetch_assoc();
		}
		else // beginning new game
		{
			// get all roles for role determination slot machines.
			$allRoles = $mysqli->query("SELECT roleName FROM role");
			
			while ($row = mysqli_fetch_assoc($allRoles))
				$response["allRoles"][] = $row["roleName"];
		}
		
		$players = $mysqli->query("SELECT	uID,
											pID,
											rID,
											name,
											role,
											roleCardText,
											nextID AS 'nextTurnID',
											location AS 'cityKey'
									FROM vw_player
									WHERE game = $game");
		
		$response["players"] = array();
		while ($row = mysqli_fetch_assoc($players))
		{
			$response["players"][] = $row;
		}
		
		$startingHands = $mysqli->query("SELECT role, details AS 'cardKeys'
										FROM vw_event
										WHERE game = $game
										AND eventType = 'sh'");

		while ($row = mysqli_fetch_assoc($startingHands))
		{
			$role = $row["role"];
			$cardKeys = explode(",", $row["cardKeys"]);

			for ($i = 0; $i < count($cardKeys); $i++)
			{
				$cityKey = $cardKeys[$i];
				$population = $mysqli->query("SELECT population FROM city WHERE cityKey = '$cityKey'")->fetch_assoc()["population"];
				
				$response["startingHandPopulations"][] = array("role" => $role,
																"cardKey" => $cityKey,
																"population" => $population);
			}
		}
	}
	catch(Exception $e)
	{
		$response["failure"] = $e->getMessage();
	}
	finally
	{
		$mysqli->close();
	}
	
	echo json_encode($response);
?>